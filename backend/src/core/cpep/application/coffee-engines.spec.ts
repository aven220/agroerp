import { computeNetWeight, generateTicketCodes } from '../domain/weighing.engine';
import { computeSettlement, qualityAdjustments } from '../domain/settlement.engine';

describe('CPEP WeighingEngine', () => {
  it('computes net weight', () => {
    expect(computeNetWeight(1200, 200)).toBe(1000);
    expect(computeNetWeight(null, 200)).toBeNull();
  });

  it('generates qr and barcode', () => {
    const codes = generateTicketCodes('RCP-001');
    expect(codes.qrCode).toBe('CPEP:RCP-001');
    expect(codes.barcode).toContain('RCP');
  });
});

describe('CPEP SettlementEngine', () => {
  it('computes settlement totals', () => {
    const result = computeSettlement(1000, {
      basePricePerKg: 10,
      bonusesTotal: 100,
      penaltiesTotal: 50,
      paidAmount: 0,
    });
    expect(result.subtotal).toBe(10050);
    expect(result.paymentStatus).toBe('pending');
  });

  it('applies quality adjustments', () => {
    const adj = qualityAdjustments('premium', 13, 90);
    expect(adj.bonus).toBeGreaterThan(0);
    expect(adj.penalty).toBeGreaterThan(0);
  });
});
