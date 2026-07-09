/**
 * PM-02 — Seguimiento de hitos de proceso en sesión (solo frontend).
 * Permite continuidad entre pantallas sin tocar backend.
 */

import { BUSINESS_FLOWS, type FlowId } from './businessFlows';

export interface ProcessMilestone {
  flowId: FlowId;
  stepId: string;
  completedAt: string;
  entityId?: string;
  entityName?: string;
  entityType?: string;
}

export interface ProcessNextHint {
  label: string;
  route: string;
  description: string;
}

const STORAGE_KEY = 'agroerp_process_milestones_v1';

type MilestoneStore = Partial<Record<FlowId, Record<string, ProcessMilestone>>>;

function loadStore(): MilestoneStore {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as MilestoneStore;
  } catch {
    return {};
  }
}

function saveStore(store: MilestoneStore): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function markProcessMilestone(
  flowId: FlowId,
  stepId: string,
  meta?: Pick<ProcessMilestone, 'entityId' | 'entityName' | 'entityType'>,
): void {
  const store = loadStore();
  const bucket = { ...(store[flowId] ?? {}) };
  bucket[stepId] = {
    flowId,
    stepId,
    completedAt: new Date().toISOString(),
    ...meta,
  };
  store[flowId] = bucket;
  saveStore(store);
}

export function getFlowMilestones(flowId: FlowId): Record<string, ProcessMilestone> {
  return loadStore()[flowId] ?? {};
}

export function isStepCompleted(flowId: FlowId, stepId: string): boolean {
  return Boolean(getFlowMilestones(flowId)[stepId]);
}

export function getLatestMilestone(flowId: FlowId): ProcessMilestone | null {
  const milestones = Object.values(getFlowMilestones(flowId));
  if (milestones.length === 0) return null;
  return milestones.sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  )[0];
}

export function clearLatestMilestoneBanner(flowId: FlowId, stepId?: string): void {
  const store = loadStore();
  if (!store[flowId]) return;
  if (stepId) {
    const next = { ...store[flowId] };
    delete next[stepId];
    store[flowId] = next;
  }
  saveStore(store);
}

/** Siguiente paso recomendado tras completar un hito del flujo */
export function getProcessNextStep(flowId: FlowId, completedStepId: string): ProcessNextHint | null {
  const flow = BUSINESS_FLOWS[flowId];
  const idx = flow.steps.findIndex((s) => s.id === completedStepId);
  if (idx < 0 || idx >= flow.steps.length - 1) return null;
  const next = flow.steps[idx + 1];
  return {
    label: next.label,
    route: next.route,
    description: `Continúe con: ${next.label.toLowerCase()}`,
  };
}

export function getCompletedStepIds(flowId: FlowId): string[] {
  return Object.keys(getFlowMilestones(flowId));
}

export function getPendingStepIds(flowId: FlowId, upToStepId?: string): string[] {
  const flow = BUSINESS_FLOWS[flowId];
  const completed = new Set(getCompletedStepIds(flowId));
  let limit = flow.steps.length;
  if (upToStepId) {
    const idx = flow.steps.findIndex((s) => s.id === upToStepId);
    if (idx >= 0) limit = idx + 1;
  }
  return flow.steps.slice(0, limit).filter((s) => !completed.has(s.id)).map((s) => s.id);
}

const STEP_COMPLETION_LABELS: Partial<Record<FlowId, Record<string, string>>> = {
  agricultural: {
    producer: 'Productor registrado',
    farm: 'Finca registrada',
    lot: 'Lote registrado',
    crop: 'Cultivo registrado',
    activity: 'Actividad capturada',
    approval: 'Solicitud enviada',
    record: 'Expediente consultado',
  },
  forms: {
    create: 'Formulario creado',
    design: 'Diseño guardado',
    publish: 'Formulario publicado',
    capture: 'Datos capturados',
  },
  workflow: {
    action: 'Tarea resuelta',
  },
  purchases: {
    wizard: 'Recepción iniciada',
    weighing: 'Pesaje registrado',
    settlement: 'Liquidación generada',
  },
  inventory: {
    items: 'Artículo registrado',
    movements: 'Movimiento registrado',
  },
};

export function getMilestoneCompletionLabel(flowId: FlowId, stepId: string): string {
  return STEP_COMPLETION_LABELS[flowId]?.[stepId] ?? 'Paso completado';
}
