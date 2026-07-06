import {
  aggregateEappIndicators,
  EAPP_AG_INDICES,
  EAPP_MODULE_SLOTS,
  EAPP_SATELLITE_PROVIDERS,
  EAPP_THEMATIC_MAP_TYPES,
  generateEappKey,
  haversineM,
  polygonAreaHaApprox,
} from '../domain/eapp.engine';

describe('eapp.engine', () => {
  it('generates EAPP keys', () => {
    expect(generateEappKey('POI', 1)).toBe('POI-000001');
  });

  it('aggregates precision indicators', () => {
    const agg = aggregateEappIndicators({
      layers: 10,
      lotPolygons: 25,
      activeMissions: 3,
      telemetryDevices: 8,
      indexReadings24h: 15,
      inspections30d: 12,
    });
    expect(agg.lotPolygons).toBe(25);
    expect(agg.precisionReady).toBe(true);
    expect(agg.geoScore).toBeGreaterThan(0);
  });

  it('computes haversine distance', () => {
    const d = haversineM(0, 0, 0, 1);
    expect(d).toBeGreaterThan(110000);
    expect(d).toBeLessThan(112000);
  });

  it('approximates polygon area', () => {
    const area = polygonAreaHaApprox([
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ]);
    expect(area).toBe(1);
  });

  it('exposes catalogs', () => {
    expect(EAPP_SATELLITE_PROVIDERS.length).toBeGreaterThanOrEqual(4);
    expect(EAPP_AG_INDICES.length).toBe(4);
    expect(EAPP_THEMATIC_MAP_TYPES.length).toBeGreaterThanOrEqual(7);
    expect(EAPP_MODULE_SLOTS.length).toBeGreaterThanOrEqual(10);
  });
});

describe('eapp.resilience', () => {
  it('handles concurrent key generation', () => {
    const keys = new Set(Array.from({ length: 500 }, (_, i) => generateEappKey('FLT', i + 1)));
    expect(keys.size).toBe(500);
  });

  it('handles concurrent geo calculations', () => {
    const distances = Array.from({ length: 200 }, (_, i) => haversineM(0, 0, 0, i * 0.01));
    expect(distances.every((d) => d >= 0)).toBe(true);
  });
});

describe('eapp.geospatial', () => {
  it('validates precision readiness threshold', () => {
    const low = aggregateEappIndicators({
      layers: 2,
      lotPolygons: 3,
      activeMissions: 0,
      telemetryDevices: 1,
      indexReadings24h: 0,
      inspections30d: 0,
    });
    const high = aggregateEappIndicators({
      layers: 20,
      lotPolygons: 30,
      activeMissions: 5,
      telemetryDevices: 10,
      indexReadings24h: 50,
      inspections30d: 20,
    });
    expect(low.precisionReady).toBe(false);
    expect(high.precisionReady).toBe(true);
  });
});
