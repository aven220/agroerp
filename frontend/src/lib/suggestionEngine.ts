/**
 * PM-06 — Motor de recomendaciones basado en reglas (sin IA, sin backend).
 */

import { BUSINESS_FLOWS, type FlowId } from './businessFlows';
import { loadRecentCommandIds } from './commandPalette';
import { loadGridProductivity } from './gridProductivity';
import {
  loadOpenProcesses,
  loadPersonalTasks,
  loadPinnedRecords,
} from './guidedWorkspace';
import {
  getLatestMilestone,
  getProcessNextStep,
  isStepCompleted,
} from './processWorkspace';
import { getContinueWorkItems, loadWorkEntityHistory } from './workEntityHistory';
import { scanFormDrafts, type ModuleVisitRecord } from './smartAssistant';

export type SuggestionKind =
  | 'continue'
  | 'process'
  | 'task'
  | 'discovery'
  | 'productivity'
  | 'draft'
  | 'relationship'
  | 'command';

export interface SmartSuggestion {
  id: string;
  kind: SuggestionKind;
  priority: number;
  title: string;
  description: string;
  icon: string;
  to: string;
  actionLabel?: string;
}

const ACTIVE_FLOWS: FlowId[] = ['agricultural', 'forms', 'workflow', 'purchases', 'inventory'];

const DISCOVERY_MODULES: Array<{ prefix: string; label: string; to: string; icon: string; permission?: string }> = [
  { prefix: '/productores', label: 'Operación agrícola', to: '/productores', icon: '🌱', permission: 'producer:read' },
  { prefix: '/formularios', label: 'Formularios de campo', to: '/formularios', icon: '📝', permission: 'form:read' },
  { prefix: '/procesos', label: 'Procesos y aprobaciones', to: '/procesos/bandeja', icon: '⚙', permission: 'workflow:read' },
  { prefix: '/compras', label: 'Compras de café', to: '/compras', icon: '☕' },
  { prefix: '/inventario', label: 'Inventario', to: '/inventario', icon: '📦' },
  { prefix: '/bi', label: 'Reportes', to: '/bi', icon: '📊' },
];

const GRID_ROUTES: Record<string, string> = {
  producers: '/productores',
  farms: '/fincas',
  lots: '/lotes',
  inventory: '/inventario',
  purchases: '/compras',
};

const COMMAND_LABELS: Record<string, string> = {
  'action-create-producer': 'Crear productor',
  'action-create-farm': 'Crear finca',
  'action-create-lot': 'Crear lote',
  'action-create-form': 'Diseñar formulario',
  'action-new-purchase': 'Registrar compra',
  'action-workflow-inbox': 'Bandeja de tareas',
  'workspace-open': 'Abrir Mi jornada',
};

export interface ComputeSuggestionsInput {
  userId?: string;
  pathname: string;
  dismissedIds: Set<string>;
  visitedModules: ModuleVisitRecord[];
  hasPermission: (p: string) => boolean;
  navHistoryCount: number;
}

function add(
  list: SmartSuggestion[],
  dismissed: Set<string>,
  suggestion: SmartSuggestion,
) {
  if (dismissed.has(suggestion.id)) return;
  if (list.some((s) => s.id === suggestion.id)) return;
  list.push(suggestion);
}

