import {
  applyMovementToBalances,
  buildKardexDelta,
  computeAverageCost,
  generateInventoryLotKey,
  generateLotCodes,
  generateMovementKey,
} from '../domain/inventory.engine';

describe('CPEP InventoryEngine', () => {
  it('generates lot keys and codes', () => {
    const key = generateInventoryLotKey('RCP-001');
    expect(key.startsWith('LOT-INV-')).toBe(true);
    const codes = generateLotCodes(key);
    expect(codes.qrCode).toContain('CPEP-INV:');
    expect(codes.barcode.length).toBeGreaterThan(0);
    expect(generateMovementKey(key, 'entry', 1)).toContain('MOV-ENTRY');
  });

  it('computes weighted average cost', () => {
    expect(computeAverageCost(100, 10, 100, 20)).toBe(15);
    expect(computeAverageCost(0, 0, 50, 12)).toBe(12);
  });

  it('applies entry reservation block and release balances', () => {
    const entry = applyMovementToBalances(0, 0, 0, 'entry', 1000);
    expect(entry.availableKg).toBe(1000);
    const reserved = applyMovementToBalances(1000, 0, 0, 'reservation', 200);
    expect(reserved.availableKg).toBe(800);
    expect(reserved.reservedKg).toBe(200);
    const blocked = applyMovementToBalances(800, 200, 0, 'block', 100);
    expect(blocked.blockedKg).toBe(100);
    const released = applyMovementToBalances(700, 200, 100, 'release', 50);
    expect(released.availableKg).toBe(750);
  });

  it('builds kardex deltas for entry and exit', () => {
    const entry = buildKardexDelta(0, 0, 'entry', 100, 10, 10);
    expect(entry.entryKg).toBe(100);
    expect(entry.balanceKg).toBe(100);
    expect(entry.balanceCost).toBe(1000);
    const exit = buildKardexDelta(100, 1000, 'exit', 40, 10, 10);
    expect(exit.exitKg).toBe(40);
    expect(exit.balanceKg).toBe(60);
  });

  it('handles concurrent balance calculations independently', () => {
    const a = applyMovementToBalances(500, 0, 0, 'exit', 100);
    const b = applyMovementToBalances(500, 0, 0, 'entry', 100);
    expect(a.availableKg).toBe(400);
    expect(b.availableKg).toBe(600);
  });
});
