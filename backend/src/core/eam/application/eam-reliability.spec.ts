import {
  aggregateAssetAnalytics,
  aggregateEnergyReadings,
  aggregatePlantAvailability,
  computeConditionTrend,
  computeMaintenanceCompliance,
  computeReliabilityIndicators,
  evaluateConditionThreshold,
  generateEamReliabilityKey,
  runSimulation,
} from '../domain/eam-reliability.engine';

describe('eam-reliability.engine', () => {
  it('generates reliability keys', () => {
    expect(generateEamReliabilityKey('RDG', 1)).toBe('RDG-000001');
  });

  it('computes reliability indicators', () => {
    const result = computeReliabilityIndicators({
      operatingHours: 1000,
      events: [
        { downtimeHours: 10, repairHours: 5, costImpact: 200 },
        { downtimeHours: 8, repairHours: 4, costImpact: 150 },
      ],
    });
    expect(result.failureCount).toBe(2);
    expect(result.mtbf).toBe(500);
    expect(result.mttr).toBe(4.5);
    expect(result.availability).toBeGreaterThan(0);
    expect(result.unavailabilityCost).toBe(350);
  });

  it('aggregates energy readings', () => {
    const agg = aggregateEnergyReadings([
      { energyType: 'electricity', quantity: 100, totalCost: 12, assetKey: 'A1' },
      { energyType: 'fuel', quantity: 50, totalCost: 80, assetKey: 'A1' },
    ]);
    expect(agg.totalCost).toBe(92);
    expect(agg.byAsset.A1).toBe(92);
  });

  it('aggregates asset analytics', () => {
    const agg = aggregateAssetAnalytics([
      { assetKey: 'A1', totalCost: 500, failureCount: 3, downtimeHours: 20 },
      { assetKey: 'A2', totalCost: 100, failureCount: 1, downtimeHours: 5 },
    ]);
    expect(agg.mostCostly[0].assetKey).toBe('A1');
    expect(agg.mostFailures[0].failureCount).toBe(3);
  });

  it('runs downtime simulation', () => {
    const result = runSimulation('downtime', { hourlyDowntimeCost: 100 }, { downtimeHours: 5 });
    expect((result as { economicImpact: number }).economicImpact).toBe(500);
  });

  it('runs maintenance increase simulation', () => {
    const result = runSimulation('maintenance_increase', { annualMaintCost: 10000, downtimeHours: 100, hourlyDowntimeCost: 50 }, { maintIncreasePct: 20 });
    expect((result as { extraMaintCost: number }).extraMaintCost).toBe(2000);
  });

  it('evaluates condition thresholds', () => {
    expect(evaluateConditionThreshold(50, 40, 60)).toBe('warning');
    expect(evaluateConditionThreshold(70, 40, 60)).toBe('critical');
    expect(evaluateConditionThreshold(30, 40, 60)).toBe('normal');
  });

  it('computes condition trend', () => {
    const trend = computeConditionTrend([
      { recordedAt: new Date('2026-01-01'), value: 10 },
      { recordedAt: new Date('2026-01-02'), value: 15 },
    ]);
    expect(trend.trend).toBe('rising');
    expect(trend.delta).toBe(5);
  });

  it('aggregates plant availability', () => {
    const result = aggregatePlantAvailability([
      { plantKey: 'P1', availability: 90 },
      { plantKey: 'P1', availability: 80 },
    ]);
    expect(result.P1).toBe(85);
  });

  it('computes maintenance compliance', () => {
    expect(computeMaintenanceCompliance(10, 8)).toBe(80);
    expect(computeMaintenanceCompliance(0, 0)).toBe(100);
  });

  it('handles large volume reliability aggregation', () => {
    const events = Array.from({ length: 5000 }, (_, i) => ({
      downtimeHours: i % 10,
      repairHours: (i % 5) + 1,
      costImpact: i % 100,
    }));
    const result = computeReliabilityIndicators({ operatingHours: 50000, events });
    expect(result.failureCount).toBe(5000);
    expect(result.mtbf).toBeGreaterThan(0);
  });

  it('runs concurrent simulation scenarios', () => {
    const baseline = { annualMaintCost: 50000, downtimeHours: 200, hourlyDowntimeCost: 80 };
    const results = Array.from({ length: 100 }, (_, i) =>
      runSimulation('maintenance_increase', baseline, { maintIncreasePct: i % 30 + 1 }),
    );
    expect(results.every((r) => typeof (r as { extraMaintCost: number }).extraMaintCost === 'number')).toBe(true);
  });

  it('aggregates large energy datasets', () => {
    const readings = Array.from({ length: 2000 }, (_, i) => ({
      energyType: (['electricity', 'fuel', 'water', 'gas'] as const)[i % 4],
      quantity: i + 1,
      totalCost: (i + 1) * 0.1,
      assetKey: `A${i % 50}`,
    }));
    const agg = aggregateEnergyReadings(readings);
    expect(agg.totalCost).toBeGreaterThan(0);
    expect(Object.keys(agg.byAsset).length).toBe(50);
  });
});
