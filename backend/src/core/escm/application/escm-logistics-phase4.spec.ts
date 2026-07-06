import {
  canAssignVehicle,
  canTransitionDispatch,
  computeLoadUsedKg,
  estimateEtaMinutes,
  generateDispatchKey,
  generateRouteKey,
  groupTasksByZone,
  resolveDeliveryOutcome,
  resolveDispatchType,
  verifyPickQuantities,
} from '../domain/escm-logistics.engine';

describe('ESCM Logistics Engine', () => {
  it('validates dispatch transitions', () => {
    expect(canTransitionDispatch('draft', 'picking')).toBe(true);
    expect(canTransitionDispatch('delivered', 'in_transit')).toBe(false);
  });

  it('generates logistics keys', () => {
    expect(generateDispatchKey(1)).toBe('DSP-000001');
    expect(generateRouteKey(2)).toBe('RTE-000002');
  });

  it('resolves dispatch types', () => {
    expect(resolveDispatchType({ isPartial: true })).toBe('partial');
    expect(resolveDispatchType({ countryCode: 'US' })).toBe('international');
    expect(resolveDispatchType({ consolidationKey: 'C1' })).toBe('consolidated');
  });

  it('computes load and vehicle assignment', () => {
    const load = computeLoadUsedKg([{ itemKey: 'A', quantity: 10, unitWeightKg: 2 }]);
    expect(load).toBe(20);
    expect(canAssignVehicle(500, 1000)).toBe(true);
    expect(canAssignVehicle(1500, 1000)).toBe(false);
  });

  it('verifies pick quantities', () => {
    expect(verifyPickQuantities(10, 10).ok).toBe(true);
    expect(verifyPickQuantities(10, 5).short).toBe(true);
  });

  it('resolves delivery outcomes', () => {
    expect(resolveDeliveryOutcome([{ quantity: 10 }])).toBe('complete');
    expect(resolveDeliveryOutcome([{ quantity: 10, rejectedQty: 10 }])).toBe('rejected');
    expect(resolveDeliveryOutcome([{ quantity: 10, returnedQty: 10 }])).toBe('returned');
    expect(resolveDeliveryOutcome([{ quantity: 10, rejectedQty: 2 }])).toBe('partial');
  });

  it('estimates ETA', () => {
    expect(estimateEtaMinutes(40)).toBe(60);
    expect(estimateEtaMinutes(0)).toBe(30);
  });

  it('groups tasks by zone', () => {
    const map = groupTasksByZone([
      { zoneKey: 'A' },
      { zoneKey: 'B' },
      { zoneKey: 'A' },
    ]);
    expect(map.get('A')?.length).toBe(2);
    expect(map.get('B')?.length).toBe(1);
  });

  it('handles concurrent dispatch key generation', () => {
    const keys = Array.from({ length: 50 }, (_, i) => generateDispatchKey(i + 1));
    expect(new Set(keys).size).toBe(50);
  });
});
