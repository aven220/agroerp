export function generateTrKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(8, '0')}`;
}

export type ParsedStatementLine = {
  transactionDate: string;
  description: string;
  reference?: string;
  debit: number;
  credit: number;
  balance?: number;
};

export function parseCsvStatement(content: string): ParsedStatementLine[] {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].toLowerCase();
  const dateIdx = header.includes('fecha') ? 0 : header.split(',').findIndex((h) => h.includes('date'));
  const descIdx = header.includes('descripcion') ? 1 : 2;
  const refIdx = header.includes('referencia') ? 2 : 3;
  const debitIdx = header.includes('debito') || header.includes('debit') ? 3 : 4;
  const creditIdx = header.includes('credito') || header.includes('credit') ? 4 : 5;

  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim());
    return {
      transactionDate: cols[dateIdx >= 0 ? dateIdx : 0] ?? new Date().toISOString().slice(0, 10),
      description: cols[descIdx >= 0 ? descIdx : 1] ?? '',
      reference: cols[refIdx >= 0 ? refIdx : 2],
      debit: parseFloat(cols[debitIdx >= 0 ? debitIdx : 3] ?? '0') || 0,
      credit: parseFloat(cols[creditIdx >= 0 ? creditIdx : 4] ?? '0') || 0,
    };
  }).filter((l) => l.debit > 0 || l.credit > 0);
}

export function parseOfxStatement(content: string): ParsedStatementLine[] {
  const results: ParsedStatementLine[] = [];
  const blocks = content.split('<STMTTRN>');
  for (const block of blocks.slice(1)) {
    const date = block.match(/<DTPOSTED>(\d{8})/)?.[1];
    const amt = parseFloat(block.match(/<TRNAMT>([-\d.]+)/)?.[1] ?? '0');
    const memo = block.match(/<MEMO>([^<\n]+)/)?.[1] ?? '';
    const fitId = block.match(/<FITID>([^<\n]+)/)?.[1];
    if (!date) continue;
    const iso = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
    results.push({
      transactionDate: iso,
      description: memo,
      reference: fitId,
      debit: amt < 0 ? Math.abs(amt) : 0,
      credit: amt > 0 ? amt : 0,
    });
  }
  return results;
}

export type ReconciliationRule = {
  matchField: string;
  matchOperator: string;
  toleranceAmount: number;
  toleranceDays: number;
};

export function withinTolerance(expected: number, actual: number, tolerancePercent: number): boolean {
  if (expected === 0) return actual === 0;
  const diff = Math.abs(actual - expected);
  return (diff / Math.abs(expected)) * 100 <= tolerancePercent;
}

export function matchMovementToLine(
  movement: { amount: number; movementDate: Date; referenceNumber?: string | null; description: string },
  line: { debit: number; credit: number; transactionDate: Date; reference?: string | null; description: string },
  rules: ReconciliationRule[],
): { matched: boolean; ruleKey?: string; difference: number } {
  const lineAmount = line.credit > 0 ? line.credit : line.debit;
  const movAmount = movement.amount;
  const amountDiff = Math.abs(lineAmount - movAmount);

  for (const rule of rules.sort((a, b) => a.toleranceAmount - b.toleranceAmount)) {
    if (amountDiff > rule.toleranceAmount) continue;

    const daysDiff = Math.abs(
      (movement.movementDate.getTime() - line.transactionDate.getTime()) / 86400000,
    );
    if (daysDiff > rule.toleranceDays) continue;

    if (rule.matchField === 'reference' && rule.matchOperator === 'eq') {
      if (movement.referenceNumber && line.reference
        && movement.referenceNumber.toLowerCase() === line.reference.toLowerCase()) {
        return { matched: true, ruleKey: 'reference_eq', difference: amountDiff };
      }
    }

    if (rule.matchField === 'amount' && rule.matchOperator === 'eq' && amountDiff <= rule.toleranceAmount) {
      return { matched: true, ruleKey: 'amount_eq', difference: amountDiff };
    }

    if (rule.matchField === 'description' && rule.matchOperator === 'contains') {
      const a = movement.description.toLowerCase();
      const b = line.description.toLowerCase();
      if (a.includes(b.slice(0, 10)) || b.includes(a.slice(0, 10))) {
        return { matched: true, ruleKey: 'description_contains', difference: amountDiff };
      }
    }
  }

  if (amountDiff <= 0.01 && Math.abs(
    (movement.movementDate.getTime() - line.transactionDate.getTime()) / 86400000,
  ) <= 3) {
    return { matched: true, ruleKey: 'default_amount_date', difference: amountDiff };
  }

  return { matched: false, difference: amountDiff };
}

export type CashFlowBucket = {
  period: string;
  inflows: number;
  outflows: number;
  netFlow: number;
  cumulativeBalance: number;
};

export function buildCashFlowProjection(
  openingBalance: number,
  buckets: Array<{ period: string; inflows: number; outflows: number }>,
): CashFlowBucket[] {
  let cumulative = openingBalance;
  return buckets.map((b) => {
    const netFlow = b.inflows - b.outflows;
    cumulative += netFlow;
    return { ...b, netFlow, cumulativeBalance: cumulative };
  });
}

export function computeCashCountDifference(counted: number, expected: number): number {
  return Math.round((counted - expected) * 100) / 100;
}

export const DEFAULT_RECONCILIATION_RULES = [
  { ruleKey: 'RULE-REF-EQ', name: 'Referencia exacta', matchField: 'reference', matchOperator: 'eq', toleranceAmount: 0, toleranceDays: 5, priority: 10 },
  { ruleKey: 'RULE-AMT-EQ', name: 'Monto exacto', matchField: 'amount', matchOperator: 'eq', toleranceAmount: 1, toleranceDays: 3, priority: 20 },
  { ruleKey: 'RULE-DESC', name: 'Descripción parcial', matchField: 'description', matchOperator: 'contains', toleranceAmount: 100, toleranceDays: 7, priority: 30 },
];

export const DEFAULT_BANKS = [
  { bankKey: 'BANK-BANCOLOMBIA', code: 'BANCOLOMBIA', name: 'Bancolombia', countryCode: 'CO' },
  { bankKey: 'BANK-DAVIVIENDA', code: 'DAVIVIENDA', name: 'Davivienda', countryCode: 'CO' },
  { bankKey: 'BANK-BBOG', code: 'BBOG', name: 'Banco de Bogotá', countryCode: 'CO' },
];
