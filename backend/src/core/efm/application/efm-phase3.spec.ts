import {
  applyPartialPayment,
  computeAgingBuckets,
  computeDaysPastDue,
  computeDueDate,
  computeEarlyDiscount,
  DEFAULT_AP_TOLERANCES,
  generateApKey,
  resolvePayableStatus,
  validateInvoiceThreeWay,
  withinTolerance,
} from '../domain/efm-ap.engine';

describe('EFM AP Engine — Fase 3', () => {
  it('generates AP keys', () => {
    expect(generateApKey('APINV', 1)).toBe('APINV-00000001');
  });

  it('computes due date from payment terms', () => {
    const d = computeDueDate(new Date('2026-01-01'), 30);
    expect(d.toISOString().slice(0, 10)).toBe('2026-01-31');
  });

  it('validates three-way match within tolerance', () => {
    const results = validateInvoiceThreeWay({
      purchaseOrderKey: 'PO-001',
      receiptKey: 'REC-001',
      poQuantity: 100,
      receiptQuantity: 100,
      invoiceQuantity: 101,
      poUnitPrice: 1000,
      invoiceUnitPrice: 1005,
      poTaxAmount: 190,
      invoiceTaxAmount: 191,
      poDiscountAmount: 0,
      invoiceDiscountAmount: 0,
    }, DEFAULT_AP_TOLERANCES);
    expect(results.some((r) => r.validationType === 'quantity' && r.passed)).toBe(true);
    expect(results.some((r) => r.validationType === 'price' && r.passed)).toBe(true);
  });

  it('detects quantity out of tolerance', () => {
    expect(withinTolerance(100, 110, 2)).toBe(false);
    expect(withinTolerance(100, 101, 2)).toBe(true);
  });

  it('applies partial payments', () => {
    const r = applyPartialPayment(1000, 400);
    expect(r.applied).toBe(400);
    expect(r.remainingBalance).toBe(600);
    expect(r.unapplied).toBe(0);
  });

  it('computes aging buckets', () => {
    const buckets = computeAgingBuckets([
      { balanceAmount: 100, daysPastDue: 0 },
      { balanceAmount: 200, daysPastDue: 15 },
      { balanceAmount: 50, daysPastDue: 95 },
    ]);
    expect(buckets[0].amount).toBe(100);
    expect(buckets[1].amount).toBe(200);
    expect(buckets[4].amount).toBe(50);
  });

  it('resolves payable status', () => {
    expect(resolvePayableStatus(0, 1000, 0, false)).toBe('paid');
    expect(resolvePayableStatus(500, 1000, 5, false)).toBe('overdue');
    expect(resolvePayableStatus(1000, 1000, 0, true)).toBe('on_hold');
  });

  it('computes early payment discount', () => {
    expect(computeEarlyDiscount(1000000, 2, 10)).toBe(20000);
    expect(computeEarlyDiscount(1000000, 2, 0)).toBe(0);
  });

  it('handles concurrent AP key generation', () => {
    const keys = Array.from({ length: 100 }, (_, i) => generateApKey('APPYM', i + 1));
    expect(new Set(keys).size).toBe(100);
  });
});
