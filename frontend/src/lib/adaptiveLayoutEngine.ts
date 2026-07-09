/**
 * PM-07 — Motor de layout adaptativo basado en reglas (sin IA, sin backend).
 */

import type { PlacedWidget } from '../config/widgetRegistry';
import { loadRecentCommandIds } from './commandPalette';
import { loadPersonalTasks } from './guidedWorkspace';
import { loadWorkEntityHistory } from './workEntityHistory';
import {
  contextLabel,
  detectWorkContext,
  loadModuleUsage,
  loadQuickActionUsage,
  sessionDurationMs,
  type ModuleUsage,
  type SessionMetrics,
  type WorkContext,
} from './usageAnalyzer';

export type ChromeLevel = 'normal' | 'compact' | 'focus';
export type GuidedPanelTab = 'work' | 'lists' | 'notes';

export interface QuickActionLike {
  id: string;
  label: string;
  to: string;
  icon: string;
}

const CONTEXT_WIDGET_PRIORITY: Record<WorkContext, string[]> = {
  agricultural: [
    'widget-continue-work',
    'widget-quick-actions',
    'widget-links-agri',
    'widget-gis',
    'widget-kpi-overview',
    'widget-activity',
  ],
  capture: [
    'widget-quick-actions',
    'widget-continue-work',
    'widget-pending-work',
    'widget-activity',
    'widget-kpi-overview',
  ],
  operational: [
    'widget-pending-work',
    'widget-kpi-purchases',
    'widget-kpi-inventory',
    'widget-continue-work',
    'widget-calendar',
    'widget-tasks',
  ],
  administrative: [
    'widget-links-admin',
    'widget-team-activity',
    'widget-pending',
    'widget-notifications',
    'widget-activity',
  ],
  reports: [
    'widget-kpi-bi',
    'widget-reports',
    'widget-kpi-overview',
    'widget-activity',
  ],
  mixed: [
    'widget-quick-actions',
    'widget-continue-work',
    'widget-pending-work',
    'widget-kpi-overview',
    'widget-activity',
  ],
};

const ROUTE_TO_QUICK_ACTION: Array<{ prefix: string; actionId: string }> = [
  { prefix: '/productores', actionId: 'qa-producer' },
  { prefix: '/fincas', actionId: 'qa-farm' },
  { prefix: '/lotes', actionId: 'qa-lot' },
  { prefix: '/formularios', actionId: 'qa-my-forms' },
  { prefix: '/procesos', actionId: 'qa-inbox' },
  { prefix: '/compras', actionId: 'qa-purchase' },
  { prefix: '/administracion', actionId: 'qa-user' },
  { prefix: '/iam', actionId: 'qa-security' },
  { prefix: '/inventario', actionId: 'qa-product' },
];

const LONG_SESSION_MS = 45 * 60 * 1000;
const INTERRUPT_THRESHOLD = 8;

export interface AdaptiveProfile {
  workContext: WorkContext;
  contextLabel: string;
  chromeLevel: ChromeLevel;
  guidedPanelTab: GuidedPanelTab;
  suggestFocusMode: boolean;
  widgetOrderSuggestion: string[] | null;
  widgetOrderChanged: boolean;
}

export interface ComputeAdaptiveInput {
  userId?: string;
  pathname: string;
  moduleUsage: ModuleUsage[];
  session: SessionMetrics;
  focusMode: boolean;
  adaptiveEnabled: boolean;
  currentWidgets: PlacedWidget[];
}

export function reorderQuickActions<T extends QuickActionLike>(
  actions: T[],
  userId: string | undefined,
  moduleUsage: ModuleUsage[],
): T[] {
  const usage = loadQuickActionUsage(userId);
  const recentCmds = loadRecentCommandIds(userId, 8);

  const score = (action: T): number => {
    let s = usage[action.id] ?? 0;
    for (const mod of moduleUsage) {
      for (const { prefix, actionId } of ROUTE_TO_QUICK_ACTION) {
        if (actionId === action.id && (mod.prefix === prefix || mod.prefix.startsWith(prefix.slice(1)))) {
          s += mod.count * 2;
        }
      }
    }
    const cmdMap: Record<string, string> = {
      'action-create-producer': 'qa-producer',
      'action-create-farm': 'qa-farm',
      'action-create-lot': 'qa-lot',
      'action-create-form': 'qa-form',
      'action-new-purchase': 'qa-purchase',
      'action-workflow-inbox': 'qa-inbox',
    };
    for (const cmd of recentCmds) {
      const mapped = cmdMap[cmd];
      if (mapped === action.id) s += 5;
    }
    return s;
  };

  return [...actions].sort((a, b) => score(b) - score(a));
}

export function computeWidgetOrderSuggestion(
  widgets: PlacedWidget[],
  workContext: WorkContext,
): string[] | null {
  if (!widgets.length) return null;
  const priority = CONTEXT_WIDGET_PRIORITY[workContext];
  const currentIds = widgets.map((w) => w.widgetId);
  const suggested = [...currentIds].sort((a, b) => {
    const pa = priority.indexOf(a);
    const pb = priority.indexOf(b);
    return (pa < 0 ? 999 : pa) - (pb < 0 ? 999 : pb);
  });
  const changed = suggested.some((id, i) => id !== currentIds[i]);
  return changed ? suggested : null;
}

export function computeGuidedPanelTab(userId: string | undefined): GuidedPanelTab {
  const tasks = loadPersonalTasks(userId).filter((t) => !t.done);
  if (tasks.length >= 2) return 'work';
  const history = loadWorkEntityHistory(userId);
  const formVisits = history.filter((h) => h.kind === 'form').length;
  const listVisits = history.filter((h) => ['producer', 'farm', 'lot'].includes(h.kind)).length;
  if (formVisits > listVisits) return 'lists';
  if (history.length > 4) return 'lists';
  return 'work';
}

export function computeAdaptiveProfile(input: ComputeAdaptiveInput): AdaptiveProfile {
  const { userId, pathname, moduleUsage, session, focusMode, adaptiveEnabled, currentWidgets } = input;
  const workContext = detectWorkContext(moduleUsage, pathname);
  const duration = sessionDurationMs(session);
  const suggestFocusMode =
    adaptiveEnabled &&
    !focusMode &&
    duration >= LONG_SESSION_MS &&
    session.moduleSwitches >= INTERRUPT_THRESHOLD;

  let chromeLevel: ChromeLevel = 'normal';
  if (focusMode) chromeLevel = 'focus';
  else if (session.moduleSwitches >= 5) chromeLevel = 'compact';

  const widgetOrderSuggestion = adaptiveEnabled
    ? computeWidgetOrderSuggestion(currentWidgets, workContext)
    : null;

  return {
    workContext,
    contextLabel: contextLabel(workContext),
    chromeLevel,
    guidedPanelTab: computeGuidedPanelTab(userId),
    suggestFocusMode,
    widgetOrderSuggestion,
    widgetOrderChanged: Boolean(widgetOrderSuggestion),
  };
}

export function workContextWelcome(workContext: WorkContext): string {
  const messages: Record<WorkContext, string> = {
    agricultural: 'Priorizamos productores, fincas y acciones de campo según su uso reciente.',
    capture: 'Su jornada se orienta a formularios y capturas de campo.',
    operational: 'Destacamos compras, inventario y pendientes operativos.',
    administrative: 'La interfaz se adapta a tareas de administración y seguridad.',
    reports: 'Priorizamos indicadores y reportes según su actividad.',
    mixed: 'Organizamos su centro de trabajo según los módulos que más utiliza.',
  };
  return messages[workContext];
}
