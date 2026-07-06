import {
  averageScore,
  bucketByMonth,
  computeHeadcountEvolution,
  computeMonthlyRotation,
  countByKey,
  isClosedVacancyStatus,
  isInactiveEmployment,
  isOpenVacancyStatus,
  loadFactor,
  monthKey,
  monthsInRange,
  objectiveCompliance,
  resolveDateRange,
  trainingCompliance,
} from '../domain/hed-dashboard.engine';

describe('HCM Executive Dashboard Engine', () => {
  it('builds month keys and ranges', () => {
    expect(monthKey('2026-07-04T00:00:00Z')).toBe('2026-07');
    const months = monthsInRange(new Date('2026-01-01T00:00:00Z'), new Date('2026-03-01T00:00:00Z'));
    expect(months).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('counts by key and buckets by month', () => {
    expect(countByKey([{ d: 'A' }, { d: 'A' }, { d: 'B' }], (r) => r.d)).toEqual([
      { key: 'A', count: 2 },
      { key: 'B', count: 1 },
    ]);
    const buckets = bucketByMonth(
      [{ at: '2026-01-10' }, { at: '2026-01-20' }, { at: '2026-02-01' }],
      (r) => r.at,
      ['2026-01', '2026-02'],
    );
    expect(buckets[0].value).toBe(2);
    expect(buckets[1].value).toBe(1);
  });

  it('computes headcount evolution and rotation', () => {
    const months = ['2026-01', '2026-02'];
    const evolution = computeHeadcountEvolution(
      months,
      [{ month: '2026-01', value: 5 }, { month: '2026-02', value: 2 }],
      [{ month: '2026-01', value: 1 }, { month: '2026-02', value: 3 }],
      100,
    );
    expect(evolution[0].headcount).toBe(104);
    expect(evolution[1].headcount).toBe(103);
    const rotation = computeMonthlyRotation(months, [{ month: '2026-02', value: 3 }], evolution);
    expect(rotation[1].rate).toBeGreaterThan(0);
  });

  it('computes averages and compliance', () => {
    expect(averageScore([4, 5, null, 3])).toBe(4);
    expect(trainingCompliance(8, 10)).toBe(80);
    expect(objectiveCompliance(3, 4)).toBe(75);
  });

  it('classifies vacancy and employment statuses', () => {
    expect(isOpenVacancyStatus('open')).toBe(true);
    expect(isClosedVacancyStatus('filled')).toBe(true);
    expect(isInactiveEmployment('terminated')).toBe(true);
  });

  it('resolves date range and load factor', () => {
    const range = resolveDateRange('2026-01-01', '2026-06-30');
    expect(range.from.toISOString().startsWith('2026-01')).toBe(true);
    expect(loadFactor(10).ok).toBe(true);
  });
});
