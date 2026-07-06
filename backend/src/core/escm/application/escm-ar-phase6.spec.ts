import {
  autoAllocatePayment,
  canConfirmPayment,
  canVoidPayment,
  classifyRisk,
  computeAgingBuckets,
  computeCollectionProjection,
  computeDaysPastDue,
  computeDueDate,
  generatePaymentKey,
  generateReceivableKey,
  resolveReceivableStatus,
} from '../domain/escm-ar.engine';

describe('ESCM AR Engine', () => {
  it('generates AR keys', () => {
    expect(generateReceivableKey(1)).toBe('AR-000001');
    expect(generatePaymentKey(2)).toBe('PAY-000002');
  });

  it('computes days past due and status', () => {
    const due = new Date();
    due.setDate(due.getDate() - 10);
    expect(computeDaysPastDue(due)).toBeGreaterThanOrEqual(10);
    expect(resolveReceivableStatus(1000, 10)).toBe('overdue');
    expect(resolveReceivableStatus(0, 10)).toBe('paid');
  });

  it('classifies risk', () => {
    expect(classifyRisk(0, 1000)).toBe('low');
    expect(classifyRisk(45, 1000)).toBe('medium');
    expect(classifyRisk(95, 1000)).toBe('critical');
  });

  it('computes due date from payment terms', () => {
    const issued = new Date('2026-01-01T00:00:00Z');
    const due = computeDueDate(issued, 30);
    expect(due.getUTCDate()).toBe(31);
  });

  it('auto-allocates payment oldest first', () => {
    const d1 = new Date('2026-01-01');
    const d2 = new Date('2026-02-01');
    const allocs = autoAllocatePayment(1500, [
      { receivableKey: 'AR-2', invoiceKey: 'INV-2', balanceAmount: 1000, dueDate: d2, daysPastDue: 0 },
      { receivableKey: 'AR-1', invoiceKey: 'INV-1', balanceAmount: 800, dueDate: d1, daysPastDue: 30 },
    ]);
    expect(allocs[0].receivableKey).toBe('AR-1');
    expect(allocs.reduce((s, a) => s + a.amount, 0)).toBe(1500);
  });

  it('builds aging buckets', () => {
    const now = new Date();
    const overdue = new Date(now);
    overdue.setDate(overdue.getDate() - 45);
    const buckets = computeAgingBuckets([
      { receivableKey: 'A', invoiceKey: 'I1', balanceAmount: 100, dueDate: now, daysPastDue: 0 },
      { receivableKey: 'B', invoiceKey: 'I2', balanceAmount: 200, dueDate: overdue, daysPastDue: 45 },
    ]);
    expect(buckets.find((b) => b.label === '31_60')?.amount).toBe(200);
  });

  it('validates payment lifecycle', () => {
    expect(canConfirmPayment('draft')).toBe(true);
    expect(canConfirmPayment('confirmed')).toBe(false);
    expect(canVoidPayment('confirmed')).toBe(true);
  });

  it('projects collection', () => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    const projection = computeCollectionProjection(
      [{ balanceAmount: 500, dueDate: d }],
      [{ promisedAmount: 300, promisedDate: d, status: 'pending' }],
      30,
    );
    expect(projection.length).toBeGreaterThan(0);
  });

  it('handles partial payment allocation', () => {
    const allocs = autoAllocatePayment(500, [
      { receivableKey: 'AR-1', invoiceKey: 'INV-1', balanceAmount: 1000, dueDate: new Date(), daysPastDue: 0 },
    ]);
    expect(allocs[0].amount).toBe(500);
  });

  it('handles concurrent key generation', () => {
    const keys = Array.from({ length: 100 }, (_, i) => generatePaymentKey(i + 1));
    expect(new Set(keys).size).toBe(100);
  });
});
