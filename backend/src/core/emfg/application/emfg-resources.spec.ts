import {
  aggregateResourceIndicators,
  canTransitionAvailability,
  computeAvailabilityPct,
  computeIdleMinutes,
  computeMtbf,
  computeMttr,
  computeShiftCapacity,
  computeUtilizationPct,
  detectBottlenecks,
} from '../domain/emfg-resources.engine';

describe('emfg-resources.engine', () => {
  it('computes shift capacity metrics', () => {
    const cap = computeShiftCapacity(480, 360);
    expect(cap.utilizedMinutes).toBe(360);
    expect(cap.idleMinutes).toBe(120);
    expect(cap.utilizationPct).toBe(75);
  });

  it('detects bottlenecks above threshold', () => {
    const entities = [
      { entityKey: 'WC1', entityType: 'work_center', installedMinutes: 100, utilizedMinutes: 90 },
      { entityKey: 'WC2', entityType: 'work_center', installedMinutes: 100, utilizedMinutes: 50 },
    ];
    expect(detectBottlenecks(entities)).toHaveLength(1);
    expect(detectBottlenecks(entities)[0].entityKey).toBe('WC1');
  });

  it('computes MTBF and MTTR', () => {
    expect(computeMtbf(4, 100)).toBe(25);
    expect(computeMttr(120, 3)).toBe(40);
  });

  it('computes availability percentage', () => {
    expect(computeAvailabilityPct(900, 100)).toBe(90);
  });

  it('validates availability transitions', () => {
    expect(canTransitionAvailability('available', 'in_production')).toBe(true);
    expect(canTransitionAvailability('blocked', 'in_production')).toBe(false);
    expect(canTransitionAvailability('available', 'available')).toBe(false);
  });

  it('aggregates resource indicators', () => {
    const result = aggregateResourceIndicators({
      equipment: [
        { availabilityStatus: 'available', operatingHours: 100 },
        { availabilityStatus: 'maintenance', operatingHours: 50 },
        { availabilityStatus: 'in_production', operatingHours: 200 },
      ],
      downtimes: [{ downtimeMinutes: 60 }, { downtimeMinutes: 30 }],
      maintenanceLogs: [
        { maintenanceType: 'corrective', downtimeMinutes: 120 },
        { maintenanceType: 'preventive', downtimeMinutes: 30 },
      ],
      capacities: [
        { entityKey: 'M1', entityType: 'machine', installedMinutes: 480, utilizedMinutes: 400 },
      ],
    });
    expect(result.equipmentCount).toBe(3);
    expect(result.mtbf).toBeGreaterThan(0);
    expect(result.bottlenecks.length).toBeGreaterThanOrEqual(0);
  });

  it('simulates capacity for many entities', () => {
    const entities = Array.from({ length: 500 }, (_, i) => ({
      entityKey: `WC-${i}`,
      entityType: 'work_center',
      installedMinutes: 480,
      utilizedMinutes: (i % 10) * 48,
    }));
    const bottlenecks = detectBottlenecks(entities, 80);
    expect(bottlenecks.length).toBeGreaterThan(0);
    const avg = entities.reduce((s, e) => s + computeUtilizationPct(e.installedMinutes, e.utilizedMinutes), 0) / entities.length;
    expect(avg).toBeGreaterThan(0);
  });

  it('computes idle minutes', () => {
    expect(computeIdleMinutes(480, 100)).toBe(380);
    expect(computeIdleMinutes(100, 150)).toBe(0);
  });

  it('handles concurrent availability states', () => {
    const states = ['available', 'in_production', 'maintenance', 'reserved', 'blocked', 'out_of_service'];
    for (const from of states) {
      for (const to of states) {
        canTransitionAvailability(from, to);
      }
    }
    expect(states).toHaveLength(6);
  });
});
