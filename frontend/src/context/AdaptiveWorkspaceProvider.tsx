import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useWorkspace } from './WorkspaceContext';
import { getQuickActionsForRole } from '../config/widgetRegistry';
import {
  computeAdaptiveProfile,
  reorderQuickActions,
  type AdaptiveProfile,
  type QuickActionLike,
} from '../lib/adaptiveLayoutEngine';
import {
  isSuggestionDismissed,
  loadAdaptivePreferences,
  saveAdaptivePreferences,
  updateAdaptivePreference,
  type AdaptivePreferences,
} from '../lib/adaptiveWorkspace';
import {
  loadModuleUsage,
  recordModuleUsage,
  recordQuickActionUse,
  recordRouteVisit,
  touchSession,
  type ModuleUsage,
  type SessionMetrics,
} from '../lib/usageAnalyzer';

interface AdaptiveWorkspaceContextValue {
  prefs: AdaptivePreferences;
  profile: AdaptiveProfile;
  adaptiveQuickActions: QuickActionLike[];
  focusMode: boolean;
  toggleFocusMode: () => void;
  setAdaptiveEnabled: (enabled: boolean) => void;
  applyWidgetOrderSuggestion: () => void;
  dismissWidgetSuggestion: () => void;
  dismissFocusSuggestion: () => void;
  acceptFocusSuggestion: () => void;
  recordQuickAction: (actionId: string) => void;
  showWidgetSuggestion: boolean;
  showFocusSuggestion: boolean;
  moduleUsage: ModuleUsage[];
  session: SessionMetrics;
}

const AdaptiveWorkspaceContext = createContext<AdaptiveWorkspaceContextValue | null>(null);

export function AdaptiveWorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, hasPermission } = useAuth();
  const { pathname } = useLocation();
  const userId = user?.id;
  const { activeView, dashboardRole, reorderActiveWidgets } = useWorkspace();

  const [prefs, setPrefs] = useState(() => loadAdaptivePreferences(userId));
  const [moduleUsage, setModuleUsage] = useState(() => loadModuleUsage(userId));
  const [session, setSession] = useState<SessionMetrics>(() => touchSession(userId, pathname));

  useEffect(() => {
    setPrefs(loadAdaptivePreferences(userId));
  }, [userId]);

  useEffect(() => {
    recordRouteVisit(userId, pathname);
    setModuleUsage(recordModuleUsage(userId, pathname));
    setSession(touchSession(userId, pathname));
  }, [pathname, userId]);

  useEffect(() => {
    const root = document.documentElement;
    if (prefs.focusMode) {
      root.setAttribute('data-focus-mode', 'true');
    } else {
      root.removeAttribute('data-focus-mode');
    }
    return () => root.removeAttribute('data-focus-mode');
  }, [prefs.focusMode]);

  const profile = useMemo(
    () =>
      computeAdaptiveProfile({
        userId,
        pathname,
        moduleUsage,
        session,
        focusMode: prefs.focusMode,
        adaptiveEnabled: prefs.adaptiveEnabled,
        currentWidgets: activeView.widgets,
      }),
    [userId, pathname, moduleUsage, session, prefs.focusMode, prefs.adaptiveEnabled, activeView.widgets],
  );

  const baseQuickActions = useMemo(
    () => getQuickActionsForRole(dashboardRole, hasPermission),
    [dashboardRole, hasPermission],
  );

  const adaptiveQuickActions = useMemo(
    () =>
      prefs.adaptiveEnabled
        ? reorderQuickActions(baseQuickActions, userId, moduleUsage)
        : baseQuickActions,
    [prefs.adaptiveEnabled, baseQuickActions, userId, moduleUsage],
  );

  const toggleFocusMode = useCallback(() => {
    setPrefs(updateAdaptivePreference(userId, 'focusMode', !prefs.focusMode));
  }, [userId, prefs.focusMode]);

  const setAdaptiveEnabled = useCallback(
    (enabled: boolean) => {
      setPrefs(updateAdaptivePreference(userId, 'adaptiveEnabled', enabled));
    },
    [userId],
  );

  const applyWidgetOrderSuggestion = useCallback(() => {
    if (!profile.widgetOrderSuggestion) return;
    reorderActiveWidgets(profile.widgetOrderSuggestion);
    setPrefs(
      saveAdaptivePreferences(userId, {
        ...prefs,
        dismissedWidgetSuggestionAt: new Date().toISOString(),
      }),
    );
  }, [profile.widgetOrderSuggestion, reorderActiveWidgets, userId, prefs]);

  const dismissWidgetSuggestion = useCallback(() => {
    setPrefs(
      saveAdaptivePreferences(userId, {
        ...prefs,
        dismissedWidgetSuggestionAt: new Date().toISOString(),
      }),
    );
  }, [userId, prefs]);

  const dismissFocusSuggestion = useCallback(() => {
    setPrefs(
      saveAdaptivePreferences(userId, {
        ...prefs,
        dismissedFocusSuggestionAt: new Date().toISOString(),
      }),
    );
  }, [userId, prefs]);

  const acceptFocusSuggestion = useCallback(() => {
    setPrefs(
      saveAdaptivePreferences(userId, {
        ...prefs,
        focusMode: true,
        dismissedFocusSuggestionAt: new Date().toISOString(),
      }),
    );
  }, [userId, prefs]);

  const recordQuickAction = useCallback(
    (actionId: string) => {
      recordQuickActionUse(userId, actionId);
      setModuleUsage(loadModuleUsage(userId));
    },
    [userId],
  );

  const showWidgetSuggestion =
    prefs.adaptiveEnabled &&
    Boolean(profile.widgetOrderSuggestion) &&
    !isSuggestionDismissed(prefs.dismissedWidgetSuggestionAt);

  const showFocusSuggestion =
    prefs.adaptiveEnabled &&
    profile.suggestFocusMode &&
    !prefs.focusMode &&
    !isSuggestionDismissed(prefs.dismissedFocusSuggestionAt);

  const value = useMemo(
    () => ({
      prefs,
      profile,
      adaptiveQuickActions,
      focusMode: prefs.focusMode,
      toggleFocusMode,
      setAdaptiveEnabled,
      applyWidgetOrderSuggestion,
      dismissWidgetSuggestion,
      dismissFocusSuggestion,
      acceptFocusSuggestion,
      recordQuickAction,
      showWidgetSuggestion,
      showFocusSuggestion,
      moduleUsage,
      session,
    }),
    [
      prefs,
      profile,
      adaptiveQuickActions,
      toggleFocusMode,
      setAdaptiveEnabled,
      applyWidgetOrderSuggestion,
      dismissWidgetSuggestion,
      dismissFocusSuggestion,
      acceptFocusSuggestion,
      recordQuickAction,
      showWidgetSuggestion,
      showFocusSuggestion,
      moduleUsage,
      session,
    ],
  );

  return (
    <AdaptiveWorkspaceContext.Provider value={value}>{children}</AdaptiveWorkspaceContext.Provider>
  );
}

export function useAdaptiveWorkspace() {
  const ctx = useContext(AdaptiveWorkspaceContext);
  if (!ctx) throw new Error('useAdaptiveWorkspace requires AdaptiveWorkspaceProvider');
  return ctx;
}

export function useAdaptiveWorkspaceOptional() {
  return useContext(AdaptiveWorkspaceContext);
}
