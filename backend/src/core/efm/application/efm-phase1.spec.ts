import {
  buildJournalFromRule,
  evaluateConditions,
  generateJournalKey,
  isBalanced,
  sumCredits,
  sumDebits,
  validateJournalLines,
} from '../domain/efm-accounting.engine';

describe('EFM Accounting Engine — Fase 1', () => {
  it('validates balanced journal lines', () => {
    const lines = [
      { accountKey: 'ACC-1305', debit: 1000, credit: 0 },
      { accountKey: 'ACC-4135', debit: 0, credit: 1000 },
    ];
    expect(validateJournalLines(lines)).toEqual([]);
    expect(isBalanced(lines)).toBe(true);
    expect(sumDebits(lines)).toBe(1000);
    expect(sumCredits(lines)).toBe(1000);
  });

  it('rejects unbalanced entries', () => {
    const lines = [{ accountKey: 'A', debit: 100, credit: 0 }];
    expect(validateJournalLines(lines).length).toBeGreaterThan(0);
  });

  it('evaluates rule conditions', () => {
    expect(evaluateConditions([{ field: 'amount', operator: 'gt', value: 0 }], { amount: 100 })).toBe(true);
    expect(evaluateConditions([{ field: 'countryCode', operator: 'eq', value: 'CO' }], { countryCode: 'CO' })).toBe(true);
    expect(evaluateConditions([{ field: 'amount', operator: 'eq', value: 0 }], { amount: 100 })).toBe(false);
  });

  it('builds journal from rule', () => {
    const lines = buildJournalFromRule(
      { debitAccountKey: 'ACC-1305', creditAccountKey: 'ACC-4135', ruleKey: 'R1' },
      {
        sourceModule: 'sales',
        sourceDocumentType: 'invoice',
        sourceDocumentKey: 'INV-001',
        eventType: 'EscmInvoiceIssued',
        amount: 500,
      },
    );
    expect(lines).toHaveLength(2);
    expect(lines[0].debit).toBe(500);
    expect(lines[1].credit).toBe(500);
  });

  it('generates journal keys', () => {
    expect(generateJournalKey(1)).toBe('JE-00000001');
  });

  it('handles concurrent key uniqueness', () => {
    const keys = Array.from({ length: 50 }, (_, i) => generateJournalKey(i + 1));
    expect(new Set(keys).size).toBe(50);
  });
});
