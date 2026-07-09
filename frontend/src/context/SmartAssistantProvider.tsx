import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useNavigation } from './NavigationContext';
import {
  computeSuggestions,
  getContextualSuggestions,
  type SmartSuggestion,
} from '../lib/suggestionEngine';
import {
  dismissSuggestion,
  loadAssistantPanelOpen,
  loadDismissedSuggestions,
  loadVisitedModules,
  recordModuleVisit,
  saveAssistantPanelOpen,
  type DismissedSuggestion,
} from '../lib/smartAssistant';
import { loadGridProductivity } from '../lib/gridProductivity';

interface SmartAssistantContextValue {
  suggestions: SmartSuggestion[];
  contextual: SmartSuggestion[];
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  dismiss: (id: string) => void;
  execute: (suggestion: SmartSuggestion) => void;
  refresh: () => void;
  badgeCount: number;
}

const SmartAssistantContext = createContext<SmartAssistantContextValue | null>(null);

export function SmartAssistantProvider({ children }: { children: ReactNode }) {
  const { user, hasPermission } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { navHistory } = useNavigation();
  const userId = user?.id;

  const [panelOpen, setPanelOpenState] = useState(() => loadAssistantPanelOpen(userId));
  const [dismissed, setDismissed] = useState<DismissedSuggestion[]>(() => loadDismissedSuggestions(userId));
  const [visitedModules, setVisitedModules] = useState(() => loadVisitedModules(userId));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    recordModuleVisit(userId, pathname);
    setVisitedModules(loadVisitedModules(userId));
    setDismissed(loadDismissedSuggestions(userId));
  }, [pathname, userId]);

  useEffect(() => {
    setDismissed(loadDismissedSuggestions(userId));
  }, [userId]);

  const dismissedIds = useMemo(() => new Set(dismissed.map((d) => d.id)), [dismissed]);

  const suggestions = useMemo(
    () =>
      computeSuggestions({
        userId,
        pathname,
        dismissedIds,
        visitedModules,
        hasPermission,
        navHistoryCount: navHistory.length,
      }),
    [userId, pathname, dismissedIds, visitedModules, hasPermission, navHistory.length, tick],
  );

  const contextual = useMemo(
    () => getContextualSuggestions(suggestions, pathname, 2),
    [suggestions, pathname],
  );

  const setPanelOpen = useCallback(
    (open: boolean) => {
      setPanelOpenState(open);
      saveAssistantPanelOpen(userId, open);
    },
    [userId],
  );

  const togglePanel = useCallback(() => {
    setPanelOpenState((prev) => {
      const next = !prev;
      saveAssistantPanelOpen(userId, next);
      return next;
    });
  }, [userId]);

  const dismiss = useCallback(
    (id: string) => {
      setDismissed(dismissSuggestion(userId, id));
    },
    [userId],
  );

  const execute = useCallback(
    (suggestion: SmartSuggestion) => {
      if (suggestion.kind === 'command') {
        window.dispatchEvent(new CustomEvent('agroerp:command-palette', { detail: { mode: 'commands' } }));
        setPanelOpen(false);
        return;
      }
      if (suggestion.id.startsWith('filter-')) {
        const match = suggestion.id.match(/^filter-([^-]+)-(.+)$/);
        if (match) {
          const [, gridId, presetId] = match;
          const preset = loadGridProductivity(userId, gridId).serverFilterPresets.find((p) => p.id === presetId);
          if (preset?.state) {
            sessionStorage.setItem(`agroerp_cmd_filter_${gridId}`, JSON.stringify(preset.state));
          }
        }
      }
      navigate(suggestion.to);
      setPanelOpen(false);
    },
    [navigate, setPanelOpen, userId],
  );

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const badgeCount = suggestions.filter((s) => s.priority >= 80).length;

  const value = useMemo(
    () => ({
      suggestions,
      contextual,
      panelOpen,
      setPanelOpen,
      togglePanel,
      dismiss,
      execute,
      refresh,
      badgeCount,
    }),
    [suggestions, contextual, panelOpen, setPanelOpen, togglePanel, dismiss, execute, refresh, badgeCount],
  );

  return (
    <SmartAssistantContext.Provider value={value}>{children}</SmartAssistantContext.Provider>
  );
}

export function useSmartAssistant() {
  const ctx = useContext(SmartAssistantContext);
  if (!ctx) throw new Error('useSmartAssistant requires SmartAssistantProvider');
  return ctx;
}

export function useSmartAssistantOptional() {
  return useContext(SmartAssistantContext);
}
