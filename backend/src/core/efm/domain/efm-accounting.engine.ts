export type JournalLineInput = {
  accountKey: string;
  debit: number;
  credit: number;
  description?: string;
  costCenterKey?: string;
  profitCenterKey?: string;
  projectKey?: string;
  branchKey?: string;
  companyKey?: string;
  taxKey?: string;
  auxiliaryKey?: string;
  sourceDocumentKey?: string;
  reference?: string;
  observations?: string;
};

export type RuleCondition = {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'exists';
  value?: unknown;
};

export type SourceDocumentContext = {
  sourceModule: string;
  sourceDocumentType: string;
  sourceDocumentKey: string;
  eventType: string;
  amount: number;
  currencyKey?: string;
  companyKey?: string;
  branchKey?: string;
  costCenterKey?: string;
  countryCode?: string;
  payload?: Record<string, unknown>;
};

export function generateCoaVersionKey(seq: number): string {
  return `COA-V${String(seq).padStart(4, '0')}`;
}

export function generateAccountKey(seq: number): string {
  return `ACC-${String(seq).padStart(6, '0')}`;
}

export function generateRuleKey(seq: number): string {
  return `RULE-${String(seq).padStart(6, '0')}`;
}

export function generateJournalKey(seq: number): string {
  return `JE-${String(seq).padStart(8, '0')}`;
}

export function generatePeriodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function generateFiscalYearKey(year: number): string {
  return `FY-${year}`;
}

export function buildAccountPath(parentPath: string | undefined, accountKey: string): string {
  if (!parentPath) return accountKey;
  return `${parentPath}/${accountKey}`;
}

export function roundAmount(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function sumDebits(lines: JournalLineInput[]): number {
  return roundAmount(lines.reduce((s, l) => s + (l.debit ?? 0), 0));
}

export function sumCredits(lines: JournalLineInput[]): number {
  return roundAmount(lines.reduce((s, l) => s + (l.credit ?? 0), 0));
}

export function isBalanced(lines: JournalLineInput[], tolerance = 0.01): boolean {
  return Math.abs(sumDebits(lines) - sumCredits(lines)) <= tolerance;
}

export function validateJournalLines(lines: JournalLineInput[]): string[] {
  const errors: string[] = [];
  if (!lines.length) errors.push('El asiento requiere al menos una línea');
  for (const line of lines) {
    if (line.debit < 0 || line.credit < 0) errors.push(`Montos negativos en cuenta ${line.accountKey}`);
    if (line.debit > 0 && line.credit > 0) errors.push(`Línea mixta débito/crédito en ${line.accountKey}`);
    if (line.debit === 0 && line.credit === 0) errors.push(`Línea sin valor en ${line.accountKey}`);
  }
  if (!isBalanced(lines)) errors.push('El asiento no está balanceado (débitos ≠ créditos)');
  return errors;
}

export function evaluateConditions(
  conditions: RuleCondition[],
  context: Record<string, unknown>,
): boolean {
  if (!conditions.length) return true;
  return conditions.every((c) => {
    const actual = context[c.field];
    switch (c.operator) {
      case 'eq':
        return actual === c.value;
      case 'neq':
        return actual !== c.value;
      case 'gt':
        return Number(actual) > Number(c.value);
      case 'gte':
        return Number(actual) >= Number(c.value);
      case 'lt':
        return Number(actual) < Number(c.value);
      case 'lte':
        return Number(actual) <= Number(c.value);
      case 'in':
        return Array.isArray(c.value) && c.value.includes(actual);
      case 'exists':
        return actual !== undefined && actual !== null;
      default:
        return false;
    }
  });
}

export function buildJournalFromRule(
  rule: {
    debitAccountKey: string;
    creditAccountKey: string;
    ruleKey: string;
  },
  ctx: SourceDocumentContext,
): JournalLineInput[] {
  const amount = roundAmount(Math.abs(ctx.amount));
  if (amount <= 0) return [];
  return [
    {
      accountKey: rule.debitAccountKey,
      debit: amount,
      credit: 0,
      description: `${ctx.sourceDocumentType} ${ctx.sourceDocumentKey}`,
      costCenterKey: ctx.costCenterKey,
      auxiliaryKey: String(ctx.payload?.customerKey ?? ctx.payload?.supplierKey ?? ''),
    },
    {
      accountKey: rule.creditAccountKey,
      debit: 0,
      credit: amount,
      description: `${ctx.sourceDocumentType} ${ctx.sourceDocumentKey}`,
      costCenterKey: ctx.costCenterKey,
      taxKey: String(ctx.payload?.taxKey ?? ''),
    },
  ];
}

export function mapEventToSourceModule(eventType: string): string {
  if (eventType.startsWith('EscmInvoice')) return 'sales';
  if (eventType.startsWith('EscmPayment')) return 'collection';
  if (eventType.startsWith('EscmReturn')) return 'return';
  if (eventType.startsWith('EscmCreditNote')) return 'credit_note';
  if (eventType.startsWith('EscmDebitNote')) return 'debit_note';
  if (eventType.startsWith('EimsMovement') || eventType.startsWith('EimsTransform')) return 'inventory';
  if (eventType.startsWith('CpepSettlement')) return 'purchase';
  return 'adjustment';
}

export function extractAmountFromPayload(payload: Record<string, unknown>): number {
  const candidates = ['totalAmount', 'amount', 'balanceAmount', 'lineTotal', 'grandTotal', 'value'];
  for (const key of candidates) {
    const v = payload[key];
    if (typeof v === 'number' && v !== 0) return v;
  }
  return 0;
}
