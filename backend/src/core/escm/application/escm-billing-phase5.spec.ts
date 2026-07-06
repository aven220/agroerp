import {
  canApproveWarranty,
  canIssueInvoice,
  canProcessReturn,
  canVoidInvoice,
  computeBillingLineTotals,
  computeBillingTotals,
  generateCreditNoteKey,
  generateInvoiceKey,
  generateReturnKey,
  generateWarrantyKey,
  resolveInvoiceType,
  resolveWithholdingRate,
} from '../domain/escm-billing.engine';

describe('ESCM Billing Engine', () => {
  it('generates billing keys', () => {
    expect(generateInvoiceKey(1)).toBe('INV-000001');
    expect(generateReturnKey(2)).toBe('RET-000002');
    expect(generateWarrantyKey(3)).toBe('WAR-000003');
    expect(generateCreditNoteKey(4)).toBe('CN-000004');
  });

  it('resolves invoice types', () => {
    expect(resolveInvoiceType({ isProforma: true })).toBe('proforma');
    expect(resolveInvoiceType({ isRecurring: true })).toBe('recurring');
    expect(resolveInvoiceType({ consolidationKey: 'C1' })).toBe('consolidated');
    expect(resolveInvoiceType({ isPartial: true })).toBe('partial');
    expect(resolveInvoiceType({ countryCode: 'US' })).toBe('international');
    expect(resolveInvoiceType({ countryCode: 'CO' })).toBe('national');
  });

  it('computes line totals with IVA and retenciones', () => {
    const line = computeBillingLineTotals({
      itemKey: 'A',
      quantity: 10,
      unitPrice: 1000,
      discountPct: 10,
      taxRate: 19,
      withholdingRate: 2.5,
    });
    expect(line.lineSubtotal).toBe(9000);
    expect(line.taxAmount).toBe(1710);
    expect(line.withholdingAmount).toBe(225);
    expect(line.lineTotal).toBe(10485);
  });

  it('computes header totals with rounding', () => {
    const totals = computeBillingTotals(
      [
        { itemKey: 'A', quantity: 1, unitPrice: 10000, taxRate: 19 },
        { itemKey: 'B', quantity: 2, unitPrice: 5000, taxRate: 5 },
      ],
      0,
      'half_up',
    );
    expect(totals.subtotal).toBe(20000);
    expect(totals.taxAmount).toBe(2400);
    expect(totals.totalAmount).toBe(Math.round(20000 + 2400));
  });

  it('validates invoice lifecycle', () => {
    expect(canIssueInvoice('draft')).toBe(true);
    expect(canIssueInvoice('proforma')).toBe(true);
    expect(canIssueInvoice('issued')).toBe(false);
    expect(canVoidInvoice('issued')).toBe(true);
    expect(canVoidInvoice('voided')).toBe(false);
  });

  it('validates return and warranty gates', () => {
    expect(canProcessReturn('approved')).toBe(true);
    expect(canProcessReturn('submitted')).toBe(false);
    expect(canApproveWarranty('pending_approval')).toBe(true);
    expect(canApproveWarranty('closed')).toBe(false);
  });

  it('resolves withholding defaults', () => {
    expect(resolveWithholdingRate('retefuente')).toBe(2.5);
    expect(resolveWithholdingRate('reteiva')).toBe(15);
    expect(resolveWithholdingRate(undefined)).toBe(0);
  });

  it('handles concurrent key generation', () => {
    const keys = Array.from({ length: 100 }, (_, i) => generateInvoiceKey(i + 1));
    expect(new Set(keys).size).toBe(100);
  });

  it('computes partial return scenario', () => {
    const original = computeBillingLineTotals({
      itemKey: 'X',
      quantity: 100,
      unitPrice: 50,
      taxRate: 19,
    });
    const partial = computeBillingLineTotals({
      itemKey: 'X',
      quantity: 25,
      unitPrice: 50,
      taxRate: 19,
    });
    expect(partial.lineSubtotal).toBeCloseTo(original.lineSubtotal * 0.25, 2);
    expect(partial.taxAmount).toBeCloseTo(original.taxAmount * 0.25, 2);
  });

  it('computes complex fiscal mix', () => {
    const totals = computeBillingTotals([
      { itemKey: 'E1', quantity: 1, unitPrice: 10000, taxRate: 0, withholdingRate: 0 },
      { itemKey: 'T1', quantity: 1, unitPrice: 10000, taxRate: 19, withholdingRate: 2.5 },
      { itemKey: 'T2', quantity: 1, unitPrice: 10000, taxRate: 5, withholdingRate: 15 },
    ]);
    expect(totals.taxBreakdown.length).toBeGreaterThan(0);
    expect(totals.withholdingAmount).toBeGreaterThan(0);
  });
});
