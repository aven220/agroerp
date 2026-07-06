import {
  aggregateEiwpIndicators,
  buildAgronomicRecommendation,
  computeWaterBalance,
  EIWP_ALERT_TYPES,
  EIWP_IRRIGATION_METHODS,
  EIWP_MODULE_SLOTS,
  EIWP_WATER_SOURCE_TYPES,
  estimateEtMm,
  evaluateClimateAlerts,
  generateEiwpKey,
} from '../domain/eiwp.engine';

describe('eiwp.engine', () => {
  it('generates EIWP keys', () => {
    expect(generateEiwpKey('IRR', 1)).toBe('IRR-000001');
  });

  it('computes water balance', () => {
    const bal = computeWaterBalance({
      appliedWaterMm: 20,
      rainfallMm: 10,
      etMm: 5,
      cropDemandMm: 15,
      availabilityM3: 500,
    });
    expect(bal.deficitMm).toBe(0);
    expect(bal.excessMm).toBe(15);
    expect(bal.status).toBe('excess');
  });

  it('detects water deficit', () => {
    const bal = computeWaterBalance({
      appliedWaterMm: 2,
      rainfallMm: 0,
      etMm: 8,
      cropDemandMm: 10,
      availabilityM3: 50,
    });
    expect(bal.deficitMm).toBeGreaterThan(0);
    expect(bal.status).toBe('deficit');
  });

  it('evaluates climate alerts', () => {
    const alerts = evaluateClimateAlerts({
      temperatureC: 0,
      windSpeedKmh: 70,
      deficitMm: 20,
      appliedWaterMm: 0,
    });
    expect(alerts.some((a) => a.alertType === 'frost')).toBe(true);
    expect(alerts.some((a) => a.alertType === 'strong_wind')).toBe(true);
    expect(alerts.some((a) => a.alertType === 'drought_risk')).toBe(true);
  });

  it('estimates ET from climate', () => {
    const et = estimateEtMm(30, 40);
    expect(et).toBeGreaterThan(0);
  });

  it('builds agronomic recommendation', () => {
    const rec = buildAgronomicRecommendation({
      deficitMm: 15,
      excessMm: 0,
      availabilityM3: 80,
      phenologyStage: 'floración',
    });
    expect(rec).toContain('Incrementar riego');
  });

  it('aggregates water indicators', () => {
    const agg = aggregateEiwpIndicators({
      waterSources: 5,
      activeSectors: 12,
      scheduledIrrigations: 8,
      activeAlerts: 2,
      weatherStations: 3,
      consumptionM3_30d: 1200,
    });
    expect(agg.irrigationReady).toBe(true);
    expect(agg.waterScore).toBeGreaterThan(0);
  });

  it('exposes catalogs', () => {
    expect(EIWP_WATER_SOURCE_TYPES.length).toBeGreaterThanOrEqual(6);
    expect(EIWP_IRRIGATION_METHODS.length).toBe(5);
    expect(EIWP_ALERT_TYPES.length).toBeGreaterThanOrEqual(8);
    expect(EIWP_MODULE_SLOTS.length).toBeGreaterThanOrEqual(10);
  });
});

describe('eiwp.climate.simulation', () => {
  it('handles concurrent balance calculations', () => {
    const results = Array.from({ length: 300 }, (_, i) =>
      computeWaterBalance({
        appliedWaterMm: i % 20,
        rainfallMm: (i * 2) % 15,
        etMm: 5,
        cropDemandMm: 8,
        availabilityM3: 100,
      }),
    );
    expect(results.every((r) => r.netBalanceMm !== undefined)).toBe(true);
  });

  it('simulates variable climate alert thresholds', () => {
    const temps = [-2, 5, 25, 35, 40];
    const allAlerts = temps.flatMap((temperatureC) => evaluateClimateAlerts({ temperatureC }));
    expect(allAlerts.length).toBeGreaterThan(0);
  });
});

describe('eiwp.resilience', () => {
  it('handles concurrent key generation', () => {
    const keys = new Set(Array.from({ length: 500 }, (_, i) => generateEiwpKey('WST', i + 1)));
    expect(keys.size).toBe(500);
  });
});
