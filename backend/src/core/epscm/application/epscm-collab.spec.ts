import {
  aggregateCollabIndicators,
  computeBonusAmount,
  computePenaltyAmount,
  evaluateSlaCompliance,
  generateEpscmCollabKey,
} from '../domain/epscm-collab-analytics.engine';
import {
  compareScenarios,
  simulateNewDistributionCenter,
  simulateNewSupplier,
  simulateRouteChange,
} from '../domain/epscm-collab-simulation.engine';

describe('epscm-collab-analytics.engine', () => {
  it('generates collab keys', () => {
    expect(generateEpscmCollabKey('PTR', 1)).toBe('PTR-000001');
  });

  it('aggregates logistics indicators', () => {
    const ind = aggregateCollabIndicators({
      totalDeliveries: 100,
      completedDeliveries: 90,
      onTimeDeliveries: 85,
      avgDeliveryHours: 18,
      logisticCostTotal: 5000000,
      customerCount: 50,
      routeCount: 20,
      carrierCount: 5,
      inventoryRotation: 2.5,
      warehouseOccupancyPct: 72,
      replenishmentCompliancePct: 88,
      supplierCompliancePct: 92,
    });
    expect(ind.deliveryCompliancePct).toBe(90);
    expect(ind.serviceLevelPct).toBeGreaterThan(0);
    expect(ind.costPerCustomer).toBe(100000);
  });

  it('evaluates SLA compliance', () => {
    expect(evaluateSlaCompliance(96, 95)).toBe('compliant');
    expect(evaluateSlaCompliance(88, 95)).toBe('at_risk');
    expect(evaluateSlaCompliance(70, 95)).toBe('breached');
  });

  it('computes penalties and bonuses', () => {
    expect(computePenaltyAmount(10, 1000000)).toBe(100000);
    expect(computeBonusAmount(5, 500000)).toBe(25000);
  });

  it('handles mass volume indicator aggregation', () => {
    const results = Array.from({ length: 1000 }, (_, i) =>
      aggregateCollabIndicators({
        totalDeliveries: 100 + i,
        completedDeliveries: 90 + (i % 10),
        onTimeDeliveries: 80,
        avgDeliveryHours: 20,
        logisticCostTotal: 1000000 + i,
        customerCount: 10,
        routeCount: 5,
        carrierCount: 2,
        inventoryRotation: 1,
        warehouseOccupancyPct: 50,
        replenishmentCompliancePct: 80,
        supplierCompliancePct: 85,
      }),
    );
    expect(results.every((r) => r.deliveryCompliancePct > 0)).toBe(true);
  });
});

describe('epscm-collab-simulation.engine', () => {
  const baseline = { routes: 10, costTotal: 1000000, avgDeliveryHours: 24, dcCount: 2 };

  it('simulates route changes', () => {
    const r = simulateRouteChange(baseline, 20);
    expect(r.costDelta).not.toBe(0);
  });

  it('simulates new supplier', () => {
    const r = simulateNewSupplier(baseline, -10);
    expect(r.costTotal).toBeLessThan(baseline.costTotal);
  });

  it('simulates new distribution center', () => {
    const r = simulateNewDistributionCenter(baseline, 1);
    expect(r.avgDeliveryHours).toBeLessThan(baseline.avgDeliveryHours);
  });

  it('compares multiple scenarios', () => {
    const results = compareScenarios(baseline, [
      { name: 'A', parameters: { routeChangePct: 10 } },
      { name: 'B', parameters: { newSupplierCostDelta: 5 } },
    ]);
    expect(results.length).toBe(2);
  });

  it('handles concurrent scenario comparisons', () => {
    const results = Array.from({ length: 500 }, (_, i) =>
      simulateRouteChange(baseline, i % 50),
    );
    expect(results.every((r) => typeof r.costTotal === 'number')).toBe(true);
  });
});
