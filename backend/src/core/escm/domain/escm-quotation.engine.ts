import { ESCM_TAX_RATES } from './escm.catalogs';
import { applyDiscountPct } from './escm-pricing.engine';

export type EscmQuotationStatusValue =
  | 'draft'
  | 'sent'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'converted'
  | 'superseded';

export type QuotationLineInput = {
  itemKey: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountPct?: number;
  taxKey?: string;
  taxRate?: number;
};

export type QuotationTotals = {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
};

export function generateQuotationKey(groupKey: string, version: number): string {
  return `QUO-${groupKey.replace(/^GRP-/, '')}-V${version}`.slice(0, 120);
}

export function generateQuoteGroupKey(seq: number): string {
  return `GRP-${String(seq).padStart(6, '0')}`;
}

export function generateOrderKey(seq: number): string {
  return `ORD-${String(seq).padStart(6, '0')}`;
}

export function resolveTaxRate(taxKey?: string, override?: number): number {
  if (override != null) return override;
  if (!taxKey) return 0;
  return ESCM_TAX_RATES[taxKey] ?? 0;
}

export function computeLineTotals(line: QuotationLineInput): {
  lineSubtotal: number;
  taxAmount: number;
  lineTotal: number;
} {
  const gross = line.quantity * line.unitPrice;
  const afterDiscount = applyDiscountPct(gross, line.discountPct ?? 0);
  const taxRate = resolveTaxRate(line.taxKey, line.taxRate);
  const taxAmount = Number(((afterDiscount * taxRate) / 100).toFixed(2));
  const lineTotal = Number((afterDiscount + taxAmount).toFixed(2));
  return {
    lineSubtotal: Number(afterDiscount.toFixed(2)),
    taxAmount,
    lineTotal,
  };
}

export function computeQuotationTotals(
  lines: QuotationLineInput[],
  headerDiscountPct = 0,
): QuotationTotals {
  let subtotal = 0;
  let taxAmount = 0;
  for (const line of lines) {
    const t = computeLineTotals(line);
    subtotal += t.lineSubtotal;
    taxAmount += t.taxAmount;
  }
  const discountAmount = Number(((subtotal * headerDiscountPct) / 100).toFixed(2));
  const netSubtotal = subtotal - discountAmount;
  const totalAmount = Number((netSubtotal + taxAmount).toFixed(2));
  return {
    subtotal: Number(netSubtotal.toFixed(2)),
    discountAmount,
    taxAmount,
    totalAmount,
  };
}

export function canApproveQuotation(status: EscmQuotationStatusValue): boolean {
  return status === 'draft' || status === 'sent';
}

export function canConvertQuotation(status: EscmQuotationStatusValue): boolean {
  return status === 'approved';
}

export function compareQuotations(
  a: { version: number; totalAmount: number; status: string },
  b: { version: number; totalAmount: number; status: string },
): number {
  if (a.version !== b.version) return a.version - b.version;
  return a.totalAmount - b.totalAmount;
}
