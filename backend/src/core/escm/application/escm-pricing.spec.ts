import {
  applyDiscountPct,
  applyPromotion,
  checkCreditAvailable,
  isWithinSeason,
  resolveUnitPrice,
  selectBestDiscount,
} from '../domain/escm-pricing.engine';

describe('ESCM Pricing Engine', () => {
  it('resolves price by priority', () => {
    const price = resolveUnitPrice([
      { source: 'list', unitPrice: 100, priority: 20 },
      { source: 'customer', unitPrice: 90, priority: 5 },
      { source: 'season', unitPrice: 85, priority: 10 },
    ]);
    expect(price).toBe(90);
  });

  it('returns null when no candidates', () => {
    expect(resolveUnitPrice([])).toBeNull();
  });

  it('applies percentage and fixed promotions', () => {
    expect(applyDiscountPct(1000, 10)).toBe(900);
    expect(applyPromotion(1000, { discountAmount: 150 })).toBe(850);
    expect(applyPromotion(1000, { discountPct: 5 })).toBe(950);
  });

  it('checks season boundaries', () => {
    const from = new Date('2026-06-01');
    const to = new Date('2026-08-31');
    expect(isWithinSeason(from, to, new Date('2026-07-15'))).toBe(true);
    expect(isWithinSeason(from, to, new Date('2026-09-01'))).toBe(false);
  });

  it('validates credit availability', () => {
    expect(checkCreditAvailable(0, 0, 500)).toBe(true);
    expect(checkCreditAvailable(1000, 200, 500)).toBe(true);
    expect(checkCreditAvailable(1000, 800, 300)).toBe(false);
  });

  it('selects best auto discount', () => {
    expect(selectBestDiscount([
      { discountPct: 5, priority: 1, autoApply: true },
      { discountPct: 12, priority: 2, autoApply: true },
      { discountPct: 20, priority: 3, autoApply: false },
    ])).toBe(12);
  });

  it('handles concurrent price resolution', () => {
    const results = Array.from({ length: 50 }, (_, i) =>
      resolveUnitPrice([
        { source: 'a', unitPrice: 100 + i, priority: 20 },
        { source: 'b', unitPrice: 50, priority: 1 },
      ]),
    );
    expect(results.every((p) => p === 50)).toBe(true);
  });
});
