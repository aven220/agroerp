import {
  aggregateCostsByCategory,
  computeLogisticMargin,
  costPerDelivery,
  sumCosts,
} from '../domain/epscm-tms-cost.engine';
import {
  computeRouteTotals,
  generateEpscmTmsKey,
  groupDeliveriesByProximity,
  haversineKm,
  optimizeByCapacity,
  optimizeByDistance,
  optimizeByTime,
  validateTimeWindows,
} from '../domain/epscm-tms-routing.engine';

describe('epscm-tms-routing.engine', () => {
  it('generates TMS keys', () => {
    expect(generateEpscmTmsKey('TRP', 1)).toBe('TRP-000001');
  });

  it('computes haversine distance', () => {
    const d = haversineKm(4.65, -74.05, 4.7, -74.1);
    expect(d).toBeGreaterThan(0);
  });

  it('optimizes by distance', () => {
    const stops = optimizeByDistance([
      { stopKey: 'S1', latitude: 4.7, longitude: -74.1 },
      { stopKey: 'S2', latitude: 4.66, longitude: -74.06 },
    ]);
    expect(stops[0].sequence).toBe(1);
  });

  it('optimizes by time windows', () => {
    const stops = optimizeByTime([
      { stopKey: 'S1', windowStart: new Date('2026-07-10T14:00:00Z') },
      { stopKey: 'S2', windowStart: new Date('2026-07-10T10:00:00Z') },
    ]);
    expect(stops[0].stopKey).toBe('S2');
  });

  it('validates capacity', () => {
    const cap = optimizeByCapacity(
      [{ stopKey: 'S1', weight: 100, volume: 2 }, { stopKey: 'S2', weight: 50, volume: 1 }],
      200,
      5,
    );
    expect(cap.feasible).toBe(true);
    expect(cap.totalWeight).toBe(150);
  });

  it('computes route totals', () => {
    const totals = computeRouteTotals([
      { stopKey: 'S1', latitude: 4.65, longitude: -74.05 },
      { stopKey: 'S2', latitude: 4.7, longitude: -74.1 },
    ]);
    expect(totals.distanceKm).toBeGreaterThan(0);
    expect(totals.durationMin).toBeGreaterThan(0);
  });

  it('validates time windows', () => {
    const valid = validateTimeWindows(
      [{ stopKey: 'S1', windowStart: new Date('2026-07-10T08:00:00Z'), windowEnd: new Date('2026-07-10T18:00:00Z') }],
      new Date('2026-07-10T09:00:00Z'),
    );
    expect(valid).toBe(true);
  });

  it('groups deliveries by proximity', () => {
    const groups = groupDeliveriesByProximity([
      { stopKey: 'A', latitude: 4.65, longitude: -74.05 },
      { stopKey: 'B', latitude: 4.651, longitude: -74.051 },
      { stopKey: 'C', latitude: 5.0, longitude: -75.0 },
    ], 5);
    expect(groups.length).toBeGreaterThanOrEqual(2);
  });

  it('handles mass volume distance optimization', () => {
    const stops = Array.from({ length: 5000 }, (_, i) => ({
      stopKey: `S${i}`,
      latitude: 4.65 + (i % 100) * 0.001,
      longitude: -74.05 + (i % 100) * 0.001,
    }));
    const optimized = optimizeByDistance(stops.slice(0, 500));
    expect(optimized.length).toBe(500);
  });

  it('handles concurrent route total calculations', () => {
    const results = Array.from({ length: 1000 }, () =>
      computeRouteTotals([{ stopKey: 'S1', latitude: 4.65, longitude: -74.05 }]),
    );
    expect(results.every((r) => r.distanceKm >= 0)).toBe(true);
  });
});

describe('epscm-tms-cost.engine', () => {
  it('sums and aggregates costs', () => {
    const lines = [{ category: 'fuel', amount: 100 }, { category: 'fuel', amount: 50 }, { category: 'toll', amount: 20 }];
    expect(sumCosts(lines)).toBe(170);
    const byCat = aggregateCostsByCategory(lines);
    expect(byCat.get('fuel')).toBe(150);
  });

  it('computes cost per delivery', () => {
    expect(costPerDelivery(1000, 10)).toBe(100);
  });

  it('computes logistic margin', () => {
    const m = computeLogisticMargin(10000, 7000);
    expect(m.margin).toBe(3000);
    expect(m.marginPct).toBe(30);
  });
});
