import { applyDiscountPct } from './escm-pricing.engine';
import { resolveTaxRate } from './escm-quotation.engine';

export type BillingLineInput = {
  itemKey: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountPct?: number;
  taxKey?: string;
  taxRate?: number;
  withholdingKey?: string;
  withholdingRate?: number;
};

export type TaxRuleCandidate = {
  ruleKey: string;
  ruleType: string;
  taxKey?: string | null;
  rate: number;
  isExempt: boolean;
  priority: number;
};

export type BillingTotals = {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  withholdingAmount: number;
  roundingAdjustment: number;
  totalAmount: number;
  taxBreakdown: Array<{ taxType: string; taxKey: string; baseAmount: number; rate: number; amount: number }>;
};

export function generateInvoiceKey(seq: number): string {
  return `INV-${String(seq).padStart(6, '0')}`;
}

export function generateReturnKey(seq: number): string {
  return `RET-${String(seq).padStart(6, '0')}`;
}

export function generateWarrantyKey(seq: number): string {
  return `WAR-${String(seq).padStart(6, '0')}`;
}

export function generateCreditNoteKey(seq: number): string {
  return `CN-${String(seq).padStart(6, '0')}`;
}

export function generateDebitNoteKey(seq: number): string {
  return `DN-${String(seq).padStart(6, '0')}`;
}

export function generateBillingDocumentKey(type: string, seq: number): string {
  return `BDOC-${type.toUpperCase().slice(0, 3)}-${String(seq).padStart(6, '0')}`;
}

export function resolveInvoiceType(input: {
  invoiceType?: string;
  countryCode?: string | null;
  consolidationKey?: string | null;
  isPartial?: boolean;
  isProforma?: boolean;
  isRecurring?: boolean;
}): string {
  if (input.isProforma) return 'proforma';
  if (input.isRecurring) return 'recurring';
  if (input.consolidationKey) return 'consolidated';
  if (input.isPartial) return 'partial';
  if (input.countryCode && input.countryCode !== 'CO') return 'international';
  if (input.invoiceType) return input.invoiceType;
  return 'national';
}

export function selectTaxRule(
  rules: TaxRuleCandidate[],
  context: { itemKey?: string; customerKey?: string; countryCode?: string },
): TaxRuleCandidate | null {
  const applicable = rules
    .filter((r) => {
      if (r.isExempt) return true;
      return true;
    })
    .filter((r) => !context.itemKey || !('itemKey' in r) || true)
    .sort((a, b) => a.priority - b.priority);
  return applicable[0] ?? null;
}

export function resolveWithholdingRate(withholdingKey?: string, override?: number): number {
  if (override != null) return override;
  if (!withholdingKey) return 0;
  const defaults: Record<string, number> = {
    retefuente: 2.5,
    reteiva: 15,
    reteica: 1,
  };
  return defaults[withholdingKey] ?? 0;
}

export function computeBillingLineTotals(line: BillingLineInput): {
  lineSubtotal: number;
  taxAmount: number;
  withholdingAmount: number;
  lineTotal: number;
  taxRate: number;
  withholdingRate: number;
} {
  const gross = line.quantity * line.unitPrice;
  const afterDiscount = applyDiscountPct(gross, line.discountPct ?? 0);
  const taxRate = line.taxRate ?? resolveTaxRate(line.taxKey);
  const withholdingRate = line.withholdingRate ?? resolveWithholdingRate(line.withholdingKey);
  const taxAmount = Number(((afterDiscount * taxRate) / 100).toFixed(2));
  const withholdingAmount = Number(((afterDiscount * withholdingRate) / 100).toFixed(2));
  const lineTotal = Number((afterDiscount + taxAmount - withholdingAmount).toFixed(2));
  return {
    lineSubtotal: Number(afterDiscount.toFixed(2)),
    taxAmount,
    withholdingAmount,
    lineTotal,
    taxRate,
    withholdingRate,
  };
}

export function computeBillingTotals(
  lines: BillingLineInput[],
  headerDiscountPct = 0,
  roundingMode: 'half_up' | 'none' = 'half_up',
): BillingTotals {
  let subtotal = 0;
  let taxAmount = 0;
  let withholdingAmount = 0;
  const taxMap = new Map<string, { taxType: string; taxKey: string; baseAmount: number; rate: number; amount: number }>();

  for (const line of lines) {
    const t = computeBillingLineTotals(line);
    subtotal += t.lineSubtotal;
    taxAmount += t.taxAmount;
    withholdingAmount += t.withholdingAmount;
    const key = line.taxKey ?? 'exempt';
    const existing = taxMap.get(key) ?? {
      taxType: 'iva',
      taxKey: key,
      baseAmount: 0,
      rate: t.taxRate,
      amount: 0,
    };
    existing.baseAmount += t.lineSubtotal;
    existing.amount += t.taxAmount;
    taxMap.set(key, existing);
  }

  const discountAmount = Number(((subtotal * headerDiscountPct) / 100).toFixed(2));
  const netSubtotal = subtotal - discountAmount;
  let totalAmount = netSubtotal + taxAmount - withholdingAmount;
  let roundingAdjustment = 0;
  if (roundingMode === 'half_up') {
    const rounded = Math.round(totalAmount);
    roundingAdjustment = Number((rounded - totalAmount).toFixed(2));
    totalAmount = rounded;
  }

  return {
    subtotal: Number(netSubtotal.toFixed(2)),
    discountAmount,
    taxAmount: Number(taxAmount.toFixed(2)),
    withholdingAmount: Number(withholdingAmount.toFixed(2)),
    roundingAdjustment,
    totalAmount: Number(totalAmount.toFixed(2)),
    taxBreakdown: [...taxMap.values()],
  };
}

export function canVoidInvoice(status: string): boolean {
  return status === 'issued' || status === 'partial' || status === 'proforma';
}

export function canIssueInvoice(status: string): boolean {
  return status === 'draft' || status === 'proforma';
}

export function canProcessReturn(status: string): boolean {
  return status === 'approved';
}

export function canApproveWarranty(status: string): boolean {
  return status === 'pending_approval' || status === 'draft';
}

export const DEFAULT_WITHHOLDING_RATES = {
  retefuente: 2.5,
  reteiva: 15,
  reteica: 1,
} as const;

export const DEFAULT_TAX_RULES_SEED = [
  { ruleKey: 'TAX-IVA-19', ruleType: 'iva', name: 'IVA 19%', taxKey: 'iva_19', rate: 19, priority: 100 },
  { ruleKey: 'TAX-IVA-5', ruleType: 'iva', name: 'IVA 5%', taxKey: 'iva_5', rate: 5, priority: 90 },
  { ruleKey: 'TAX-EXEMPT', ruleType: 'exempt', name: 'Exento', taxKey: 'exempt', rate: 0, priority: 10, isExempt: true },
  { ruleKey: 'WH-RETEFUENTE', ruleType: 'withholding', name: 'Retefuente 2.5%', taxKey: 'retefuente', rate: 2.5, priority: 50 },
  { ruleKey: 'WH-RETEIVA', ruleType: 'withholding', name: 'ReteIVA 15%', taxKey: 'reteiva', rate: 15, priority: 40 },
] as const;
