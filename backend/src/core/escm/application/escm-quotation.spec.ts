import {
  canApproveQuotation,
  canConvertQuotation,
  computeLineTotals,
  computeQuotationTotals,
  generateOrderKey,
  generateQuotationKey,
} from '../domain/escm-quotation.engine';

describe('ESCM Quotation Engine', () => {
  const lines = [
    { itemKey: 'ITEM-A', quantity: 10, unitPrice: 1000, discountPct: 5, taxKey: 'iva_19' },
    { itemKey: 'ITEM-B', quantity: 2, unitPrice: 5000, taxKey: 'exempt' },
  ];

  it('computes line totals with tax', () => {
    const a = computeLineTotals(lines[0]);
    expect(a.lineSubtotal).toBe(9500);
    expect(a.taxAmount).toBeGreaterThan(0);
    expect(a.lineTotal).toBeGreaterThan(a.lineSubtotal);
  });

  it('computes quotation totals with header discount', () => {
    const totals = computeQuotationTotals(lines, 10);
    expect(totals.subtotal).toBeGreaterThan(0);
    expect(totals.discountAmount).toBeGreaterThan(0);
    expect(totals.totalAmount).toBeGreaterThan(0);
  });

  it('validates approve and convert states', () => {
    expect(canApproveQuotation('draft')).toBe(true);
    expect(canApproveQuotation('approved')).toBe(false);
    expect(canConvertQuotation('approved')).toBe(true);
    expect(canConvertQuotation('draft')).toBe(false);
  });

  it('generates keys', () => {
    expect(generateQuotationKey('GRP-000001', 2)).toContain('V2');
    expect(generateOrderKey(1)).toBe('ORD-000001');
  });

  it('handles concurrent total computation', () => {
    const results = Array.from({ length: 100 }, () => computeQuotationTotals(lines, 5));
    expect(results.every((t) => t.totalAmount > 0)).toBe(true);
  });
});
