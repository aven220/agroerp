import { BpmsElementType, BpmsInstanceStatus, BpmsTaskPriority } from '@agroerp/prisma-bpms-client';

export function generateBpmsKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

export type BpmnElement = {
  elementKey: string;
  elementType: BpmsElementType;
  name: string;
  config?: Record<string, unknown>;
  posX?: number;
  posY?: number;
};

export type BpmnFlow = {
  flowKey: string;
  fromElementKey: string;
  toElementKey: string;
  condition?: string;
};

export type BpmnValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export function validateBpmnGraph(elements: BpmnElement[], flows: BpmnFlow[]): BpmnValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const starts = elements.filter((e) => e.elementType === 'start');
  const ends = elements.filter((e) => e.elementType === 'end');
  if (starts.length === 0) errors.push('Falta evento de inicio');
  if (starts.length > 1) warnings.push('Múltiples eventos de inicio');
  if (ends.length === 0) errors.push('Falta evento de fin');
  const keys = new Set(elements.map((e) => e.elementKey));
  for (const f of flows) {
    if (!keys.has(f.fromElementKey)) errors.push(`Flujo ${f.flowKey}: origen inválido`);
    if (!keys.has(f.toElementKey)) errors.push(`Flujo ${f.flowKey}: destino inválido`);
  }
  for (const e of elements) {
    if (e.elementType === 'end') continue;
    const outgoing = flows.filter((f) => f.fromElementKey === e.elementKey);
    if (outgoing.length === 0) warnings.push(`Elemento ${e.elementKey} sin salida`);
  }
  return { valid: errors.length === 0, errors, warnings };
}

export function evaluateExpression(expression: string, context: Record<string, unknown>): boolean {
  if (!expression || expression.trim() === '') return true;
  try {
    const keys = Object.keys(context);
    const values = Object.values(context);
    const fn = new Function(...keys, `return (${expression});`);
    return Boolean(fn(...values));
  } catch {
    return false;
  }
}

export function selectOutgoingFlows(
  flows: BpmnFlow[],
  elementKey: string,
  context: Record<string, unknown>,
  gatewayType?: BpmsElementType,
): BpmnFlow[] {
  const outgoing = flows.filter((f) => f.fromElementKey === elementKey);
  if (gatewayType === 'parallel_gateway') return outgoing;
  for (const f of outgoing) {
    if (evaluateExpression(f.condition ?? '', context)) return [f];
  }
  return outgoing.length > 0 ? [outgoing[0]] : [];
}

export function isAutomaticElement(type: BpmsElementType): boolean {
  return ['service_task', 'service_call', 'external_api', 'timer', 'event'].includes(type);
}

export function isHumanTask(type: BpmsElementType): boolean {
  return type === 'user_task';
}

export function computeDueDate(priority: BpmsTaskPriority, from: Date = new Date()): Date {
  const due = new Date(from);
  const hours = { low: 72, medium: 48, high: 24, critical: 4 }[priority];
  due.setHours(due.getHours() + hours);
  return due;
}

export type SlaInput = { startedAt: Date; dueAt: Date | null; completedAt: Date | null };

export function evaluateSlaStatus(input: SlaInput): 'on_track' | 'at_risk' | 'breached' {
  if (!input.dueAt) return 'on_track';
  const now = input.completedAt ?? new Date();
  if (now > input.dueAt) return 'breached';
  const total = input.dueAt.getTime() - input.startedAt.getTime();
  const elapsed = now.getTime() - input.startedAt.getTime();
  if (total > 0 && elapsed / total > 0.8) return 'at_risk';
  return 'on_track';
}

export type BottleneckRow = { elementKey: string; avgDurationMs: number; count: number };

export function detectBottlenecks(logs: Array<{ elementKey: string | null; durationMs: number }>): BottleneckRow[] {
  const byElement: Record<string, { sum: number; count: number }> = {};
  for (const l of logs) {
    if (!l.elementKey) continue;
    const row = byElement[l.elementKey] ?? { sum: 0, count: 0 };
    row.sum += l.durationMs;
    row.count += 1;
    byElement[l.elementKey] = row;
  }
  return Object.entries(byElement)
    .map(([elementKey, v]) => ({ elementKey, avgDurationMs: Math.round(v.sum / v.count), count: v.count }))
    .sort((a, b) => b.avgDurationMs - a.avgDurationMs)
    .slice(0, 10);
}

export type AssigneeCandidate = { userId: string; workload: number };

export function autoAssignTask(candidates: AssigneeCandidate[]): string | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => a.workload - b.workload)[0].userId;
}

export type MonitoringInput = {
  active: number;
  completed: number;
  failed: number;
  avgDurationHours: number;
  slaBreached: number;
  slaCompliant: number;
};

export function aggregateMonitoringIndicators(input: MonitoringInput) {
  const total = input.active + input.completed + input.failed;
  const slaTotal = input.slaBreached + input.slaCompliant;
  return {
    activeInstances: input.active,
    completedInstances: input.completed,
    failedInstances: input.failed,
    avgDurationHours: Math.round(input.avgDurationHours * 100) / 100,
    slaCompliancePct: slaTotal > 0 ? Math.round((input.slaCompliant / slaTotal) * 10000) / 100 : 100,
    throughputPct: total > 0 ? Math.round((input.completed / total) * 10000) / 100 : 0,
  };
}

export function exportBpmnPackage(
  processKey: string,
  name: string,
  elements: BpmnElement[],
  flows: BpmnFlow[],
  version: number,
) {
  return {
    bpmnVersion: '2.0',
    processKey,
    name,
    version,
    exportedAt: new Date().toISOString(),
    elements,
    flows,
  };
}

export function canTransitionInstance(from: BpmsInstanceStatus, to: BpmsInstanceStatus): boolean {
  const map: Record<BpmsInstanceStatus, BpmsInstanceStatus[]> = {
    running: ['suspended', 'completed', 'failed', 'cancelled'],
    suspended: ['running', 'cancelled'],
    completed: [],
    failed: ['running'],
    cancelled: [],
  };
  return map[from]?.includes(to) ?? false;
}
