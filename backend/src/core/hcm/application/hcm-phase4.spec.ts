import {
  buildPeriodCode,
  calculatePayslip,
  computeGarnishmentAmount,
  computeNoveltyAmount,
  computeProvisionAmount,
  computeSettlementBreakdown,
  computeWithholdingTax,
  DEFAULT_PY_CONCEPTS,
  generatePyKey,
  mapNoveltyToConceptCode,
  mergeBulkPayslipResults,
  qualifiesTransportAllowance,
  roundMoney,
  validatePayrollRunConcurrency,
} from '../domain/hcm-payroll.engine';

describe('HCM Payroll Engine — Fase 4', () => {
  it('generates PY keys', () => {
    expect(generatePyKey('RUN', 1)).toBe('RUN-00000001');
  });

  it('builds period code', () => {
    expect(buildPeriodCode(2026, 7, 'monthly')).toBe('2026-07');
  });

  it('qualifies transport allowance', () => {
    expect(qualifiesTransportAllowance(2000000, 1300000)).toBe(true);
    expect(qualifiesTransportAllowance(3000000, 1300000)).toBe(false);
  });

  it('maps novelty to concept code', () => {
    expect(mapNoveltyToConceptCode('overtime')).toBe('HEX');
    expect(mapNoveltyToConceptCode('night_surcharge')).toBe('RN');
  });

  it('computes novelty amount', () => {
    const amount = computeNoveltyAmount(2400000, { noveltyType: 'overtime', hours: 2, multiplier: 1.25 });
    expect(amount).toBeGreaterThan(0);
  });

  it('computes withholding tax', () => {
    expect(computeWithholdingTax(5000000, 47065)).toBeGreaterThan(0);
    expect(computeWithholdingTax(1000000, 47065)).toBe(0);
  });

  it('computes garnishment amount', () => {
    expect(computeGarnishmentAmount(1000000, { garnishmentType: 'loan', percentage: 10 })).toBe(100000);
    expect(computeGarnishmentAmount(1000000, { garnishmentType: 'judicial', fixedAmount: 200000 })).toBe(200000);
  });

  it('computes provision amount', () => {
    expect(computeProvisionAmount(3000000, 0.0833)).toBe(249900);
  });

  it('calculates full payslip', () => {
    const concepts = DEFAULT_PY_CONCEPTS.map((c) => ({ ...c }));
    const result = calculatePayslip({
      baseSalary: 2000000,
      workedDays: 30,
      periodDays: 30,
      smmlv: 1300000,
      transportAllowance: 162000,
      uvt: 47065,
      concepts,
      novelties: [{ noveltyType: 'overtime', hours: 4, multiplier: 1.25 }],
    });
    expect(result.baseSalary).toBe(2000000);
    expect(result.totalEarnings).toBeGreaterThan(result.baseSalary);
    expect(result.netPay).toBeLessThan(result.totalEarnings);
    expect(result.lines.some((l) => l.conceptCode === 'SAL')).toBe(true);
    expect(result.lines.some((l) => l.conceptCode === 'AUXT')).toBe(true);
  });

  it('calculates settlement breakdown', () => {
    const breakdown = computeSettlementBreakdown({
      baseSalary: 3000000,
      hireDate: new Date('2024-01-01'),
      terminationDate: new Date('2026-07-01'),
      smmlv: 1300000,
      transportAllowance: 162000,
      pendingVacationDays: 5,
      concepts: DEFAULT_PY_CONCEPTS.map((c) => ({ ...c })),
    });
    expect(breakdown.totalNet).toBeGreaterThan(0);
    expect(breakdown.lines.length).toBeGreaterThanOrEqual(3);
  });

  it('validates payroll run concurrency', () => {
    expect(validatePayrollRunConcurrency(0).valid).toBe(true);
    expect(validatePayrollRunConcurrency(2).valid).toBe(false);
  });

  it('merges bulk payslip results', () => {
    const merged = mergeBulkPayslipResults([
      { employeeKey: 'E1' },
      { employeeKey: 'E1' },
      { employeeKey: 'E2' },
    ]);
    expect(merged).toHaveLength(2);
  });

  it('rounds money', () => {
    expect(roundMoney(1234.567)).toBe(1234.57);
  });
});
