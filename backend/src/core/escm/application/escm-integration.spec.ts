import { ESCM_DEFAULT_PARAMETERS } from '../domain/escm.catalogs';
import {
  applyDiscountPct,
  applyPromotion,
  resolveUnitPrice,
  selectBestDiscount,
} from '../domain/escm-pricing.engine';
import { classifyCustomer } from '../domain/escm-customer.engine';

describe('ESCM integration — pricing pipeline', () => {
  it('resolves end-to-end price with list, customer override, discount and promotion', () => {
    const listPrice = 10000;
    const customerPrice = 9500;
    const base = resolveUnitPrice([
      { source: 'price_list', unitPrice: listPrice, priority: 30 },
      { source: 'customer', unitPrice: customerPrice, priority: 10 },
    ]);
    expect(base).toBe(customerPrice);

    const autoDiscount = selectBestDiscount([
      { discountPct: 3, priority: 1, autoApply: true },
      { discountPct: 7, priority: 2, autoApply: true },
    ]);
    const afterDiscount = applyDiscountPct(base!, autoDiscount);
    const finalPrice = applyPromotion(afterDiscount, { discountPct: 2 });
    expect(finalPrice).toBeLessThan(customerPrice);
    expect(finalPrice).toBeGreaterThan(0);
  });

  it('classifies customer after purchase history integration', () => {
    const classification = classifyCustomer({
      lifetimeValue: 15000000,
      status: 'active',
      lastPurchaseAt: new Date(),
    });
    expect(classification).toBe('premium');
  });

  it('loads default parameters catalog', () => {
    expect(ESCM_DEFAULT_PARAMETERS.length).toBeGreaterThan(0);
    expect(ESCM_DEFAULT_PARAMETERS.some((p) => p.parameterKey === 'default_currency')).toBe(true);
  });
});

describe('ESCM load — concurrent pricing', () => {
  it('resolves 1000 prices under concurrent simulation', () => {
    const start = Date.now();
    const results = Array.from({ length: 1000 }, (_, i) => {
      const base = resolveUnitPrice([
        { source: 'list', unitPrice: 1000 + i, priority: 20 },
        { source: 'customer', unitPrice: 900, priority: 5 },
      ]);
      const discount = selectBestDiscount([
        { discountPct: 5, priority: 1, autoApply: true },
      ]);
      return applyPromotion(applyDiscountPct(base!, discount), { discountAmount: 10 });
    });
    const elapsed = Date.now() - start;
    expect(results.every((p) => p > 0 && p < 1000)).toBe(true);
    expect(elapsed).toBeLessThan(5000);
  });
});
