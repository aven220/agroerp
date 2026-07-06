import {
  aggregateEaipIndicators,
  computeRecommendationScore,
  EAIP_PREDICTION_SERVICES,
  generateEaipKey,
  runSimulationProjection,
  simulatePredictionOutput,
} from '../domain/eaip.engine';

describe('eaip.engine', () => {
  it('generates EAIP keys', () => {
    expect(generateEaipKey('MDL', 1)).toBe('MDL-000001');
  });

  it('computes recommendation score', () => {
    const r = computeRecommendationScore({
      phenology: 0.8, climate: 0.6, soil: 0.7, lotHistory: 0.5,
      waterAvailability: 0.9, machineryAvailability: 0.4, staffAvailability: 0.6, productionGoals: 0.7,
    });
    expect(r.score).toBeGreaterThan(0);
    expect(['high', 'medium', 'low']).toContain(r.priority);
  });

  it('runs simulation projection', () => {
    const p = runSimulationProjection({ yieldPerHa: 5000, costPerHa: 2000, areaHa: 10 }, { yieldDeltaPct: 10, costDeltaPct: 5 });
    expect(p.yieldProjection).toBeGreaterThan(50000);
    expect(p.margin).toBeDefined();
  });

  it('aggregates intelligence indicators', () => {
    const agg = aggregateEaipIndicators({
      activeModels: 9, predictions30d: 50, recommendationsActive: 15,
      simulations30d: 8, twinEntities: 12, assistantSessions30d: 20, intelligentAlerts: 3,
    });
    expect(agg.intelligenceReady).toBe(true);
    expect(agg.intelligenceScore).toBeGreaterThan(0);
  });

  it('simulates prediction output', () => {
    const p = simulatePredictionOutput('yield', { baseValue: 1000 });
    expect(p.predictedValue).toBeGreaterThan(0);
    expect(p.confidence).toBeGreaterThan(0);
  });

  it('exposes prediction services', () => {
    expect(EAIP_PREDICTION_SERVICES).toContain('yield');
    expect(EAIP_PREDICTION_SERVICES).toContain('harvest_date');
    expect(EAIP_PREDICTION_SERVICES.length).toBeGreaterThanOrEqual(8);
  });
});

describe('eaip.mass.simulation', () => {
  it('runs bulk scenario comparison', () => {
    const scenarios = [
      { yieldDeltaPct: 0 }, { yieldDeltaPct: 10 }, { yieldDeltaPct: -5 },
    ];
    const results = scenarios.map((s) => runSimulationProjection({ yieldPerHa: 4000, costPerHa: 1500, areaHa: 20 }, s));
    expect(results[1].yieldProjection).toBeGreaterThan(results[0].yieldProjection);
    expect(results[2].yieldProjection).toBeLessThan(results[0].yieldProjection);
  });

  it('handles concurrent key generation', () => {
    const keys = new Set(Array.from({ length: 500 }, (_, i) => generateEaipKey('SIM', i + 1)));
    expect(keys.size).toBe(500);
  });
});
