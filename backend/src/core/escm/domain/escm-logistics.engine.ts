export type EscmDispatchStatusValue =
  | 'draft'
  | 'picking'
  | 'packing'
  | 'ready'
  | 'scheduled'
  | 'in_transit'
  | 'delivered'
  | 'partial'
  | 'cancelled'
  | 'rescheduled';

export type EscmDeliveryOutcomeValue = 'pending' | 'complete' | 'partial' | 'rejected' | 'returned';

const DISPATCH_TRANSITIONS: Record<EscmDispatchStatusValue, EscmDispatchStatusValue[]> = {
  draft: ['picking', 'cancelled'],
  picking: ['packing', 'cancelled'],
  packing: ['ready', 'cancelled'],
  ready: ['scheduled', 'in_transit', 'cancelled', 'rescheduled'],
  scheduled: ['in_transit', 'cancelled', 'rescheduled'],
  in_transit: ['delivered', 'partial', 'cancelled'],
  delivered: [],
  partial: ['in_transit', 'delivered'],
  cancelled: [],
  rescheduled: ['draft'],
};

export function canTransitionDispatch(from: string, to: EscmDispatchStatusValue): boolean {
  const allowed = DISPATCH_TRANSITIONS[from as EscmDispatchStatusValue] ?? [];
  return allowed.includes(to);
}

export function generateDispatchKey(seq: number): string {
  return `DSP-${String(seq).padStart(6, '0')}`;
}

export function generateWaveKey(seq: number): string {
  return `WAV-${String(seq).padStart(6, '0')}`;
}

export function generatePackingKey(seq: number): string {
  return `PKG-${String(seq).padStart(6, '0')}`;
}

export function generateRouteKey(seq: number): string {
  return `RTE-${String(seq).padStart(6, '0')}`;
}

export function generateDeliveryKey(seq: number): string {
  return `DLV-${String(seq).padStart(6, '0')}`;
}

export function generateIncidentKey(seq: number): string {
  return `INC-${String(seq).padStart(6, '0')}`;
}

export function generateLogisticsDocumentKey(type: string, seq: number): string {
  return `DOC-${type.toUpperCase().slice(0, 4)}-${String(seq).padStart(6, '0')}`;
}

export function resolveDispatchType(input: {
  dispatchType?: string;
  countryCode?: string | null;
  consolidationKey?: string | null;
  isPartial?: boolean;
}): 'standard' | 'partial' | 'consolidated' | 'international' {
  if (input.consolidationKey) return 'consolidated';
  if (input.isPartial) return 'partial';
  if (input.dispatchType === 'international' || (input.countryCode && input.countryCode !== 'CO')) {
    return 'international';
  }
  if (input.dispatchType === 'partial') return 'partial';
  if (input.dispatchType === 'consolidated') return 'consolidated';
  return 'standard';
}

export function computeLoadUsedKg(lines: Array<{ itemKey: string; quantity: number; unitWeightKg?: number }>): number {
  return Number(
    lines.reduce((sum, l) => sum + l.quantity * (l.unitWeightKg ?? 1), 0).toFixed(2),
  );
}

export function canAssignVehicle(loadKg: number, capacityKg: number): boolean {
  if (capacityKg <= 0) return true;
  return loadKg <= capacityKg;
}

export function verifyPickQuantities(
  required: number,
  picked: number,
): { ok: boolean; short: boolean; excess: boolean } {
  return {
    ok: picked >= required,
    short: picked < required,
    excess: picked > required,
  };
}

export function resolveDeliveryOutcome(
  lines: Array<{ quantity: number; rejectedQty?: number; returnedQty?: number }>,
): EscmDeliveryOutcomeValue {
  let total = 0;
  let rejected = 0;
  let returned = 0;
  for (const l of lines) {
    total += l.quantity;
    rejected += l.rejectedQty ?? 0;
    returned += l.returnedQty ?? 0;
  }
  if (returned >= total && total > 0) return 'returned';
  if (rejected >= total && total > 0) return 'rejected';
  if (rejected > 0 || returned > 0) return 'partial';
  return 'complete';
}

export function estimateEtaMinutes(distanceKm: number, avgSpeedKmh = 40): number {
  if (distanceKm <= 0) return 30;
  return Math.ceil((distanceKm / avgSpeedKmh) * 60);
}

export function groupTasksByZone<T extends { zoneKey?: string | null }>(tasks: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const t of tasks) {
    const zone = t.zoneKey ?? 'DEFAULT';
    const list = map.get(zone) ?? [];
    list.push(t);
    map.set(zone, list);
  }
  return map;
}
