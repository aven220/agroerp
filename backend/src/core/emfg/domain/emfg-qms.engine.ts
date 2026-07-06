import { roundQty } from './emfg-manufacturing.engine';

export type CriterionInput = {
  minValue?: number | null;
  maxValue?: number | null;
  targetValue?: number | null;
};

export function evaluateMeasurement(value: number, criterion: CriterionInput): boolean {
  if (criterion.minValue != null && value < criterion.minValue) return false;
  if (criterion.maxValue != null && value > criterion.maxValue) return false;
  return true;
}

export function deriveInspectionResult(measurements: Array<{ passed: boolean }>): 'pass' | 'fail' | 'conditional' {
  if (measurements.length === 0) return 'conditional';
  const failed = measurements.filter((m) => !m.passed).length;
  if (failed === 0) return 'pass';
  if (failed === measurements.length) return 'fail';
  return 'conditional';
}

export function canReleaseLot(status: string, action: string): { ok: boolean; to?: string } {
  const map: Record<string, Partial<Record<string, string>>> = {
    pending: { approve: 'approved', reject: 'rejected', hold: 'held' },
    held: { approve: 'approved', reject: 'rejected' },
    approved: {},
    rejected: { hold: 'held' },
  };
  const to = map[status]?.[action];
  return to ? { ok: true, to } : { ok: false };
}

export function computeRejectionRate(total: number, rejected: number): number {
  if (total <= 0) return 0;
  return roundQty((rejected / total) * 100, 2);
}

export function computeApprovalRate(total: number, approved: number): number {
  if (total <= 0) return 0;
  return roundQty((approved / total) * 100, 2);
}

export function computeAvgClosureDays(ncs: Array<{ createdAt: Date; closedAt?: Date | null }>): number {
  const closed = ncs.filter((n) => n.closedAt);
  if (!closed.length) return 0;
  const totalDays = closed.reduce((s, n) => {
    const days = (n.closedAt!.getTime() - n.createdAt.getTime()) / 86_400_000;
    return s + days;
  }, 0);
  return roundQty(totalDays / closed.length, 2);
}

export function aggregateQmsIndicators(data: {
  inspections: Array<{ result: string }>;
  releases: Array<{ status: string }>;
  ncs: Array<{ createdAt: Date; closedAt?: Date | null; supplierKey?: string | null; severity: string }>;
  bySupplier: Map<string, { total: number; failed: number }>;
  byLine: Map<string, { total: number; failed: number }>;
}) {
  const totalInsp = data.inspections.length;
  const failedInsp = data.inspections.filter((i) => i.result === 'fail').length;
  const totalRel = data.releases.length;
  const approved = data.releases.filter((r) => r.status === 'approved').length;
  const rejected = data.releases.filter((r) => r.status === 'rejected').length;
  const openNcs = data.ncs.filter((n) => !n.closedAt).length;
  return {
    rejectionPct: computeRejectionRate(totalInsp, failedInsp),
    approvalPct: computeApprovalRate(totalRel, approved),
    lotRejectionPct: computeRejectionRate(totalRel, rejected),
    ncCount: data.ncs.length,
    openNcCount: openNcs,
    avgClosureDays: computeAvgClosureDays(data.ncs),
    bySupplier: [...data.bySupplier.entries()].map(([k, v]) => ({
      supplierKey: k,
      rejectionPct: computeRejectionRate(v.total, v.failed),
    })),
    byLine: [...data.byLine.entries()].map(([k, v]) => ({
      lineKey: k,
      rejectionPct: computeRejectionRate(v.total, v.failed),
    })),
  };
}

export function validateCapaTransition(from: string, to: string): boolean {
  const allowed: Record<string, string[]> = {
    open: ['in_progress', 'closed'],
    in_progress: ['verification', 'closed'],
    verification: ['closed', 'in_progress'],
    closed: [],
  };
  return (allowed[from] ?? []).includes(to);
}
