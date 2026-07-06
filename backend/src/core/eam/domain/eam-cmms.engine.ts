import { EamMaintPriority, EamMaintWorkOrderStatus } from '@prisma/client';

export function generateEamCmmsKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

const WO_TRANSITIONS: Record<EamMaintWorkOrderStatus, EamMaintWorkOrderStatus[]> = {
  draft: ['pending_approval', 'cancelled'],
  pending_approval: ['approved', 'cancelled'],
  approved: ['scheduled', 'in_progress', 'cancelled'],
  scheduled: ['in_progress', 'cancelled'],
  in_progress: ['paused', 'pending_close', 'cancelled'],
  paused: ['in_progress', 'cancelled'],
  pending_close: ['technically_closed', 'cancelled'],
  technically_closed: ['administratively_closed'],
  administratively_closed: [],
  cancelled: [],
};

export function canTransitionWorkOrder(from: EamMaintWorkOrderStatus, to: EamMaintWorkOrderStatus): boolean {
  return WO_TRANSITIONS[from]?.includes(to) ?? false;
}

export function computeNextScheduleDate(
  lastRun: Date | null,
  frequencyValue: number,
  frequencyUnit: string,
  from: Date = new Date(),
): Date {
  const base = lastRun ?? from;
  const next = new Date(base);
  switch (frequencyUnit) {
    case 'hours':
      next.setHours(next.getHours() + frequencyValue);
      break;
    case 'km':
    case 'miles':
      next.setDate(next.getDate() + Math.max(1, Math.round(frequencyValue / 100)));
      break;
    case 'cycles':
      next.setDate(next.getDate() + frequencyValue);
      break;
    default:
      next.setDate(next.getDate() + frequencyValue);
  }
  return next;
}

export type ScheduleSlot = { technicianKey: string; startsAt: Date; endsAt: Date };

export function detectScheduleConflicts(
  existing: ScheduleSlot[],
  proposed: ScheduleSlot,
): boolean {
  return existing.some((e) =>
    e.technicianKey === proposed.technicianKey &&
    proposed.startsAt < e.endsAt &&
    proposed.endsAt > e.startsAt,
  );
}

export type TechnicianWorkload = { technicianKey: string; hours: number; isAvailable: boolean };

export function selectTechnicianForAssignment(
  technicians: TechnicianWorkload[],
  priority: EamMaintPriority,
): string | null {
  const available = technicians.filter((t) => t.isAvailable);
  if (available.length === 0) return null;
  const sorted = [...available].sort((a, b) => a.hours - b.hours);
  if (priority === 'emergency' || priority === 'critical') return sorted[0].technicianKey;
  return sorted[0].technicianKey;
}

export type CostLine = { costType: string; amount: number };

export function aggregateWorkOrderCosts(lines: CostLine[]) {
  const byType: Record<string, number> = {};
  let total = 0;
  for (const l of lines) {
    byType[l.costType] = (byType[l.costType] ?? 0) + l.amount;
    total += l.amount;
  }
  return { byType, total };
}

export function aggregateCmmsCosts(
  workOrders: Array<{ totalCost: number; assetKey: string; familyKey?: string }>,
) {
  const byAsset: Record<string, number> = {};
  const byFamily: Record<string, number> = {};
  let annualTotal = 0;
  for (const wo of workOrders) {
    annualTotal += wo.totalCost;
    byAsset[wo.assetKey] = (byAsset[wo.assetKey] ?? 0) + wo.totalCost;
    if (wo.familyKey) byFamily[wo.familyKey] = (byFamily[wo.familyKey] ?? 0) + wo.totalCost;
  }
  return { annualTotal, byAsset, byFamily };
}

export function evaluateSlaCompliance(
  responseHours: number,
  repairHours: number,
  targetResponse: number,
  targetRepair: number,
): 'compliant' | 'at_risk' | 'breached' {
  if (responseHours > targetResponse || repairHours > targetRepair) return 'breached';
  if (responseHours > targetResponse * 0.8 || repairHours > targetRepair * 0.8) return 'at_risk';
  return 'compliant';
}

export type CmmsIndicatorInput = {
  openWorkOrders: number;
  completedWorkOrders: number;
  overdueWorkOrders: number;
  openIncidents: number;
  slaBreached: number;
  slaCompliant: number;
  totalMaintCost: number;
  technicianUtilizationPct: number;
};

export function aggregateCmmsIndicators(input: CmmsIndicatorInput) {
  const completionPct = input.openWorkOrders + input.completedWorkOrders > 0
    ? Math.round((input.completedWorkOrders / (input.openWorkOrders + input.completedWorkOrders)) * 10000) / 100
    : 0;
  const slaTotal = input.slaBreached + input.slaCompliant;
  const slaCompliancePct = slaTotal > 0
    ? Math.round((input.slaCompliant / slaTotal) * 10000) / 100
    : 100;
  return {
    openWorkOrders: input.openWorkOrders,
    completedWorkOrders: input.completedWorkOrders,
    overdueWorkOrders: input.overdueWorkOrders,
    openIncidents: input.openIncidents,
    slaBreached: input.slaBreached,
    slaCompliancePct,
    completionPct,
    totalMaintCost: input.totalMaintCost,
    technicianUtilizationPct: input.technicianUtilizationPct,
  };
}
