import {
  absenteeismRate,
  averageTenureYears,
  averageTimeToHire,
  bucketSeries,
  buildAiStubInsight,
  distributionBy,
  loadVolumeScore,
  monthKey,
  monthsInRange,
  orgPyramid,
  resolveDateRange,
  rotationRate,
  tenureYears,
  timeToHireDays,
} from '../domain/hpa-analytics.engine';

describe('HPA Analytics Engine', () => {
  it('computes tenure and averages', () => {
    expect(tenureYears('2020-01-01', new Date('2026-01-01'))).toBeGreaterThan(5);
    expect(averageTenureYears(['2020-01-01', '2022-01-01'])).toBeGreaterThan(0);
  });

  it('computes time to hire and rates', () => {
    expect(timeToHireDays('2026-01-01', '2026-01-31')).toBe(30);
    expect(averageTimeToHire([{ openedAt: '2026-01-01', filledAt: '2026-01-16' }])).toBe(15);
    expect(rotationRate(5, 100)).toBe(5);
    expect(absenteeismRate(10, 200)).toBe(5);
  });

  it('builds series and distributions', () => {
    expect(monthKey('2026-07-04T00:00:00Z')).toBe('2026-07');
    const months = monthsInRange(new Date('2026-01-01'), new Date('2026-02-01'));
    expect(months).toEqual(['2026-01', '2026-02']);
    expect(bucketSeries(months, [{ at: '2026-01-10' }, { at: '2026-02-01' }])[0].value).toBe(1);
    expect(distributionBy([{ key: 'A' }, { key: 'A' }, { key: null }])).toHaveLength(2);
    expect(orgPyramid([{ level: 'L1' }, { level: 'L1' }, { level: 'L2' }])[0].count).toBe(2);
  });

  it('builds AI stub insights and load score', () => {
    const insight = buildAiStubInsight('resignation_risk', 'E1');
    expect(insight.status).toBe('ready_for_external_model');
    expect(insight.payload.requiresExternalModel).toBe(true);
    expect(loadVolumeScore(100).ok).toBe(true);
    expect(resolveDateRange('2026-01-01', '2026-06-01').from.toISOString().startsWith('2026-01')).toBe(true);
  });
});
