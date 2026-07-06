export type ApToleranceConfig = {
  quantityPercent: number;
  pricePercent: number;
  taxPercent: number;
  discountPercent: number;
};

export const DEFAULT_AP_TOLERANCES: ApToleranceConfig = {
  quantityPercent: 2,
  pricePercent: 1,
  taxPercent: 0.5,
  discountPercent: 1,
};

export type ApValidationInput = {
  purchaseOrderKey?: string;
  receiptKey?: string;
  poQuantity?: number;
  receiptQuantity?: number;
  invoiceQuantity: number;
  poUnitPrice?: number;
  invoiceUnitPrice: number;
  poTaxAmount?: number;
  invoiceTaxAmount: number;
  poDiscountAmount?: number;
  invoiceDiscountAmount: number;
};

export type ApValidationResult = {
  validationType: string;
  expectedValue: number | null;
  actualValue: number | null;
  tolerancePercent: number;
  passed: boolean;
  message: string;
};

export function generateApKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(8, '0')}`;
}

export function computeDueDate(issueDate: Date, paymentTermsDays: number): Date {
  const d = new Date(issueDate);
  d.setDate(d.getDate() + paymentTermsDays);
  return d;
}

export function computeDaysPastDue(dueDate: Date, asOf = new Date()): number {
  const diff = asOf.getTime() - dueDate.getTime();
  return diff > 0 ? Math.floor(diff / 86400000) : 0;
}

export function resolvePayableStatus(balance: number, original: number, daysPastDue: number, onHold: boolean): string {
  if (onHold) return 'on_hold';
  if (balance <= 0.01) return 'paid';
  if (daysPastDue > 0) return 'overdue';
  if (balance < original - 0.01) return 'partial';
  return 'open';
}

export function resolveInvoiceStatus(
  balance: number,
  total: number,
  paid: number,
  posted: boolean,
): string {
  if (balance <= 0.01 && paid > 0) return 'paid';
  if (paid > 0 && balance > 0.01) return 'partially_paid';
  if (posted) return 'posted';
  return 'approved';
}

export function withinTolerance(expected: number, actual: number, tolerancePercent: number): boolean {
  if (expected === 0) return actual === 0;
  const diff = Math.abs(actual - expected);
  return (diff / Math.abs(expected)) * 100 <= tolerancePercent;
}

export function validateInvoiceThreeWay(
  input: ApValidationInput,
  tolerances: ApToleranceConfig = DEFAULT_AP_TOLERANCES,
): ApValidationResult[] {
  const results: ApValidationResult[] = [];

  if (input.purchaseOrderKey) {
    results.push({
      validationType: 'po_reference',
      expectedValue: 1,
      actualValue: 1,
      tolerancePercent: 0,
      passed: true,
      message: 'Orden de compra referenciada',
    });
  } else {
    results.push({
      validationType: 'po_reference',
      expectedValue: 1,
      actualValue: 0,
      tolerancePercent: 0,
      passed: false,
      message: 'Factura sin orden de compra',
    });
  }

  if (input.receiptKey) {
    results.push({
      validationType: 'receipt_reference',
      expectedValue: 1,
      actualValue: 1,
      tolerancePercent: 0,
      passed: true,
      message: 'Recepción referenciada',
    });
  }

  if (input.poQuantity != null) {
    const passed = withinTolerance(input.poQuantity, input.invoiceQuantity, tolerances.quantityPercent);
    results.push({
      validationType: 'quantity',
      expectedValue: input.poQuantity,
      actualValue: input.invoiceQuantity,
      tolerancePercent: tolerances.quantityPercent,
      passed,
      message: passed ? 'Cantidades dentro de tolerancia' : 'Cantidad fuera de tolerancia',
    });
  }

  if (input.receiptQuantity != null) {
    const passed = withinTolerance(input.receiptQuantity, input.invoiceQuantity, tolerances.quantityPercent);
    results.push({
      validationType: 'receipt_quantity',
      expectedValue: input.receiptQuantity,
      actualValue: input.invoiceQuantity,
      tolerancePercent: tolerances.quantityPercent,
      passed,
      message: passed ? 'Recepción vs factura OK' : 'Recepción vs factura fuera de tolerancia',
    });
  }

  if (input.poUnitPrice != null) {
    const passed = withinTolerance(input.poUnitPrice, input.invoiceUnitPrice, tolerances.pricePercent);
    results.push({
      validationType: 'price',
      expectedValue: input.poUnitPrice,
      actualValue: input.invoiceUnitPrice,
      tolerancePercent: tolerances.pricePercent,
      passed,
      message: passed ? 'Precio dentro de tolerancia' : 'Precio fuera de tolerancia',
    });
  }

  if (input.poTaxAmount != null) {
    const passed = withinTolerance(input.poTaxAmount, input.invoiceTaxAmount, tolerances.taxPercent);
    results.push({
      validationType: 'tax',
      expectedValue: input.poTaxAmount,
      actualValue: input.invoiceTaxAmount,
      tolerancePercent: tolerances.taxPercent,
      passed,
      message: passed ? 'Impuestos dentro de tolerancia' : 'Impuestos fuera de tolerancia',
    });
  }

  if (input.poDiscountAmount != null) {
    const passed = withinTolerance(input.poDiscountAmount, input.invoiceDiscountAmount, tolerances.discountPercent);
    results.push({
      validationType: 'discount',
      expectedValue: input.poDiscountAmount,
      actualValue: input.invoiceDiscountAmount,
      tolerancePercent: tolerances.discountPercent,
      passed,
      message: passed ? 'Descuento dentro de tolerancia' : 'Descuento fuera de tolerancia',
    });
  }

  return results;
}

export type AgingBucket = {
  bucket: string;
  label: string;
  amount: number;
  count: number;
};

export function computeAgingBuckets(
  payables: Array<{ balanceAmount: number; daysPastDue: number }>,
): AgingBucket[] {
  const buckets: AgingBucket[] = [
    { bucket: 'current', label: 'Corriente', amount: 0, count: 0 },
    { bucket: '1_30', label: '1-30 días', amount: 0, count: 0 },
    { bucket: '31_60', label: '31-60 días', amount: 0, count: 0 },
    { bucket: '61_90', label: '61-90 días', amount: 0, count: 0 },
    { bucket: '90_plus', label: '+90 días', amount: 0, count: 0 },
  ];

  for (const p of payables) {
    const d = p.daysPastDue;
    let idx = 0;
    if (d <= 0) idx = 0;
    else if (d <= 30) idx = 1;
    else if (d <= 60) idx = 2;
    else if (d <= 90) idx = 3;
    else idx = 4;
    buckets[idx].amount += p.balanceAmount;
    buckets[idx].count += 1;
  }
  return buckets;
}

export function applyPartialPayment(balance: number, paymentAmount: number): {
  applied: number;
  remainingBalance: number;
  unapplied: number;
} {
  const applied = Math.min(balance, paymentAmount);
  return {
    applied,
    remainingBalance: Math.max(0, balance - applied),
    unapplied: Math.max(0, paymentAmount - applied),
  };
}

export function computeEarlyDiscount(amount: number, discountPercent: number, daysBeforeDue: number): number {
  if (daysBeforeDue <= 0 || discountPercent <= 0) return 0;
  return Math.round((amount * discountPercent / 100) * 100) / 100;
}

export const DEFAULT_AP_APPROVAL_LEVELS = [
  { level: 1, amountLimit: 5000000, roleKey: 'supervisor' },
  { level: 2, amountLimit: 50000000, roleKey: 'manager' },
  { level: 3, amountLimit: null, roleKey: 'admin' },
];