export function computeSuggestions(input: ComputeSuggestionsInput): SmartSuggestion[] {
  const { userId, pathname, dismissedIds, visitedModules, hasPermission, navHistoryCount } = input;
  const suggestions: SmartSuggestion[] = [];

  const tasks = loadPersonalTasks(userId).filter((t) => !t.done);
  for (const task of tasks.slice(0, 3)) {
    add(suggestions, dismissedIds, {
      id: `task-${task.id}`,
      kind: 'task',
      priority: 85,
      title: task.label,
      description: 'Pendiente personal en Mi jornada',
      icon: '☐',
      to: task.to ?? '/',
      actionLabel: 'Ir al pendiente',
    });
  }

  const openProcs = loadOpenProcesses(userId);
  for (const proc of openProcs.slice(0, 3)) {
    add(suggestions, dismissedIds, {
      id: `proc-open-${proc.id}`,
      kind: 'process',
      priority: 90,
      title: proc.label,
      description: 'Proceso abierto en esta sesión',
      icon: '⚙',
      to: proc.to,
      actionLabel: 'Continuar proceso',
    });
  }

  for (const flowId of ACTIVE_FLOWS) {
    const latest = getLatestMilestone(flowId);
    if (!latest) continue;
    const next = getProcessNextStep(flowId, latest.stepId);
    if (!next) continue;
    if (pathname === next.route || pathname.startsWith(`${next.route}/`)) continue;
    add(suggestions, dismissedIds, {
      id: `flow-next-${flowId}-${latest.stepId}`,
      kind: 'process',
      priority: 88,
      title: next.label,
      description: `${BUSINESS_FLOWS[flowId].title}: ${next.description}`,
      icon: '→',
      to: next.route,
      actionLabel: 'Siguiente paso',
    });
  }

  if (isStepCompleted('agricultural', 'producer') && !isStepCompleted('agricultural', 'farm')) {
    if (hasPermission('farm:create') && !pathname.startsWith('/fincas')) {
      add(suggestions, dismissedIds, {
        id: 'rel-producer-no-farm',
        kind: 'relationship',
        priority: 82,
        title: 'Registrar finca del productor',
        description: 'Completó un productor pero aún no registró la finca asociada',
        icon: '🌿',
        to: '/fincas/nueva',
        actionLabel: 'Crear finca',
      });
    }
  }

  if (isStepCompleted('agricultural', 'farm') && !isStepCompleted('agricultural', 'lot')) {
    if (hasPermission('lot:create') && !pathname.startsWith('/lotes')) {
      add(suggestions, dismissedIds, {
        id: 'rel-farm-no-lot',
        kind: 'relationship',
        priority: 80,
        title: 'Registrar lote en la finca',
        description: 'La finca está registrada; el siguiente paso natural es crear lotes',
        icon: '📍',
        to: '/lotes/nuevo',
        actionLabel: 'Crear lote',
      });
    }
  }

  if (isStepCompleted('forms', 'publish') && !isStepCompleted('forms', 'capture')) {
    add(suggestions, dismissedIds, {
      id: 'rel-form-not-captured',
      kind: 'relationship',
      priority: 78,
      title: 'Revisar capturas del formulario',
      description: 'Publicó un formulario pero aún no revisó envíos de campo',
      icon: '📥',
      to: '/formularios/recoleccion',
      actionLabel: 'Ir a recolección',
    });
  }

  for (const draft of scanFormDrafts().slice(0, 2)) {
    const to = `/formularios/${draft.formId}/ejecutar`;
    if (pathname === to) continue;
    add(suggestions, dismissedIds, {
      id: `draft-form-${draft.formId}`,
      kind: 'draft',
      priority: 86,
      title: 'Formulario con borrador guardado',
      description: 'Tiene datos sin enviar en un formulario web',
      icon: '📝',
      to,
      actionLabel: 'Continuar llenado',
    });
  }

  for (const item of getContinueWorkItems(userId, 4)) {
    if (pathname === item.to || pathname.startsWith(`${item.to}/`)) continue;
    add(suggestions, dismissedIds, {
      id: `continue-${item.kind}-${item.id}`,
      kind: 'continue',
      priority: 75,
      title: item.label,
      description: 'Retome donde quedó en su última visita',
      icon: '↩',
      to: item.to,
      actionLabel: 'Continuar',
    });
  }

  const recentCmds = loadRecentCommandIds(userId, 5);
  for (const cmdId of recentCmds) {
    const label = COMMAND_LABELS[cmdId];
    if (!label) continue;
    add(suggestions, dismissedIds, {
      id: `cmd-freq-${cmdId}`,
      kind: 'command',
      priority: 55,
      title: label,
      description: 'Comando usado recientemente — ejecútelo de nuevo con ⌘⇧P',
      icon: '⌘',
      to: '/',
      actionLabel: 'Abrir comandos',
    });
  }

  for (const [gridId, route] of Object.entries(GRID_ROUTES)) {
    const prod = loadGridProductivity(userId, gridId);
    for (const preset of prod.serverFilterPresets.filter((p) => p.pinned).slice(0, 1)) {
      add(suggestions, dismissedIds, {
        id: `filter-${gridId}-${preset.id}`,
        kind: 'productivity',
        priority: 60,
        title: preset.name,
        description: `Consulta fijada en ${gridId}`,
        icon: '🔖',
        to: route,
        actionLabel: 'Abrir consulta',
      });
    }
  }

  const visitedPrefixes = new Set(visitedModules.map((m) => m.path));
  for (const mod of DISCOVERY_MODULES) {
    if (mod.permission && !hasPermission(mod.permission)) continue;
    if (visitedPrefixes.has(mod.prefix)) continue;
    add(suggestions, dismissedIds, {
      id: `discover-${mod.prefix}`,
      kind: 'discovery',
      priority: 45,
      title: `Explore ${mod.label}`,
      description: 'Aún no ha visitado este módulo en su jornada',
      icon: mod.icon,
      to: mod.to,
      actionLabel: 'Descubrir',
    });
  }

  if (navHistoryCount < 4 && visitedModules.length < 3) {
    add(suggestions, dismissedIds, {
      id: 'onboard-first-steps',
      kind: 'discovery',
      priority: 70,
      title: 'Primeros pasos en AGROERP',
      description: 'Registre un productor y explore el centro de trabajo',
      icon: '✨',
      to: '/productores',
      actionLabel: 'Empezar',
    });
  }

  const pinned = loadPinnedRecords(userId);
  if (pinned.length === 0 && loadWorkEntityHistory(userId).length > 2) {
    add(suggestions, dismissedIds, {
      id: 'tip-pin-records',
      kind: 'productivity',
      priority: 40,
      title: 'Fije registros frecuentes',
      description: 'Use «Fijar» en detalle de productor o finca para tenerlos en Mi jornada',
      icon: '📌',
      to: '/productores',
      actionLabel: 'Ver productores',
    });
  }

  const visits = loadWorkEntityHistory(userId);
  const hasProducer = visits.some((v) => v.kind === 'producer');
  const hasFarm = visits.some((v) => v.kind === 'farm');
  if (hasProducer && !hasFarm && pathname.startsWith('/productores')) {
    add(suggestions, dismissedIds, {
      id: 'ctx-producer-add-farm',
      kind: 'relationship',
      priority: 92,
      title: '¿Ya registró la finca?',
      description: 'Vio productores recientemente pero no ha abierto fincas',
      icon: '🌿',
      to: '/fincas/nueva',
      actionLabel: 'Registrar finca',
    });
  }

  suggestions.sort((a, b) => b.priority - a.priority);
  return suggestions.slice(0, 16);
}

