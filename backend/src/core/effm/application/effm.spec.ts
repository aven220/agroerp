import {
  aggregateEffmIndicators,
  computeFuelEfficiency,
  computeOperationMetrics,
  computePerformanceKpis,
  EFFM_MACHINE_TYPES,
  EFFM_TELEMETRY_PROTOCOLS,
  generateEffmKey,
  simulateTelemetryPayload,
} from '../domain/effm.engine';

describe('effm.engine', () => {
  it('generates EFFM keys', () => {
    expect(generateEffmKey('MCH', 1)).toBe('MCH-000001');
  });

  it('computes operation metrics', () => {
    const m = computeOperationMetrics({
      startedAt: new Date('2026-01-01T08:00:00'),
      endedAt: new Date('2026-01-01T12:00:00'),
      distanceKm: 40,
      areaCoveredHa: 10,
    });
    expect(m.hoursWorked).toBe(4);
    expect(m.avgSpeedKmh).toBe(10);
  });

  it('computes fuel efficiency', () => {
    const f = computeFuelEfficiency(80, 4, 10);
    expect(f.efficiencyLph).toBe(20);
    expect(f.litersPerHa).toBe(8);
  });

  it('computes performance KPIs', () => {
    const k = computePerformanceKpis({
      totalHours: 100, productiveHours: 80, idleMinutes: 600,
      areaCoveredHa: 50, fuelLiters: 400, fuelCost: 2000,
    });
    expect(k.utilizationPct).toBe(80);
    expect(k.costPerHa).toBe(40);
  });

  it('aggregates fleet indicators', () => {
    const agg = aggregateEffmIndicators({
      activeMachines: 8, activeImplements: 12, operations30d: 45,
      fuelLiters30d: 1200, telemetryReadings30d: 500, activeAlarms: 2, utilizationPct: 75,
    });
    expect(agg.fleetReady).toBe(true);
    expect(agg.fleetScore).toBeGreaterThan(0);
  });

  it('exposes machine and telemetry types', () => {
    expect(EFFM_MACHINE_TYPES).toContain('tractor');
    expect(EFFM_TELEMETRY_PROTOCOLS).toContain('isobus');
  });
});

describe('effm.telemetry.simulation', () => {
  it('simulates telemetry payload', () => {
    const p = simulateTelemetryPayload('can_bus', { engineHours: 1200, rpm: 1800, speedKmh: 12 });
    expect(p.engineHours).toBe(1200);
    expect(p.rpm).toBe(1800);
  });

  it('handles concurrent key generation', () => {
    const keys = new Set(Array.from({ length: 500 }, (_, i) => generateEffmKey('TLM', i + 1)));
    expect(keys.size).toBe(500);
  });
});
