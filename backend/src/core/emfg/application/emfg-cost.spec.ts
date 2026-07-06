import {
  aggregateCostIndicators,
  computeActualTotal,
  computeLaborCost,
  computeLineTotal,
  computeMargin,
  computeMarginPct,
  computeOverheadCost,
  computeStandardFromBom,
  computeUnitCost,
  computeVariance,
  computeWipValue,
} from '../domain/emfg-cost.engine';

describe('emfg-cost.engine', () => {
  it('computes line totals', () => {
    expect(computeLineTotal(10, 2.5)).toBe(25);
  });

  it('computes standard from BOM', () => {
    const total = computeStandardFromBom([
      { quantity: 2, unitCost: 5 },
      { quantity: 1, unitCost: 10 },
    ]);
    expect(total).toBe(20);
  });

  it('computes labor and overhead', () => {
    expect(computeLaborCost(120, 30)).toBe(60);
    expect(computeOverheadCost(100, 15)).toBe(15);
  });

  it('computes variance', () => {
    const v = computeVariance(100, 115);
    expect(v.amount).toBe(15);
    expect(v.pct).toBe(15);
  });

  it('computes WIP value', () => {
    expect(computeWipValue(50, 30, 20)).toBe(100);
  });

  it('computes unit cost and margins', () => {
    expect(computeUnitCost(1000, 50)).toBe(20);
    expect(computeMargin(30, 20)).toBe(10);
    expect(computeMarginPct(30, 20)).toBeCloseTo(33.33, 1);
  });

  it('aggregates cost indicators', () => {
    const result = aggregateCostIndicators({
      orders: [
        { standardUnitCost: 10, actualUnitCost: 12, marginExpected: 5, marginActual: 3 },
        { standardUnitCost: 8, actualUnitCost: 9, marginExpected: 4, marginActual: 3 },
      ],
      variances: [
        { varianceAmount: 2, varianceType: 'material' },
        { varianceAmount: 1, varianceType: 'labor' },
      ],
    });
    expect(result.orderCount).toBe(2);
    expect(result.materialVariance).toBe(2);
  });

  it('handles mass volume aggregation', () => {
    const lines = Array.from({ length: 10000 }, (_, i) => ({ amount: i % 100 }));
    expect(computeActualTotal(lines)).toBeGreaterThan(0);
  });

  it('handles concurrent variance calculations', () => {
    const results = Array.from({ length: 1000 }, (_, i) => computeVariance(100, 100 + (i % 20)));
    expect(results.every((r) => r.amount >= 0)).toBe(true);
  });
});
