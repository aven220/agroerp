import {
  applySubstitutionQty,
  autoScheduleOperations,
  canTransitionOrderStatus,
  computeAvailableCapacity,
  computeCapacityLoadFactor,
  computeComponentQty,
  computeOperationMinutes,
  detectScheduleConflicts,
  generateEmfgKey,
  isCapacityOverloaded,
  validateOrderRelease,
} from '../domain/emfg-manufacturing.engine';

describe('emfg-manufacturing.engine', () => {
  it('generates keys', () => {
    expect(generateEmfgKey('PO', 1)).toBe('PO-000001');
  });

  it('computes component qty with yield and scrap', () => {
    expect(computeComponentQty(100, 1.2, 98, 100, 2)).toBeGreaterThan(120);
  });

  it('computes operation minutes', () => {
    expect(computeOperationMinutes(10, 30, 1.5)).toBe(45);
  });

  it('computes capacity metrics', () => {
    expect(computeAvailableCapacity(160, 40)).toBe(120);
    expect(computeCapacityLoadFactor(80, 160)).toBe(50);
    expect(isCapacityOverloaded(110)).toBe(true);
  });

  it('detects schedule overlaps', () => {
    const start = new Date('2026-07-05T08:00:00Z');
    const mid = new Date('2026-07-05T10:00:00Z');
    const end = new Date('2026-07-05T12:00:00Z');
    const conflicts = detectScheduleConflicts(
      [
        { scheduleKey: 'S1', workCenterKey: 'WC1', startAt: start, endAt: mid, loadMinutes: 120 },
        { scheduleKey: 'S2', workCenterKey: 'WC1', startAt: new Date('2026-07-05T09:00:00Z'), endAt: end, loadMinutes: 180 },
      ],
      { WC1: 480 },
    );
    expect(conflicts.some((c) => c.conflictType === 'overlap')).toBe(true);
  });

  it('auto schedules operations sequentially', () => {
    const start = new Date('2026-07-05T08:00:00Z');
    const slots = autoScheduleOperations(
      [
        { orderOpKey: 'O1', workCenterKey: 'WC1', runMinutes: 60, sequence: 10 },
        { orderOpKey: 'O2', workCenterKey: 'WC1', runMinutes: 30, sequence: 20 },
      ],
      start,
    );
    expect(slots).toHaveLength(2);
    expect(slots[1].startAt.getTime()).toBeGreaterThanOrEqual(slots[0].endAt.getTime());
  });

  it('validates order release', () => {
    expect(validateOrderRelease('draft', 100, 2)).toEqual([]);
    expect(validateOrderRelease('released', 100, 2)).toContain('invalid_status');
  });

  it('validates status transitions', () => {
    expect(canTransitionOrderStatus('draft', 'planned')).toBe(true);
    expect(canTransitionOrderStatus('closed', 'draft')).toBe(false);
  });

  it('applies substitution factor', () => {
    expect(applySubstitutionQty(10, 1.5)).toBe(15);
  });
});
