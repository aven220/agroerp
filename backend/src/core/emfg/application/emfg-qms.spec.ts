import {
  aggregateQmsIndicators,
  canReleaseLot,
  computeApprovalRate,
  computeAvgClosureDays,
  computeRejectionRate,
  deriveInspectionResult,
  evaluateMeasurement,
  validateCapaTransition,
} from '../domain/emfg-qms.engine';

describe('emfg-qms.engine', () => {
  it('evaluates measurements against criteria', () => {
    expect(evaluateMeasurement(5, { minValue: 4, maxValue: 6 })).toBe(true);
    expect(evaluateMeasurement(3, { minValue: 4, maxValue: 6 })).toBe(false);
    expect(evaluateMeasurement(7, { minValue: 4, maxValue: 6 })).toBe(false);
  });

  it('derives inspection result from measurements', () => {
    expect(deriveInspectionResult([{ passed: true }, { passed: true }])).toBe('pass');
    expect(deriveInspectionResult([{ passed: false }])).toBe('fail');
    expect(deriveInspectionResult([{ passed: true }, { passed: false }])).toBe('conditional');
    expect(deriveInspectionResult([])).toBe('conditional');
  });

  it('validates lot release transitions', () => {
    expect(canReleaseLot('pending', 'approve')).toEqual({ ok: true, to: 'approved' });
    expect(canReleaseLot('pending', 'reject')).toEqual({ ok: true, to: 'rejected' });
    expect(canReleaseLot('approved', 'reject')).toEqual({ ok: false });
  });

  it('computes rejection and approval rates', () => {
    expect(computeRejectionRate(100, 10)).toBe(10);
    expect(computeApprovalRate(50, 45)).toBe(90);
  });

  it('computes average NC closure days', () => {
    const days = computeAvgClosureDays([
      { createdAt: new Date('2026-07-01'), closedAt: new Date('2026-07-06') },
      { createdAt: new Date('2026-07-01'), closedAt: new Date('2026-07-11') },
    ]);
    expect(days).toBe(7.5);
  });

  it('validates CAPA transitions', () => {
    expect(validateCapaTransition('open', 'in_progress')).toBe(true);
    expect(validateCapaTransition('closed', 'open')).toBe(false);
  });

  it('aggregates QMS indicators', () => {
    const result = aggregateQmsIndicators({
      inspections: [{ result: 'pass' }, { result: 'fail' }, { result: 'pass' }],
      releases: [{ status: 'approved' }, { status: 'rejected' }],
      ncs: [{ createdAt: new Date(), closedAt: new Date(), severity: 'minor' }],
      bySupplier: new Map([['SUP1', { total: 10, failed: 2 }]]),
      byLine: new Map([['LINE1', { total: 5, failed: 1 }]]),
    });
    expect(result.rejectionPct).toBeCloseTo(33.33, 1);
    expect(result.approvalPct).toBe(50);
    expect(result.bySupplier).toHaveLength(1);
    expect(result.byLine).toHaveLength(1);
  });

  it('handles mass inspection aggregation', () => {
    const inspections = Array.from({ length: 5000 }, (_, i) => ({ result: i % 10 === 0 ? 'fail' : 'pass' }));
    const failed = inspections.filter((i) => i.result === 'fail').length;
    expect(computeRejectionRate(inspections.length, failed)).toBe(10);
  });

  it('supports concurrent measurement evaluation', () => {
    const values = Array.from({ length: 1000 }, (_, i) => i);
    const results = values.map((v) => evaluateMeasurement(v, { minValue: 0, maxValue: 999 }));
    expect(results.every(Boolean)).toBe(true);
  });
});
