export interface PriceCandidate {
  source: string;
  unitPrice: number;
  priority: number;
}

export function resolveUnitPrice(candidates: PriceCandidate[]): number | null {
  if (!candidates.length) return null;
  const sorted = [...candidates].sort((a, b) => a.priority - b.priority);
  return sorted[0].unitPrice;
}

export function applyDiscountPct(unitPrice: number, discountPct: number): number {
  if (discountPct <= 0) return unitPrice;
  return Number((unitPrice * (1 - discountPct / 100)).toFixed(6));
}

export function applyPromotion(
  unitPrice: number,
  promotion?: { discountPct?: number | null; discountAmount?: number | null },
): number {
  if (!promotion) return unitPrice;
  if (promotion.discountPct) return applyDiscountPct(unitPrice, promotion.discountPct);
  if (promotion.discountAmount) {
    return Number(Math.max(0, unitPrice - promotion.discountAmount).toFixed(6));
  }
  return unitPrice;
}

export function isWithinSeason(validFrom: Date, validTo: Date, at = new Date()): boolean {
  const d = at.toISOString().slice(0, 10);
  return d >= validFrom.toISOString().slice(0, 10) && d <= validTo.toISOString().slice(0, 10);
}

export function checkCreditAvailable(limit: number, used: number, amount: number): boolean {
  if (limit <= 0) return true;
  return used + amount <= limit;
}

export function generatePriceListKey(name: string, seq: number): string {
  const slug = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12);
  return `LIST-${slug || 'STD'}-${seq}`;
}

export function generateConditionKey(prefix: string): string {
  return `COND-${prefix}-${Date.now()}`.slice(0, 120);
}

export function selectBestDiscount(
  rules: Array<{ discountPct: number; priority: number; autoApply: boolean }>,
): number {
  const applicable = rules.filter((r) => r.autoApply);
  if (!applicable.length) return 0;
  return Math.max(...applicable.map((r) => r.discountPct));
}
