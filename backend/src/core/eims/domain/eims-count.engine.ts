export type EimsCountTypeValue =
  | 'general'
  | 'cyclic'
  | 'partial'
  | 'warehouse'
  | 'location'
  | 'category'
  | 'lot'
  | 'item'
  | 'extraordinary';

export type EimsCountStatusValue =
  | 'draft'
  | 'scheduled'
  | 'in_progress'
  | 'counting'
  | 'reconciling'
  | 'pending_approval'
  | 'approved'
  | 'closed'
  | 'cancelled';

export type EimsCountCaptureRoundValue = 'first' | 'second' | 'third';
export type EimsCountCaptureMethodValue = 'qr' | 'barcode' | 'manual' | 'offline';

export const EIMS_COUNT_TYPES: Array<{ entryKey: EimsCountTypeValue; name: string }> = [
  { entryKey: 'general', name: 'Inventario general' },
  { entryKey: 'cyclic', name: 'Inventario cíclico' },
  { entryKey: 'partial', name: 'Conteo parcial' },
  { entryKey: 'warehouse', name: 'Conteo por bodega' },
  { entryKey: 'location', name: 'Conteo por ubicación' },
  { entryKey: 'category', name: 'Conteo por categoría' },
  { entryKey: 'lot', name: 'Conteo por lote' },
  { entryKey: 'item', name: 'Conteo por artículo' },
  { entryKey: 'extraordinary', name: 'Conteo extraordinario' },
];

export function generateCountKey(type: EimsCountTypeValue, seq = 1): string {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `CNT-${type.toUpperCase().slice(0, 8)}-${stamp}-${String(seq).padStart(4, '0')}`;
}

export function generateCountLineKey(countKey: string, seq: number): string {
  return `${countKey}-L${String(seq).padStart(5, '0')}`;
}

export function generateCaptureKey(lineKey: string, round: EimsCountCaptureRoundValue, seq = 1): string {
  return `${lineKey}-${round.toUpperCase()}-${String(seq).padStart(3, '0')}`;
}

export function generateVarianceKey(lineKey: string): string {
  return `VAR-${lineKey}`;
}

export function generateAdjustmentKey(lineKey: string): string {
  return `ADJ-${lineKey}`;
}

export function generateApprovalKey(adjustmentKey: string, level: number): string {
  return `${adjustmentKey}-LVL${level}`;
}

export function generateActKey(countKey: string): string {
  return `ACT-${countKey}`;
}

export function generateAssignmentKey(countKey: string, userId: string, seq = 1): string {
  return `${countKey}-ASN-${userId.slice(0, 8)}-${seq}`;
}

export function generatePhotoKey(countKey: string, seq = 1): string {
  return `${countKey}-PHO-${Date.now()}-${seq}`;
}

export function computeVariance(systemQty: number, physicalQty: number, unitCost = 0) {
  const varianceQty = Number((physicalQty - systemQty).toFixed(6));
  const variancePct =
    systemQty === 0
      ? physicalQty === 0
        ? 0
        : 100
      : Number((((physicalQty - systemQty) / Math.abs(systemQty)) * 100).toFixed(4));
  const varianceCost = Number((varianceQty * unitCost).toFixed(6));
  return { varianceQty, variancePct, varianceCost };
}

export function isWithinTolerance(
  varianceQty: number,
  variancePct: number,
  varianceCost: number,
  systemCost: number,
  tolerance: { qtyPct?: number; costPct?: number; qtyAbs?: number },
): boolean {
  const qtyAbs = Math.abs(varianceQty);
  const qtyPct = Math.abs(variancePct);
  const costAbs = Math.abs(varianceCost);
  const costPct =
    systemCost === 0 ? (costAbs === 0 ? 0 : 100) : (costAbs / Math.abs(systemCost)) * 100;

  const qtyAbsOk = tolerance.qtyAbs != null && tolerance.qtyAbs > 0 ? qtyAbs <= tolerance.qtyAbs : true;
  const qtyPctOk = tolerance.qtyPct != null && tolerance.qtyPct > 0 ? qtyPct <= tolerance.qtyPct : true;
  const costPctOk =
    tolerance.costPct != null && tolerance.costPct > 0 ? costPct <= tolerance.costPct : true;

  if (
    (tolerance.qtyAbs == null || tolerance.qtyAbs <= 0) &&
    (tolerance.qtyPct == null || tolerance.qtyPct <= 0) &&
    (tolerance.costPct == null || tolerance.costPct <= 0)
  ) {
    return qtyAbs === 0;
  }

  return qtyAbsOk && qtyPctOk && costPctOk;
}

