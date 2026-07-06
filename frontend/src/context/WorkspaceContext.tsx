import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  ROLE_WORKSPACE_DEFAULTS,
  createPlacedWidget,
  type PlacedWidget,
  type WorkspaceView,
} from '../config/widgetRegistry';
import type { DashboardRole } from '../config/navigation';
import { resolveDashboardRole } from '../config/navigation';
import { useAuth } from './AuthContext';

interface WorkspaceState {
  activeViewId: string;
  views: WorkspaceView[];
}

interface WorkspaceContextValue {
  views: WorkspaceView[];
  activeView: WorkspaceView;
  activeViewId: string;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  setActiveView: (id: string) => void;
  addView: (name: string) => void;
  renameView: (id: string, name: string) => void;
  removeView: (id: string) => void;
  addWidget: (widgetId: string) => void;
  removeWidget: (instanceId: string) => void;
  moveWidget: (fromIndex: number, toIndex: number) => void;
  resizeWidget: (instanceId: string, w: number, h?: number) => void;
  resetWorkspace: () => void;
  dashboardRole: DashboardRole;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function storageKey(userId: string | undefined, role: DashboardRole) {
  return `agroerp_workspace_${userId ?? 'anon'}_${role}`;
}

function cloneDefaults(role: DashboardRole): WorkspaceState {
  const views = ROLE_WORKSPACE_DEFAULTS[role] ?? ROLE_WORKSPACE_DEFAULTS.default;
  return {
    activeViewId: views[0]?.id ?? 'ws-main',
    views: JSON.parse(JSON.stringify(views)),
  };
}

function migrateLegacyLayout(userId: string | undefined, role: DashboardRole): WorkspaceState | null {
  try {
    const legacy = localStorage.getItem(`agroerp_dashboard_layout_${userId ?? 'anon'}`);
    if (!legacy) return null;
    const { order, hidden } = JSON.parse(legacy) as { order: string[]; hidden: string[] };
    if (!order?.length) return null;
    const widgets: PlacedWidget[] = [];
    for (const oldId of order) {
      if (hidden.includes(oldId)) continue;
      const mapped = oldId.startsWith('widget-') ? oldId : `widget-${oldId.replace('shortcuts-admin', 'links-admin').replace('shortcuts-field', 'links-agri').replace('shortcuts', 'links-default').replace('kpi-overview', 'kpi-overview').replace('links-', 'links-')}`;
      const w = createPlacedWidget(mapped === 'widget-kpi-overview' ? 'widget-kpi-overview' : mapped);
      if (w) widgets.push(w);
    }
    if (!widgets.length) return null;
    return { activeViewId: 'ws-main', views: [{ id: 'ws-main', name: 'Mi espacio', widgets }] };
  } catch {
    return null;
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const dashboardRole = useMemo(
    () => resolveDashboardRole(user?.roles ?? []),
    [user?.roles],
  );

  const [state, setState] = useState<WorkspaceState>(() => {
    try {
      const raw = localStorage.getItem(storageKey(userId, dashboardRole));
      if (raw) return JSON.parse(raw) as WorkspaceState;
    } catch { /* ignore */ }
    return migrateLegacyLayout(userId, dashboardRole) ?? cloneDefaults(dashboardRole);
  });

  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(userId, dashboardRole));
      if (raw) setState(JSON.parse(raw));
      else setState(migrateLegacyLayout(userId, dashboardRole) ?? cloneDefaults(dashboardRole));
    } catch {
      setState(cloneDefaults(dashboardRole));
    }
    setEditMode(false);
  }, [userId, dashboardRole]);

  useEffect(() => {
    localStorage.setItem(storageKey(userId, dashboardRole), JSON.stringify(state));
  }, [state, userId, dashboardRole]);

  const activeView = useMemo(
    () => state.views.find((v) => v.id === state.activeViewId) ?? state.views[0],
    [state],
  );

  const updateActiveView = useCallback((updater: (view: WorkspaceView) => WorkspaceView) => {
    setState((prev) => ({
      ...prev,
      views: prev.views.map((v) => (v.id === prev.activeViewId ? updater(v) : v)),
    }));
  }, []);

  const setActiveView = useCallback((id: string) => {
    setState((prev) => ({ ...prev, activeViewId: id }));
    setEditMode(false);
  }, []);

  const addView = useCallback((name: string) => {
    const id = `ws-${Date.now()}`;
    setState((prev) => ({
      activeViewId: id,
      views: [...prev.views, { id, name, widgets: [] }],
    }));
    setEditMode(true);
  }, []);

  const renameView = useCallback((id: string, name: string) => {
    setState((prev) => ({
      ...prev,
      views: prev.views.map((v) => (v.id === id ? { ...v, name } : v)),
    }));
  }, []);

  const removeView = useCallback((id: string) => {
    setState((prev) => {
      if (prev.views.length <= 1) return prev;
      const views = prev.views.filter((v) => v.id !== id);
      return {
        activeViewId: prev.activeViewId === id ? views[0].id : prev.activeViewId,
        views,
      };
    });
  }, []);

  const addWidget = useCallback((widgetId: string) => {
    const placed = createPlacedWidget(widgetId);
    if (!placed) return;
    updateActiveView((v) => ({ ...v, widgets: [...v.widgets, placed] }));
  }, [updateActiveView]);

  const removeWidget = useCallback((instanceId: string) => {
    updateActiveView((v) => ({
      ...v,
      widgets: v.widgets.filter((w) => w.instanceId !== instanceId),
    }));
  }, [updateActiveView]);

  const moveWidget = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    updateActiveView((v) => {
      const widgets = [...v.widgets];
      const [item] = widgets.splice(fromIndex, 1);
      widgets.splice(toIndex, 0, item);
      return { ...v, widgets };
    });
  }, [updateActiveView]);

  const resizeWidget = useCallback((instanceId: string, w: number, h?: number) => {
    updateActiveView((view) => ({
      ...view,
      widgets: view.widgets.map((item) =>
        item.instanceId === instanceId ? { ...item, w, ...(h !== undefined ? { h } : {}) } : item,
      ),
    }));
  }, [updateActiveView]);

  const resetWorkspace = useCallback(() => {
    setState(cloneDefaults(dashboardRole));
    setEditMode(false);
  }, [dashboardRole]);

  const value = useMemo(
    () => ({
      views: state.views,
      activeView,
      activeViewId: state.activeViewId,
      editMode,
      setEditMode,
      setActiveView,
      addView,
      renameView,
      removeView,
      addWidget,
      removeWidget,
      moveWidget,
      resizeWidget,
      resetWorkspace,
      dashboardRole,
    }),
    [
      state, activeView, editMode, setActiveView, addView, renameView, removeView,
      addWidget, removeWidget, moveWidget, resizeWidget, resetWorkspace, dashboardRole,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
