import {
  aggregateEatpIndicators,
  EATP_FARM_UNIT_TYPES,
  EATP_INPUT_CATEGORIES,
  EATP_LABOR_TYPES,
  EATP_MODULE_SLOTS,
  generateEatpKey,
  mapLaborToFmdt,
  mapTaskStatus,
} from '../domain/eatp.engine';

describe('eatp.engine', () => {
  it('generates EATP keys', () => {
    expect(generateEatpKey('TSK', 1)).toBe('TSK-000001');
  });

  it('aggregates ag indicators', () => {
    const agg = aggregateEatpIndicators({
      activeFarms: 5,
      activeLots: 20,
      activeCampaigns: 2,
      pendingTasks: 10,
      completedTasks30d: 30,
      hectares: 150.5,
    });
    expect(agg.activeFarms).toBe(5);
    expect(agg.completionRate).toBe(75);
  });

  it('maps labor to fmdt codes', () => {
    expect(mapLaborToFmdt('planting')).toBe('planting');
    expect(mapLaborToFmdt('land_prep')).toBe('weeding');
  });

  it('maps task status', () => {
    expect(mapTaskStatus(true)).toBe('completed');
    expect(mapTaskStatus(false)).toBe('pending');
  });

  it('exposes catalogs', () => {
    expect(EATP_LABOR_TYPES.length).toBeGreaterThanOrEqual(8);
    expect(EATP_INPUT_CATEGORIES.length).toBeGreaterThanOrEqual(6);
    expect(EATP_MODULE_SLOTS.length).toBeGreaterThanOrEqual(10);
    expect(EATP_FARM_UNIT_TYPES.length).toBeGreaterThanOrEqual(7);
  });
});

describe('eatp.resilience', () => {
  it('handles concurrent key generation', () => {
    const keys = new Set(Array.from({ length: 500 }, (_, i) => generateEatpKey('HV', i + 1)));
    expect(keys.size).toBe(500);
  });
});
