import {
  ALERT_TYPES,
  bucketByDate,
  computeAverage,
  computeConversionRate,
  computeGoalCompliance,
  dayRange,
  detectAnomaly,
  formatExport,
  generateCustomReportKey,
  generateOpsAlertKey,
  generateReportRunKey,
  generateSalesTargetKey,
  monthRange,
  previousPeriod,
  toCsv,
  toExcelCsv,
  toSimplePdf,
} from '../domain/escm-analytics.engine';

describe('ESCM Analytics Engine — Fase 7', () => {
  it('generates analytics keys', () => {
    expect(generateOpsAlertKey(1)).toBe('OPS-ALT-000001');
    expect(generateReportRunKey(2)).toBe('RPT-RUN-000002');
    expect(generateCustomReportKey(3)).toBe('CRPT-000003');
    expect(generateSalesTargetKey(4)).toBe('TGT-000004');
  });

  it('computes conversion and goal compliance', () => {
    expect(computeConversionRate(25, 100)).toBe(25);
    expect(computeGoalCompliance(80, 100)).toBe(80);
    expect(computeGoalCompliance(0, 0)).toBe(0);
  });

  it('computes averages', () => {
    expect(computeAverage([10, 20, 30])).toBe(20);
    expect(computeAverage([])).toBe(0);
  });

  it('buckets sales by date', () => {
    const points = bucketByDate(
      [{ date: new Date('2026-07-01'), value: 100 }, { date: new Date('2026-07-01'), value: 50 }],
      'day',
    );
    expect(points[0].value).toBe(150);
  });

  it('detects anomalies', () => {
    expect(detectAnomaly(500, [100, 110, 105, 95, 100], 30)).toBe(true);
    expect(detectAnomaly(102, [100, 110, 105, 95, 100], 30)).toBe(false);
  });

  it('defines period ranges', () => {
    const day = dayRange(new Date('2026-07-04T12:00:00Z'));
    expect(day.label).toBe('day');
    const month = monthRange(new Date('2026-07-04T12:00:00Z'));
    expect(month.label).toBe('month');
    const prev = previousPeriod(month);
    expect(prev.start.getTime()).toBeLessThan(month.start.getTime());
  });

  it('exports CSV excel and PDF', () => {
    const rows = [{ a: 1, b: 'x' }, { a: 2, b: 'y' }];
    const csv = toCsv(rows);
    expect(csv).toContain('a,b');
    expect(toExcelCsv(rows).startsWith('\uFEFF')).toBe(true);
    const pdf = toSimplePdf('Test', rows);
    expect(pdf.startsWith('%PDF')).toBe(true);
    expect(formatExport('csv', 'T', rows).mimeType).toBe('text/csv');
    expect(formatExport('excel', 'T', rows).extension).toBe('xls');
    expect(formatExport('pdf', 'T', rows).mimeType).toBe('application/pdf');
  });

  it('defines alert types', () => {
    expect(ALERT_TYPES.GOAL_MISSED).toBe('goal_missed');
    expect(ALERT_TYPES.OVERDUE_AR).toBe('overdue_ar');
  });
});
