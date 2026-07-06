import { roundQty } from './emfg-manufacturing.engine';

export type MesOrderStatus =
  | 'released'
  | 'in_progress'
  | 'paused'
  | 'suspended'
  | 'completed'
  | 'cancelled';

export function canMesTransition(from: string, action: string): { ok: boolean; to?: MesOrderStatus } {
  const map: Record<string, Partial<Record<string, MesOrderStatus>>> = {
    released: { start: 'in_progress', cancel: 'cancelled' },
    in_progress: { pause: 'paused', suspend: 'suspended', finish: 'completed', cancel: 'cancelled' },
    paused: { resume: 'in_progress', suspend: 'suspended', finish: 'completed', cancel: 'cancelled' },
    suspended: { resume: 'in_progress', cancel: 'cancelled' },
  };
  const to = map[from]?.[action];
  return to ? { ok: true, to } : { ok: false };
}

export function computeElapsedMinutes(startAt: Date, endAt: Date = new Date()): number {
  return roundQty((endAt.getTime() - startAt.getTime()) / 60_000, 2);
}

export function computeYieldPct(produced: number, planned: number): number {
  if (planned <= 0) return 0;
  return roundQty((produced / planned) * 100, 2);
}

export function computeAdvancePct(produced: number, planned: number): number {
  if (planned <= 0) return 0;
  return roundQty(Math.min(100, (produced / planned) * 100), 2);
}

export function validateConsumption(
  requiredQty: number,
  issuedQty: number,
  consumeQty: number,
  allowOverIssue = false,
): string[] {
  const errors: string[] = [];
  if (consumeQty <= 0) errors.push('invalid_quantity');
  if (!allowOverIssue && issuedQty + consumeQty > requiredQty * 1.1) errors.push('exceeds_required');
  return errors;
}

export function generateLotCode(orderNumber: string, seq: number): string {
  return `LOT-${orderNumber}-${String(seq).padStart(4, '0')}`;
}

export function generateSerialCode(lotCode: string, seq: number): string {
  return `${lotCode}-S${String(seq).padStart(5, '0')}`;
}

export function aggregateMonitorStats(orders: Array<{
  status: string;
  plannedQty: number;
  producedQty: number;
  scrapQty: number;
  materials?: Array<{ requiredQty: number; issuedQty: number }>;
}>) {
  const active = orders.filter((o) => o.status === 'in_progress').length;
  const stopped = orders.filter((o) => ['paused', 'suspended'].includes(o.status)).length;
  const finished = orders.filter((o) => ['completed', 'closed'].includes(o.status)).length;
  const totalProduced = orders.reduce((s, o) => s + o.producedQty, 0);
  const totalScrap = orders.reduce((s, o) => s + o.scrapQty, 0);
  let consumed = 0;
  let required = 0;
  for (const o of orders) {
    for (const m of o.materials ?? []) {
      consumed += m.issuedQty;
      required += m.requiredQty;
    }
  }
  const avgAdvance = orders.length
    ? roundQty(
        orders.reduce((s, o) => s + computeAdvancePct(o.producedQty, o.plannedQty), 0) / orders.length,
        2,
      )
    : 0;
  return { active, stopped, finished, totalProduced, totalScrap, consumed, required, avgAdvance };
}
