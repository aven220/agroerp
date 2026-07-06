export type AgingBucket = {
  label: string;
  minDays: number;
  maxDays: number | null;
  amount: number;
  count: number;
};

export type ReceivableSnapshot = {
  receivableKey: string;
  invoiceKey: string;
  balanceAmount: number;
  dueDate: Date;
  daysPastDue: number;
};

export function generateReceivableKey(seq: number): string {
  return `AR-${String(seq).padStart(6, '0')}`;
}

export function generatePaymentKey(seq: number): string {
  return `PAY-${String(seq).padStart(6, '0')}`;
}

export function generateAdvanceKey(seq: number): string {
  return `ADV-${String(seq).padStart(6, '0')}`;
}

export function generateCampaignKey(seq: number): string {
  return `COL-${String(seq).padStart(6, '0')}`;
}

export function generateActivityKey(seq: number): string {
  return `ACT-${String(seq).padStart(6, '0')}`;
}

export function generateAgreementKey(seq: number): string {
  return `AGR-${String(seq).padStart(6, '0')}`;
}

export function generatePromiseKey(seq: number): string {
  return `PRM-${String(seq).padStart(6, '0')}`;
}

export function generateEscalationKey(seq: number): string {
  return `ESC-${String(seq).padStart(6, '0')}`;
}

export function generateArDocumentKey(type: string, seq: number): string {
  return `ARDOC-${type.toUpperCase().slice(0, 3)}-${String(seq).padStart(6, '0')}`;
}

export function computeDaysPastDue(dueDate: Date, asOf = new Date()): number {
  const ms = asOf.getTime() - dueDate.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function resolveReceivableStatus(balanceAmount: number, daysPastDue: number): string {
  if (balanceAmount <= 0) return 'paid';
  if (daysPastDue > 0) return 'overdue';
  return 'open';
}

export function classifyRisk(daysPastDue: number, balanceAmount: number): string {
  if (balanceAmount <= 0) return 'low';
  if (daysPastDue >= 90) return 'critical';
  if (daysPastDue >= 60) return 'high';
  if (daysPastDue >= 30) return 'medium';
  return 'low';
}

export function computeDueDate(issuedAt: Date, paymentTermDays = 30): Date {
  const d = new Date(issuedAt);
  d.setDate(d.getDate() + paymentTermDays);
  return d;
}

export function computeAgingBuckets(
  receivables: ReceivableSnapshot[],
  asOf = new Date(),
): AgingBucket[] {
  const defs: Array<{ label: string; minDays: number; maxDays: number | null }> = [
    { label: 'current', minDays: 0, maxDays: 0 },
    { label: '1_30', minDays: 1, maxDays: 30 },
    { label: '31_60', minDays: 31, maxDays: 60 },
    { label: '61_90', minDays: 61, maxDays: 90 },
    { label: 'over_90', minDays: 91, maxDays: null },
  ];

  return defs.map((def) => {
    const matched = receivables.filter((r) => {
      const days = computeDaysPastDue(r.dueDate, asOf);
      if (def.maxDays == null) return days >= def.minDays;
      return days >= def.minDays && days <= def.maxDays;
    });
    return {
      label: def.label,
      minDays: def.minDays,
      maxDays: def.maxDays,
      amount: Number(matched.reduce((s, r) => s + r.balanceAmount, 0).toFixed(2)),
      count: matched.length,
    };
  });
}

export function autoAllocatePayment(
  paymentAmount: number,
  receivables: ReceivableSnapshot[],
): Array<{ receivableKey: string; invoiceKey: string; amount: number }> {
  const sorted = [...receivables]
    .filter((r) => r.balanceAmount > 0)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  let remaining = paymentAmount;
  const allocations: Array<{ receivableKey: string; invoiceKey: string; amount: number }> = [];

  for (const r of sorted) {
    if (remaining <= 0) break;
    const apply = Math.min(remaining, r.balanceAmount);
    if (apply <= 0) continue;
    allocations.push({
      receivableKey: r.receivableKey,
      invoiceKey: r.invoiceKey,
      amount: Number(apply.toFixed(2)),
    });
    remaining = Number((remaining - apply).toFixed(2));
  }

  return allocations;
}

export function canConfirmPayment(status: string): boolean {
  return status === 'draft';
}

export function canVoidPayment(status: string): boolean {
  return status === 'confirmed' || status === 'reconciled';
}

export function canActivateAgreement(status: string): boolean {
  return status === 'draft';
}

export function computeCollectionProjection(
  receivables: Array<{ balanceAmount: number; dueDate: Date }>,
  promises: Array<{ promisedAmount: number; promisedDate: Date; status: string }>,
  daysAhead = 30,
): Array<{ date: string; expectedAmount: number }> {
  const end = new Date();
  end.setDate(end.getDate() + daysAhead);
  const map = new Map<string, number>();

  for (const r of receivables) {
    if (r.balanceAmount <= 0) continue;
    const key = r.dueDate.toISOString().slice(0, 10);
    if (r.dueDate <= end) {
      map.set(key, (map.get(key) ?? 0) + r.balanceAmount);
    }
  }

  for (const p of promises) {
    if (p.status !== 'pending') continue;
    const key = p.promisedDate.toISOString().slice(0, 10);
    if (p.promisedDate <= end) {
      map.set(key, (map.get(key) ?? 0) + p.promisedAmount);
    }
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, expectedAmount]) => ({ date, expectedAmount: Number(expectedAmount.toFixed(2)) }));
}

export const DEFAULT_PAYMENT_TERM_DAYS = 30;

export const ESCALATION_LEVELS = [
  { level: 1, label: 'Reminder', minDaysPastDue: 1 },
  { level: 2, label: 'Call', minDaysPastDue: 15 },
  { level: 3, label: 'Manager', minDaysPastDue: 30 },
  { level: 4, label: 'Legal', minDaysPastDue: 60 },
] as const;
