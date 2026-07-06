import {
  buildReversalLines,
  computeClosingBalance,
  formatVoucherNumber,
  toCsv,
} from '../domain/efm-voucher.engine';
import { isBalanced, validateJournalLines } from '../domain/efm-accounting.engine';

describe('EFM Voucher Engine — Fase 2', () => {
  it('formats voucher numbers with period', () => {
    expect(formatVoucherNumber('CM', 42, 6, '2026-07')).toBe('CM-2026-07-000042');
    expect(formatVoucherNumber('CA', 1, 4)).toBe('CA-0001');
  });

  it('computes closing balance by nature', () => {
    expect(computeClosingBalance(100, 50, 30, 'asset')).toBe(120);
    expect(computeClosingBalance(100, 50, 30, 'liability')).toBe(80);
  });

  it('builds reversal lines swapping debit/credit', () => {
    const original = [
      { accountKey: 'ACC-1305', debit: 1000, credit: 0, description: 'CxC' },
      { accountKey: 'ACC-4135', debit: 0, credit: 1000, description: 'Ingreso' },
    ];
    const reversed = buildReversalLines(original);
    expect(reversed[0].debit).toBe(0);
    expect(reversed[0].credit).toBe(1000);
    expect(reversed[1].debit).toBe(1000);
    expect(reversed[1].credit).toBe(0);
    expect(isBalanced(reversed)).toBe(true);
  });

  it('validates balanced manual voucher lines', () => {
    const lines = [
      { accountKey: 'A', debit: 500, credit: 0 },
      { accountKey: 'B', debit: 0, credit: 500 },
    ];
    expect(validateJournalLines(lines)).toEqual([]);
  });

  it('exports CSV with escaped values', () => {
    const csv = toCsv([{ a: 'hello, world', b: 1 }], ['a', 'b']);
    expect(csv).toContain('"hello, world"');
    expect(csv.split('\n')).toHaveLength(2);
  });

  it('generates unique concurrent voucher format keys', () => {
    const nums = Array.from({ length: 100 }, (_, i) => formatVoucherNumber('CM', i + 1, 6, '2026'));
    expect(new Set(nums).size).toBe(100);
  });
});
