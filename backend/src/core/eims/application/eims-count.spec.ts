import {
  canTransition,
  computeVariance,
  generateCountKey,
  isWithinTolerance,
  mergeOfflineCaptures,
  proposeAdjustment,
  resolvePhysicalQty,
  summarizeCountSession,
  validateCountPlan,
} from '../domain/eims-count.engine';

describe('EIMS CountEngine', () => {
  it('generates count keys and validates plans', () => {
    expect(generateCountKey('warehouse')).toContain('CNT-WAREHOUS');
    expect(validateCountPlan({ countType: 'warehouse', warehouseKeys: [] })).toContain('bodegas');
    expect(validateCountPlan({ countType: 'item', itemKeys: ['A'] })).toBeNull();
    expect(validateCountPlan({ countType: 'lot', lotKeys: [] })).toContain('lotes');
    expect(validateCountPlan({ countType: 'location', locationKeys: ['L1'] })).toBeNull();
    expect(validateCountPlan({ countType: 'category', categoryKeys: [] })).toContain('categorías');
  });

  it('computes variances and tolerances', () => {
    const v = computeVariance(100, 95, 10);
    expect(v.varianceQty).toBe(-5);
    expect(v.variancePct).toBe(-5);
    expect(v.varianceCost).toBe(-50);
    expect(isWithinTolerance(-5, -5, -50, 1000, { qtyPct: 10 })).toBe(true);
    expect(isWithinTolerance(-5, -5, -50, 1000, { qtyAbs: 2 })).toBe(false);
    expect(isWithinTolerance(0, 0, 0, 1000, {})).toBe(true);
  });

  it('resolves physical qty across rounds', () => {
    const captures = [
      { round: 'first' as const, quantity: 10, capturedAt: '2026-07-01T10:00:00Z' },
      { round: 'second' as const, quantity: 12, capturedAt: '2026-07-01T11:00:00Z' },
      { round: 'third' as const, quantity: 11, capturedAt: '2026-07-01T12:00:00Z' },
    ];
    expect(resolvePhysicalQty(captures, { requireSecond: true }).physicalQty).toBe(12);
    expect(resolvePhysicalQty(captures, { requireThird: true }).physicalQty).toBe(11);
    expect(resolvePhysicalQty(captures.slice(0, 1)).physicalQty).toBe(10);
    expect(resolvePhysicalQty([]).physicalQty).toBeNull();
  });

  it('proposes positive and negative adjustments', () => {
    expect(proposeAdjustment(5)).toEqual({ adjustmentType: 'adjustment_positive', quantity: 5 });
    expect(proposeAdjustment(-3)).toEqual({ adjustmentType: 'adjustment_negative', quantity: 3 });
    expect(proposeAdjustment(0).adjustmentType).toBeNull();
  });

  it('validates status transitions', () => {
    expect(canTransition('draft', 'scheduled')).toBe(true);
    expect(canTransition('counting', 'reconciling')).toBe(true);
    expect(canTransition('closed', 'counting')).toBe(false);
    expect(canTransition('pending_approval', 'approved')).toBe(true);
  });

  it('summarizes multi-warehouse count sessions', () => {
    const summary = summarizeCountSession([
      { status: 'counted', varianceQty: 0, varianceCost: 0, withinTolerance: true },
      { status: 'reconciled', varianceQty: -2, varianceCost: -20, withinTolerance: false },
      { status: 'pending', varianceQty: null, varianceCost: null, withinTolerance: null },
      { status: 'reconciled', varianceQty: 1, varianceCost: 10, withinTolerance: true },
    ]);
    expect(summary.totalLines).toBe(4);
    expect(summary.countedLines).toBe(3);
    expect(summary.varianceLines).toBe(2);
    expect(summary.outOfToleranceLines).toBe(1);
    expect(summary.totalVarianceCost).toBe(30);
  });

  it('merges offline captures concurrently by captureKey', () => {
    const existing = [
      { captureKey: 'A', capturedAt: '2026-07-01T10:00:00Z', quantity: 1 },
      { captureKey: 'B', capturedAt: '2026-07-01T10:00:00Z', quantity: 2 },
    ];
    const incoming = [
      { captureKey: 'A', capturedAt: '2026-07-01T11:00:00Z', quantity: 9 },
      { captureKey: 'C', capturedAt: '2026-07-01T11:00:00Z', quantity: 3 },
    ];
    const merged = mergeOfflineCaptures(existing, incoming);
    expect(merged).toHaveLength(3);
    expect(merged.find((m) => m.captureKey === 'A')?.quantity).toBe(9);
  });

  it('handles massive variance computation', () => {
    const rows = Array.from({ length: 2000 }, (_, i) => computeVariance(100, 100 + (i % 5) - 2, 12));
    expect(rows).toHaveLength(2000);
    expect(rows.every((r) => Number.isFinite(r.varianceCost))).toBe(true);
  });
});
