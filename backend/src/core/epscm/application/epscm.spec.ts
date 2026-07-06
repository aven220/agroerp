import {
  aggregateScmIndicators,
  classifyAbc,
  classifyXyz,
  compareDemand,
  computeCoefficientOfVariation,
  computeCoverageDays,
  computeReorderPoint,
  computeReplenishmentQty,
  computeRotationRate,
  computeSafetyStock,
  detectExcessInventory,
  detectNoMovement,
  detectStockoutRisk,
  exponentialSmoothingForecast,
  movingAverageForecast,
} from '../domain/epscm-planning.engine';

describe('epscm-planning.engine', () => {
  it('computes moving average forecast', () => {
    expect(movingAverageForecast([10, 20, 30])).toBe(20);
  });

  it('computes exponential smoothing', () => {
    expect(exponentialSmoothingForecast(100, 80)).toBeGreaterThan(80);
  });

  it('compares demand', () => {
    const r = compareDemand(120, 100);
    expect(r.varianceQty).toBe(20);
    expect(r.variancePct).toBe(20);
  });

  it('computes replenishment levels', () => {
    const safety = computeSafetyStock(10, 7);
    const rop = computeReorderPoint(10, 7, safety);
    expect(rop).toBeGreaterThan(safety);
    expect(computeReplenishmentQty(50, 100, 200)).toBe(150);
  });

  it('classifies ABC and XYZ', () => {
    const abc = classifyAbc([
      { itemKey: 'A1', annualValue: 800 },
      { itemKey: 'B1', annualValue: 150 },
      { itemKey: 'C1', annualValue: 50 },
    ]);
    expect(abc.get('A1')).toBe('A');
    const xyz = classifyXyz([
      { itemKey: 'X1', cv: 0.3 },
      { itemKey: 'Z1', cv: 1.5 },
    ]);
    expect(xyz.get('X1')).toBe('X');
    expect(xyz.get('Z1')).toBe('Z');
  });

  it('computes rotation and coverage', () => {
    expect(computeRotationRate(120, 60)).toBe(2);
    expect(computeCoverageDays(90, 3)).toBe(30);
    expect(computeCoefficientOfVariation([10, 12, 8, 11])).toBeGreaterThan(0);
  });

  it('detects alert conditions', () => {
    expect(detectStockoutRisk(5, 10)).toBe(true);
    expect(detectExcessInventory(150, 100)).toBe(true);
    expect(detectNoMovement(100)).toBe(true);
  });

  it('aggregates SCM indicators', () => {
    const r = aggregateScmIndicators({
      forecasts: 2,
      proposals: 5,
      openAlerts: 3,
      criticalItems: 10,
      obsoleteItems: 2,
      avgCoverageDays: 15,
      planCompliancePct: 85,
    });
    expect(r.openProposals).toBe(5);
    expect(r.planCompliancePct).toBe(85);
  });

  it('handles mass volume classification', () => {
    const items = Array.from({ length: 5000 }, (_, i) => ({
      itemKey: `I${i}`,
      annualValue: 1000 - (i % 100),
    }));
    const abc = classifyAbc(items);
    expect(abc.size).toBe(5000);
  });

  it('handles concurrent replenishment calculations', () => {
    const results = Array.from({ length: 1000 }, (_, i) =>
      computeReplenishmentQty(i % 50, 40, 100),
    );
    expect(results.every((r) => r >= 0)).toBe(true);
  });
});
