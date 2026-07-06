import {
  applyRounding,
  computeSettlement,
  generatePaymentKey,
  generateSettlementKey,
  qualityAdjustments,
  qualityPriceMultiplier,
  validatePaymentAmount,
} from '../domain/settlement.engine';

describe('CPEP SettlementEngine', () => {
  it('computes settlement totals with quality price', () => {
    const result = computeSettlement(1000, {
      basePricePerKg: 10000,
      qualityGrade: 'premium',
      humidityPct: 11,
      factor: 93,
      transportTotal: 50000,
      advancesTotal: 100000,
      taxRatePct: 0,
      withholdingPct: 1.5,
    });
    expect(result.appliedPricePerKg).toBe(10400);
    expect(result.bonusesTotal).toBeGreaterThan(0);
    expect(result.totalAmount).toBeGreaterThan(0);
    expect(result.netPayable).toBe(result.totalAmount);
    expect(result.lines.some((l) => l.kind === 'bonus')).toBe(true);
  });

  it('applies rounding modes', () => {
    expect(applyRounding(10.4, 'nearest', 0)).toBe(10);
    expect(applyRounding(10.6, 'nearest', 0)).toBe(11);
    expect(applyRounding(10.1, 'up', 0)).toBe(11);
    expect(applyRounding(10.9, 'down', 0)).toBe(10);
    expect(applyRounding(10.55, 'none', 0)).toBe(10.55);
  });

  it('builds detailed bonus and penalty lines', () => {
    const adj = qualityAdjustments('excelso', 13, 95);
    expect(adj.bonusLines.length).toBeGreaterThan(0);
    expect(adj.penaltyLines.length).toBeGreaterThan(0);
    expect(adj.bonus).toBeGreaterThan(adj.penalty);
  });

  it('validates payment amounts', () => {
    expect(validatePaymentAmount(-1, 100, 'cash')).toBeTruthy();
    expect(validatePaymentAmount(150, 100, 'cash')).toBeTruthy();
    expect(validatePaymentAmount(50, 100, 'cash')).toBeNull();
    expect(validatePaymentAmount(150, 100, 'partial')).toBeNull();
  });

  it('generates keys', () => {
    expect(generateSettlementKey('RCP-1')).toBe('LIQ-RCP-1');
    expect(generatePaymentKey('LIQ-RCP-1', 2)).toContain('002');
  });

  it('maps quality multipliers', () => {
    expect(qualityPriceMultiplier('excelso')).toBeGreaterThan(1);
    expect(qualityPriceMultiplier('pasilla')).toBeLessThan(1);
  });

  it('handles concurrent independent simulations', () => {
    const a = computeSettlement(1000, { basePricePerKg: 10, bonusesTotal: 100 });
    const b = computeSettlement(500, { basePricePerKg: 10, penaltiesTotal: 50 });
    expect(a.totalAmount).toBe(10100);
    expect(b.totalAmount).toBe(4950);
  });
});