export function resolvePhysicalQty(
  captures: Array<{ round: EimsCountCaptureRoundValue; quantity: number; capturedAt: Date | string }>,
  options?: { requireSecond?: boolean; requireThird?: boolean },
): { physicalQty: number | null; roundUsed: EimsCountCaptureRoundValue | null } {
  const byRound = new Map<EimsCountCaptureRoundValue, number>();
  const sorted = [...captures].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime(),
  );
  for (const c of sorted) {
    byRound.set(c.round, c.quantity);
  }

  if (options?.requireThird && byRound.has('third')) {
    return { physicalQty: byRound.get('third')!, roundUsed: 'third' };
  }
  if (options?.requireSecond && byRound.has('second')) {
    return { physicalQty: byRound.get('second')!, roundUsed: 'second' };
  }
  if (byRound.has('third')) return { physicalQty: byRound.get('third')!, roundUsed: 'third' };
  if (byRound.has('second')) return { physicalQty: byRound.get('second')!, roundUsed: 'second' };
  if (byRound.has('first')) return { physicalQty: byRound.get('first')!, roundUsed: 'first' };
  return { physicalQty: null, roundUsed: null };
}

export function proposeAdjustment(varianceQty: number): {
  adjustmentType: 'adjustment_positive' | 'adjustment_negative' | null;
  quantity: number;
} {
  if (varianceQty === 0) return { adjustmentType: null, quantity: 0 };
  if (varianceQty > 0) return { adjustmentType: 'adjustment_positive', quantity: varianceQty };
  return { adjustmentType: 'adjustment_negative', quantity: Math.abs(varianceQty) };
}

export function validateCountPlan(input: {
  countType: EimsCountTypeValue;
  warehouseKeys?: string[];
  locationKeys?: string[];
  itemKeys?: string[];
  categoryKeys?: string[];
  lotKeys?: string[];
}): string | null {
  switch (input.countType) {
    case 'warehouse':
      if (!input.warehouseKeys?.length) return 'Conteo por bodega requiere bodegas';
      break;
    case 'location':
      if (!input.locationKeys?.length) return 'Conteo por ubicación requiere ubicaciones';
      break;
    case 'category':
      if (!input.categoryKeys?.length) return 'Conteo por categoría requiere categorías';
      break;
    case 'lot':
      if (!input.lotKeys?.length) return 'Conteo por lote requiere lotes';
      break;
    case 'item':
      if (!input.itemKeys?.length) return 'Conteo por artículo requiere artículos';
      break;
    default:
      break;
  }
  return null;
}

export function canTransition(from: EimsCountStatusValue, to: EimsCountStatusValue): boolean {
  const allowed: Record<EimsCountStatusValue, EimsCountStatusValue[]> = {
    draft: ['scheduled', 'in_progress', 'cancelled'],
    scheduled: ['in_progress', 'cancelled'],
    in_progress: ['counting', 'cancelled'],
    counting: ['reconciling', 'cancelled'],
    reconciling: ['pending_approval', 'approved', 'closed', 'cancelled'],
    pending_approval: ['approved', 'reconciling', 'cancelled'],
    approved: ['closed'],
    closed: [],
    cancelled: [],
  };
  return allowed[from]?.includes(to) ?? false;
}

export function summarizeCountSession(lines: Array<{
  status: string;
  varianceQty?: number | null;
  varianceCost?: number | null;
  withinTolerance?: boolean | null;
}>) {
  const total = lines.length;
  const counted = lines.filter((l) => l.status === 'counted' || l.status === 'reconciled').length;
  const variances = lines.filter((l) => (l.varianceQty ?? 0) !== 0).length;
  const outOfTolerance = lines.filter((l) => l.withinTolerance === false).length;
  const totalVarianceCost = lines.reduce((s, l) => s + Math.abs(l.varianceCost ?? 0), 0);
  return {
    totalLines: total,
    countedLines: counted,
    pendingLines: total - counted,
    varianceLines: variances,
    outOfToleranceLines: outOfTolerance,
    totalVarianceCost: Number(totalVarianceCost.toFixed(6)),
    progressPct: total === 0 ? 0 : Number(((counted / total) * 100).toFixed(2)),
  };
}

export function mergeOfflineCaptures<T extends { captureKey: string; capturedAt: Date | string }>(
  existing: T[],
  incoming: T[],
): T[] {
  const map = new Map<string, T>();
  for (const row of existing) map.set(row.captureKey, row);
  for (const row of incoming) {
    const prev = map.get(row.captureKey);
    if (!prev || new Date(row.capturedAt).getTime() >= new Date(prev.capturedAt).getTime()) {
      map.set(row.captureKey, row);
    }
  }
  return [...map.values()];
}
