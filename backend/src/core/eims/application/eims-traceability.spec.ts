import {
  allocateParentCost,
  buildGenealogyTree,
  collectAncestryKeys,
  computeExpiryDate,
  daysToExpiry,
  expiryAlertSeverity,
  generateLotBarcode,
  generateLotKey,
  generateLotQrCode,
  isExpired,
  resolveLotStatusAfterQty,
  shouldBlockExpiredLot,
  validateTransformInput,
} from '../domain/eims-traceability.engine';

describe('EIMS TraceabilityEngine', () => {
  it('generates unique lot codes', () => {
    const lotKey = generateLotKey('CAF-PERG-001');
    expect(lotKey).toContain('LOT-CAF-PERG-001');
    expect(generateLotQrCode(lotKey, 'CAF-PERG-001')).toContain('CAF-PERG-001');
    expect(generateLotBarcode(lotKey, 'CAF-PERG-001').length).toBeGreaterThan(4);
  });

  it('computes expiry and alerts', () => {
    const now = new Date('2026-07-03');
    expect(daysToExpiry('2026-07-10', now)).toBe(7);
    expect(expiryAlertSeverity(7)).toBe('critical');
    expect(expiryAlertSeverity(20)).toBe('warning');
    expect(expiryAlertSeverity(45)).toBe('info');
    expect(isExpired('2026-07-01', now)).toBe(true);
    expect(shouldBlockExpiredLot('available', '2026-07-01', true, now)).toBe(true);
    expect(shouldBlockExpiredLot('available', '2026-07-01', false, now)).toBe(false);
    const expiry = computeExpiryDate('2026-01-01', 30);
    expect(expiry.toISOString().slice(0, 10)).toBe('2026-01-31');
  });

  it('resolves lot status from quantities', () => {
    expect(resolveLotStatusAfterQty(0, 0, 0)).toBe('closed');
    expect(resolveLotStatusAfterQty(10, 2, 0)).toBe('reserved');
    expect(resolveLotStatusAfterQty(10, 0, 2)).toBe('blocked');
    expect(resolveLotStatusAfterQty(10, 0, 0, '2020-01-01')).toBe('expired');
    expect(resolveLotStatusAfterQty(10, 0, 0, null, 'quarantined')).toBe('quarantined');
  });

  it('validates transformations', () => {
    expect(
      validateTransformInput({
        transformType: 'split',
        parents: [{ lotKey: 'A', quantity: 10 }],
        children: [
          { quantity: 4 },
          { quantity: 6 },
        ],
      }),
    ).toBeNull();
    expect(
      validateTransformInput({
        transformType: 'split',
        parents: [
          { lotKey: 'A', quantity: 5 },
          { lotKey: 'B', quantity: 5 },
        ],
        children: [{ quantity: 10 }],
      }),
    ).toContain('único');
    expect(
      validateTransformInput({
        transformType: 'merge',
        parents: [{ lotKey: 'A', quantity: 5 }],
        children: [{ quantity: 5 }],
      }),
    ).toContain('dos');
    expect(
      validateTransformInput({
        transformType: 'mix',
        parents: [
          { lotKey: 'A', quantity: 5 },
          { lotKey: 'B', quantity: 5 },
        ],
        children: [{ lotKey: 'A', quantity: 10 }],
      }),
    ).toContain('destino');
  });

  it('builds genealogy and ancestry', () => {
    const tree = buildGenealogyTree('C', [
      { parentLotKey: 'A', childLotKey: 'B', transformType: 'split', quantity: 5 },
      { parentLotKey: 'B', childLotKey: 'C', transformType: 'repack', quantity: 5 },
      { parentLotKey: 'C', childLotKey: 'D', transformType: 'split', quantity: 2 },
    ]);
    expect(tree.lotKey).toBe('C');
    expect(tree.parents[0]?.lotKey).toBe('B');
    expect(tree.parents[0]?.parents[0]?.lotKey).toBe('A');
    expect(tree.children[0]?.lotKey).toBe('D');
    const keys = collectAncestryKeys(tree);
    expect(keys).toEqual(expect.arrayContaining(['A', 'B', 'C', 'D']));
  });

  it('allocates parent cost to children', () => {
    const cost = allocateParentCost(
      [
        { quantity: 60, unitCost: 10, accumulatedCost: 600 },
        { quantity: 40, unitCost: 20, accumulatedCost: 800 },
      ],
      50,
      100,
    );
    expect(cost.accumulatedCost).toBe(700);
    expect(cost.unitCost).toBe(14);
  });

  it('handles concurrent-like genealogy depth without cycles', () => {
    const links = Array.from({ length: 100 }, (_, i) => ({
      parentLotKey: `L${i}`,
      childLotKey: `L${i + 1}`,
      transformType: 'split' as const,
      quantity: 1,
    }));
    const tree = buildGenealogyTree('L50', links, 20);
    expect(collectAncestryKeys(tree).length).toBeGreaterThan(10);
  });
});
