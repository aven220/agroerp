import {
  aggregatePackTotals,
  aggregateWmsDashboard,
  canStoreAtLocation,
  computeBoxVolume,
  computeOccupancyPct,
  computePickVariance,
  computeReceiptVariance,
  generateEpscmWmsKey,
  groupPickTasksByZone,
  isFullDispatch,
  isPartialDispatch,
  sortPickTasksByPriority,
  suggestLocation,
} from '../domain/epscm-wms.engine';

describe('epscm-wms.engine', () => {
  it('generates WMS keys', () => {
    expect(generateEpscmWmsKey('LOC', 1)).toBe('LOC-000001');
  });

  it('computes occupancy', () => {
    expect(computeOccupancyPct(50, 100)).toBe(50);
    expect(computeOccupancyPct(10, 0)).toBe(100);
  });

  it('validates storage capacity', () => {
    expect(canStoreAtLocation(80, 100, 20)).toBe(true);
    expect(canStoreAtLocation(90, 100, 20)).toBe(false);
  });

  it('suggests location with lowest free space for fixed', () => {
    const suggested = suggestLocation(
      [
        { locationKey: 'L1', code: 'A', capacityQty: 100, occupiedQty: 90 },
        { locationKey: 'L2', code: 'B', capacityQty: 100, occupiedQty: 50 },
      ],
      5,
    );
    expect(suggested?.locationKey).toBe('L1');
  });

  it('computes variances', () => {
    expect(computePickVariance(10, 8)).toBe(-2);
    expect(computeReceiptVariance(100, 95)).toBe(-5);
  });

  it('computes box volume and pack totals', () => {
    expect(computeBoxVolume(2, 3, 4)).toBe(24);
    const totals = aggregatePackTotals([{ weight: 1.5, volume: 10 }, { weight: 2.5, volume: 20 }]);
    expect(totals.totalWeight).toBe(4);
    expect(totals.totalVolume).toBe(30);
  });

  it('detects partial and full dispatch', () => {
    expect(isPartialDispatch(10, 5)).toBe(true);
    expect(isFullDispatch(10, 10)).toBe(true);
    expect(isFullDispatch(10, 5)).toBe(false);
  });

  it('aggregates WMS dashboard', () => {
    const d = aggregateWmsDashboard({
      locationCount: 100,
      blockedLocations: 2,
      openPickTasks: 15,
      openTransfers: 3,
      pendingReceipts: 4,
      pendingDispatches: 5,
      crossDockPending: 1,
      occupancyAvgPct: 65.5,
    });
    expect(d.openPickTasks).toBe(15);
    expect(d.occupancyAvgPct).toBe(65.5);
  });

  it('sorts pick tasks by priority', () => {
    const sorted = sortPickTasksByPriority([
      { priority: 10, taskKey: 'B' },
      { priority: 90, taskKey: 'A' },
    ]);
    expect(sorted[0].taskKey).toBe('A');
  });

  it('groups pick tasks by zone', () => {
    const zoneMap = new Map([['LOC-1', 'Z-A']]);
    const groups = groupPickTasksByZone(
      [{ locationKey: 'LOC-1', taskKey: 'T1' } as never],
      zoneMap,
    );
    expect(groups.get('Z-A')?.length).toBe(1);
  });

  it('handles mass volume location suggestions', () => {
    const candidates = Array.from({ length: 5000 }, (_, i) => ({
      locationKey: `L${i}`,
      code: `C${i}`,
      capacityQty: 1000,
      occupiedQty: i % 500,
    }));
    const result = suggestLocation(candidates, 10);
    expect(result).not.toBeNull();
  });

  it('handles concurrent variance calculations', () => {
    const results = Array.from({ length: 1000 }, (_, i) => computePickVariance(i, i - 1));
    expect(results.every((r) => r === -1)).toBe(true);
  });
});
