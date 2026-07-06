import {
  buildPeriodKey,
  computeAvailableBudget,
  computeVariance,
  distributeAnnualToMonthly,
  generateBgKey,
  projectClosing,
  validateBudgetAvailability,
} from '../domain/efm-budget.engine';

describe('EFM Budget Engine — Fase 6', () => {
  it('generates budget keys', () => {
    expect(generateBgKey('BGT', 1)).toBe('BGT-00000001');
  });

  it('computes available budget', () => {
    const result = computeAvailableBudget({
      budgetAmount: 100000,
      committed: 20000,
      obligated: 15000,
      executed: 30000,
      reserved: 5000,
    });
    expect(result.available).toBe(30000);
    expect(result.utilizationPct).toBe(70);
  });

  it('validates budget availability with tolerance', () => {
    expect(validateBudgetAvailability(10000, 9500, 5).allowed).toBe(true);
    expect(validateBudgetAvailability(10000, 11000, 0).allowed).toBe(false);
    expect(validateBudgetAvailability(10000, 11000, 0).shortfall).toBe(1000);
  });

  it('computes variance and compliance', () => {
    const v = computeVariance(100000, 45000, 10000, 5000);
    expect(v.variance).toBe(40000);
    expect(v.compliancePct).toBe(45);
  });

  it('distributes annual to monthly', () => {
    const months = distributeAnnualToMonthly(1200000, 12);
    expect(months).toHaveLength(12);
    expect(months.reduce((s, m) => s + m, 0)).toBe(1200000);
  });

  it('builds period keys', () => {
    expect(buildPeriodKey(2026, 3)).toBe('2026-03');
  });

  it('projects closing', () => {
    const p = projectClosing(1200000, 300000, 90, 365);
    expect(p.projectedExecution).toBeGreaterThan(300000);
    expect(p.projectedVariance).toBeLessThan(900000);
  });

  it('handles concurrent budget keys', () => {
    const keys = Array.from({ length: 100 }, (_, i) => generateBgKey('BGT', i + 1));
    expect(new Set(keys).size).toBe(100);
  });

  it('detects over-execution scenario', () => {
    const availability = computeAvailableBudget({
      budgetAmount: 50000,
      committed: 10000,
      obligated: 10000,
      executed: 25000,
      reserved: 5000,
    });
    const check = validateBudgetAvailability(availability.available, 15000, 0);
    expect(check.allowed).toBe(false);
  });
});
