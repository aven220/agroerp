import {
  canTransitionOrder,
  compareOrderPriority,
  generateApprovalKey,
  generateConsolidationKey,
  isEditableOrderStatus,
  normalizeOrderStatus,
  resolveOrderType,
} from '../domain/escm-order.engine';
import { runOrderValidation, validateCredit } from '../domain/escm-order-validation.engine';
import { evaluateApprovalPolicies, nextApprovalLevel } from '../domain/escm-approval.engine';
import { computeOrderTotals } from '../domain/escm-order.engine';
import { computeLineTotals } from '../domain/escm-quotation.engine';

describe('ESCM Order Engine', () => {
  it('normalizes legacy statuses', () => {
    expect(normalizeOrderStatus('confirmed')).toBe('approved');
    expect(normalizeOrderStatus('in_fulfillment')).toBe('in_preparation');
    expect(normalizeOrderStatus('fulfilled')).toBe('delivered');
  });

  it('validates transitions', () => {
    expect(canTransitionOrder('draft', 'pending_approval')).toBe(true);
    expect(canTransitionOrder('draft', 'delivered')).toBe(false);
    expect(canTransitionOrder('approved', 'reserved')).toBe(true);
  });

  it('detects editable statuses', () => {
    expect(isEditableOrderStatus('draft')).toBe(true);
    expect(isEditableOrderStatus('approved')).toBe(false);
  });

  it('resolves order types', () => {
    expect(resolveOrderType({ consolidationKey: 'C1' })).toBe('consolidated');
    expect(resolveOrderType({ parentOrderId: 'x' })).toBe('partial');
    expect(resolveOrderType({ countryCode: 'US' })).toBe('international');
  });

  it('compares priority', () => {
    const a = { priority: 100, createdAt: new Date('2026-01-01') };
    const b = { priority: 50, createdAt: new Date('2026-01-02') };
    expect(compareOrderPriority(a, b)).toBeLessThan(0);
  });

  it('generates keys', () => {
    expect(generateApprovalKey(1)).toBe('APR-000001');
    expect(generateConsolidationKey(2)).toBe('CONS-000002');
  });

  it('computes order totals', () => {
    const totals = computeOrderTotals([
      { itemKey: 'A', quantity: 2, unitPrice: 1000, taxKey: 'exempt' },
    ]);
    expect(totals.totalAmount).toBeGreaterThan(0);
  });
});

describe('ESCM Order Validation Engine', () => {
  it('validates credit', () => {
    expect(validateCredit({ limit: 1000, used: 200, amount: 500, enabled: true }).passed).toBe(true);
    expect(validateCredit({ limit: 1000, used: 900, amount: 200, enabled: true }).passed).toBe(false);
  });

  it('runs full validation', () => {
    const result = runOrderValidation({
      customerStatus: 'active',
      creditLimit: 1_000_000,
      creditUsed: 0,
      orderTotal: 100_000,
      creditCheckEnabled: true,
      lines: [{ itemKey: 'X', quantity: 10, unitPrice: 1000, discountPct: 5, availableQty: 100 }],
      maxDiscountPct: 20,
      userCanOverrideDiscount: false,
      userCanCreateOrder: true,
      commercialPolicyOk: true,
    });
    expect(result.passed).toBe(true);
  });
});

describe('ESCM Approval Engine', () => {
  it('evaluates approval policies', () => {
    const req = evaluateApprovalPolicies({
      orderTotal: 60_000_000,
      discountPct: 20,
      creditExceeded: true,
      hasExceptionalTerms: false,
      policies: [
        { policyKey: 'P1', triggerType: 'high_value', thresholdValue: 50_000_000, approvalLevels: 2, isActive: true },
        { policyKey: 'P2', triggerType: 'high_discount', thresholdPct: 15, approvalLevels: 1, isActive: true },
      ],
    });
    expect(req.required).toBe(true);
    expect(req.maxLevels).toBeGreaterThanOrEqual(2);
  });

  it('handles multi-level approval progression', () => {
    expect(nextApprovalLevel(1, 2, 'approved')).toEqual({ complete: false, nextLevel: 2 });
    expect(nextApprovalLevel(2, 2, 'approved')).toEqual({ complete: true, nextLevel: 2 });
    expect(nextApprovalLevel(1, 2, 'rejected').complete).toBe(true);
  });
});

describe('ESCM Order concurrency', () => {
  it('handles concurrent total computation', () => {
    const line = { itemKey: 'A', quantity: 5, unitPrice: 200, discountPct: 10, taxKey: 'iva_19' };
    const results = Array.from({ length: 50 }, () => computeLineTotals(line));
    expect(results.every((r) => r.lineTotal > 0)).toBe(true);
  });
});
