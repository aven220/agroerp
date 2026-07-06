import {
  buildKardexLine,
  compareValuationMethods,
  computeWeightedAverage,
  consumeLayers,
  periodBounds,
  resolveValuationMethod,
} from '../domain/eims-valuation.engine';

describe('EIMS ValuationEngine', () => {
  it('resolves valuation methods', () => {
    expect(resolveValuationMethod('fifo', 'average')).toBe('fifo');
    expect(resolveValuationMethod(null, 'lifo')).toBe('lifo');
    expect(resolveValuationMethod('unknown', null)).toBe('average');
  });

  it('computes weighted average', () => {
    const r = computeWeightedAverage(100, 1000, 100, 20);
    expect(r.balanceQty).toBe(200);
    expect(r.averageCost).toBe(15);
  });

  it('consumes fifo and lifo layers differently', () => {
    const layers = [
      { layerKey: 'a', remainingQty: 10, unitCost: 10, receivedAt: new Date('2026-01-01') },
      { layerKey: 'b', remainingQty: 10, unitCost: 20, receivedAt: new Date('2026-02-01') },
    ];
    const fifo = consumeLayers(layers, 10, 'fifo');
    const lifo = consumeLayers(layers, 10, 'lifo');
    expect(fifo.unitCost).toBe(10);
    expect(lifo.unitCost).toBe(20);
  });

  it('builds kardex lines for entry and exit', () => {
    const entry = buildKardexLine({
      previousBalanceQty: 0,
      previousBalanceCost: 0,
      entryQty: 100,
      exitQty: 0,
      movementUnitCost: 12,
      valuationMethod: 'average',
    });
    expect(entry.balanceQty).toBe(100);
    expect(entry.balanceCost).toBe(1200);
    const exit = buildKardexLine({
      previousBalanceQty: 100,
      previousBalanceCost: 1200,
      entryQty: 0,
      exitQty: 40,
      movementUnitCost: 12,
      valuationMethod: 'average',
    });
    expect(exit.balanceQty).toBe(60);
    expect(exit.balanceCost).toBe(720);
  });

  it('compares valuation methods', () => {
    const result = compareValuationMethods({
      previousQty: 10,
      previousCost: 100,
      entryQty: 10,
      entryUnitCost: 20,
      exitQty: 5,
      layers: [{ layerKey: 'a', remainingQty: 10, unitCost: 10, receivedAt: new Date('2026-01-01') }],
    });
    expect(result.average.exitUnitCost).toBeGreaterThan(0);
    expect(result.fifo.exitTotalCost).toBeGreaterThan(0);
    expect(result.lifo.exitTotalCost).toBeGreaterThan(0);
  });

  it('builds period bounds for closes', () => {
    const daily = periodBounds('daily', new Date('2026-07-03T12:00:00'));
    expect(daily.periodKey).toContain('D-2026-07-03');
    const monthly = periodBounds('monthly', new Date('2026-07-03'));
    expect(monthly.periodKey).toContain('M-2026-07');
    const yearly = periodBounds('yearly', new Date('2026-07-03'));
    expect(yearly.periodKey).toBe('Y-2026');
  });
});
