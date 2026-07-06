import {
  applyDelta,
  generateBatchKey,
  generateMovementKey,
  locationScope,
  movementDelta,
  parseCsvMovements,
  validateMovementInput,
  validateStockAvailability,
} from '../domain/eims-movement.engine';

describe('EIMS MovementEngine', () => {
  it('computes deltas for entry exit reservation and transfer', () => {
    expect(movementDelta('entry', 10, 5).onHandDelta).toBe(10);
    expect(movementDelta('exit', 4, 5).onHandDelta).toBe(-4);
    expect(movementDelta('reservation', 3).reservedDelta).toBe(3);
    expect(movementDelta('release', 2).reservedDelta).toBe(-2);
    expect(movementDelta('block', 1).blockedDelta).toBe(1);
    expect(movementDelta('transfer', 5).requiresSource).toBe(true);
    expect(movementDelta('transfer', 5).requiresDestination).toBe(true);
  });

  it('applies deltas and validates availability', () => {
    const snap = applyDelta(
      { onHandQty: 0, reservedQty: 0, blockedQty: 0, availableQty: 0, averageCost: 0, totalCost: 0 },
      movementDelta('entry', 100, 10),
    );
    expect(snap.onHandQty).toBe(100);
    expect(snap.availableQty).toBe(100);
    expect(validateStockAvailability(snap, 'exit', 40, false)).toBeNull();
    expect(validateStockAvailability(snap, 'exit', 150, false)).toContain('insuficientes');
  });

  it('validates movement input', () => {
    expect(validateMovementInput({ movementType: 'entry', quantity: 0 })).toBeTruthy();
    expect(
      validateMovementInput({ movementType: 'entry', quantity: 10, toWarehouseId: 'w1' }),
    ).toBeNull();
    expect(
      validateMovementInput({ movementType: 'exit', quantity: 10 }),
    ).toContain('origen');
  });

  it('parses csv and generates keys', () => {
    const rows = parseCsvMovements('movementType,itemKey,quantity\nentry,ITEM-1,5\nexit,ITEM-1,1');
    expect(rows).toHaveLength(2);
    expect(generateMovementKey('entry', 1)).toContain('EMV-');
    expect(generateBatchKey()).toContain('BATCH-');
    expect(locationScope(null)).toBe('_');
  });

  it('handles concurrent independent validations', () => {
    const a = validateStockAvailability(
      { onHandQty: 10, reservedQty: 0, blockedQty: 0, availableQty: 10, averageCost: 1, totalCost: 10 },
      'exit',
      5,
      false,
    );
    const b = validateStockAvailability(
      { onHandQty: 2, reservedQty: 0, blockedQty: 0, availableQty: 2, averageCost: 1, totalCost: 2 },
      'exit',
      5,
      false,
    );
    expect(a).toBeNull();
    expect(b).toBeTruthy();
  });
});