export function getContextualSuggestions(
  all: SmartSuggestion[],
  pathname: string,
  limit = 2,
): SmartSuggestion[] {
  const prefix = pathname.split('/').filter(Boolean)[0] ?? '';
  const contextual = all.filter((s) => {
    if (s.kind === 'relationship' || s.kind === 'draft' || s.kind === 'process') {
      return s.to.includes(prefix) || pathname.startsWith(s.to.split('/').slice(0, 2).join('/') ?? '');
    }
    if (s.kind === 'continue') return s.to.startsWith(`/${prefix}`) || pathname.startsWith(s.to);
    return s.priority >= 85;
  });
  const merged = [...contextual, ...all.filter((s) => !contextual.includes(s))];
  const seen = new Set<string>();
  const result: SmartSuggestion[] = [];
  for (const s of merged) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    result.push(s);
    if (result.length >= limit) break;
  }
  return result;
}

export function kindLabel(kind: SuggestionKind): string {
  const labels: Record<SuggestionKind, string> = {
    continue: 'Continuar',
    process: 'Proceso',
    task: 'Pendiente',
    discovery: 'Descubrir',
    productivity: 'Productividad',
    draft: 'Borrador',
    relationship: 'Siguiente paso',
    command: 'Comando',
  };
  return labels[kind];
}
