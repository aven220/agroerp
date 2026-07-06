export const DEFAULT_VOUCHER_TYPES = [
  {
    voucherTypeKey: 'VT-AUTO',
    code: 'AUTO',
    name: 'Comprobante automático',
    prefix: 'CA',
    approvalLevels: 0,
    requiresApproval: false,
    autoPost: true,
    originAllowed: 'automatic',
  },
  {
    voucherTypeKey: 'VT-MANUAL',
    code: 'MAN',
    name: 'Comprobante manual',
    prefix: 'CM',
    approvalLevels: 2,
    requiresApproval: true,
    autoPost: false,
    originAllowed: 'manual',
  },
  {
    voucherTypeKey: 'VT-ADJ',
    code: 'ADJ',
    name: 'Ajuste contable',
    prefix: 'AJ',
    approvalLevels: 1,
    requiresApproval: true,
    autoPost: false,
    originAllowed: 'manual',
  },
  {
    voucherTypeKey: 'VT-REV',
    code: 'REV',
    name: 'Reversión',
    prefix: 'RV',
    approvalLevels: 0,
    requiresApproval: false,
    autoPost: true,
    originAllowed: 'automatic',
  },
] as const;

export function generateVoucherTypeKey(seq: number): string {
  return `VT-${String(seq).padStart(4, '0')}`;
}

export function formatVoucherNumber(
  prefix: string,
  seq: number,
  padding: number,
  periodKey?: string,
): string {
  const num = String(seq).padStart(padding, '0');
  return periodKey ? `${prefix}-${periodKey}-${num}` : `${prefix}-${num}`;
}

export function resolveSequencePeriodKey(resetPeriod: string, entryDate: Date): string {
  if (resetPeriod === 'month') {
    return `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;
  }
  if (resetPeriod === 'year') {
    return String(entryDate.getFullYear());
  }
  return '_all';
}

export type LedgerMovement = {
  entryKey: string;
  voucherNumber: string | null;
  entryDate: string;
  periodKey: string;
  accountKey: string;
  debit: number;
  credit: number;
  description: string | null;
  sourceDocumentKey: string;
  companyKey: string | null;
  branchKey: string | null;
};

export type LedgerAccountBalance = {
  accountKey: string;
  accountCode: string;
  accountName: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  movementCount: number;
};

export function computeClosingBalance(opening: number, debits: number, credits: number, nature: string): number {
  if (nature === 'asset' || nature === 'expense') {
    return opening + debits - credits;
  }
  return opening + credits - debits;
}

export function buildReversalLines(
  lines: Array<{ accountKey: string; debit: number; credit: number; description?: string | null; costCenterKey?: string | null; profitCenterKey?: string | null; projectKey?: string | null; branchKey?: string | null; companyKey?: string | null; reference?: string | null; sourceDocumentKey?: string | null; observations?: string | null }>,
): Array<{ accountKey: string; debit: number; credit: number; description?: string; costCenterKey?: string; profitCenterKey?: string; projectKey?: string; branchKey?: string; companyKey?: string; reference?: string; sourceDocumentKey?: string; observations?: string }> {
  return lines.map((l) => ({
    accountKey: l.accountKey,
    debit: l.credit,
    credit: l.debit,
    description: l.description ? `Reversión: ${l.description}` : 'Reversión',
    costCenterKey: l.costCenterKey ?? undefined,
    profitCenterKey: l.profitCenterKey ?? undefined,
    projectKey: l.projectKey ?? undefined,
    branchKey: l.branchKey ?? undefined,
    companyKey: l.companyKey ?? undefined,
    reference: l.reference ?? undefined,
    sourceDocumentKey: l.sourceDocumentKey ?? undefined,
    observations: l.observations ?? undefined,
  }));
}

export function toCsv(rows: Array<Record<string, unknown>>, columns: string[]): string {
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(','), ...rows.map((r) => columns.map((c) => escape(r[c])).join(','))].join('\n');
}
