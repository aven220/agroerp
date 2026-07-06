import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { computeClosingBalance, toCsv } from '../domain/efm-voucher.engine';

export type LedgerFilters = {
  periodKey?: string;
  periodKeyFrom?: string;
  periodKeyTo?: string;
  companyKey?: string;
  branchKey?: string;
  accountKey?: string;
  accountKeys?: string[];
  comparePeriodKey?: string;
};

@Injectable()
export class EfmLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async query(organizationId: string, filters: LedgerFilters) {
    const accounts = await this.prisma.efmAccount.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(filters.accountKey ? { accountKey: filters.accountKey } : {}),
        ...(filters.accountKeys?.length ? { accountKey: { in: filters.accountKeys } } : {}),
      },
      orderBy: { code: 'asc' },
    });

    const periodKeys = await this.resolvePeriodKeys(organizationId, filters);
    const primaryPeriod = filters.periodKey ?? periodKeys[periodKeys.length - 1];

    const balances = await Promise.all(
      accounts.map((acc) => this.accountBalance(organizationId, acc, primaryPeriod, filters)),
    );

    let compare: typeof balances | undefined;
    if (filters.comparePeriodKey) {
      compare = await Promise.all(
        accounts.map((acc) => this.accountBalance(organizationId, acc, filters.comparePeriodKey!, filters)),
      );
    }

    return {
      periodKey: primaryPeriod,
      comparePeriodKey: filters.comparePeriodKey ?? null,
      accounts: balances.map((b, i) => ({
        ...b,
        compare: compare?.[i] ?? null,
        variance: compare?.[i]
          ? {
              openingBalance: b.openingBalance - compare[i].openingBalance,
              totalDebit: b.totalDebit - compare[i].totalDebit,
              totalCredit: b.totalCredit - compare[i].totalCredit,
              closingBalance: b.closingBalance - compare[i].closingBalance,
            }
          : null,
      })),
    };
  }

  async accountMovements(
    organizationId: string,
    accountKey: string,
    filters: LedgerFilters,
    limit = 5000,
  ) {
    const account = await this.prisma.efmAccount.findFirst({
      where: { organizationId, accountKey, isActive: true },
    });
    if (!account) throw new NotFoundException(`Cuenta ${accountKey} no encontrada`);

    const periodKey = filters.periodKey;
    const whereEntry: Record<string, unknown> = {
      organizationId,
      status: 'posted',
      ...(periodKey ? { periodKey } : {}),
      ...(filters.companyKey ? { companyKey: filters.companyKey } : {}),
      ...(filters.branchKey ? { branchKey: filters.branchKey } : {}),
    };

    const lines = await this.prisma.efmJournalLine.findMany({
      where: {
        accountKey,
        entry: whereEntry,
      },
      include: {
        entry: true,
      },
      orderBy: [{ entry: { entryDate: 'asc' } }, { lineNumber: 'asc' }],
      take: limit,
    });

    const balance = await this.accountBalance(organizationId, account, periodKey ?? '_all', filters);

    let running = balance.openingBalance;
    const movements = lines.map((l) => {
      if (account.nature === 'asset' || account.nature === 'expense') {
        running += l.debit - l.credit;
      } else {
        running += l.credit - l.debit;
      }
      return {
        entryKey: l.entry.entryKey,
        voucherNumber: l.entry.voucherNumber,
        entryDate: l.entry.entryDate.toISOString().slice(0, 10),
        periodKey: l.entry.periodKey,
        debit: l.debit,
        credit: l.credit,
        runningBalance: running,
        description: l.description ?? l.entry.description,
        sourceDocumentKey: l.sourceDocumentKey ?? l.entry.sourceDocumentKey,
        companyKey: l.companyKey ?? l.entry.companyKey,
        branchKey: l.branchKey ?? l.entry.branchKey,
        reference: l.reference ?? l.entry.reference,
      };
    });

    return { account: { accountKey, code: account.code, name: account.name, nature: account.nature }, balance, movements };
  }

  async exportCsv(organizationId: string, filters: LedgerFilters) {
    const result = await this.query(organizationId, filters);
    const columns = [
      'accountCode', 'accountName', 'openingBalance', 'totalDebit', 'totalCredit',
      'closingBalance', 'movementCount',
    ];
    const rows = result.accounts.map((a) => ({
      accountCode: a.accountCode,
      accountName: a.accountName,
      openingBalance: a.openingBalance,
      totalDebit: a.totalDebit,
      totalCredit: a.totalCredit,
      closingBalance: a.closingBalance,
      movementCount: a.movementCount,
    }));
    return {
      filename: `libro-mayor-${result.periodKey ?? 'all'}.csv`,
      contentType: 'text/csv',
      content: toCsv(rows, columns),
    };
  }

  private async accountBalance(
    organizationId: string,
    account: { accountKey: string; code: string; name: string; nature: string },
    periodKey: string,
    filters: LedgerFilters,
  ) {
    const period = periodKey !== '_all'
      ? await this.prisma.efmAccountingPeriod.findFirst({ where: { organizationId, periodKey } })
      : null;

    const priorWhere: Record<string, unknown> = {
      organizationId,
      status: 'posted',
      ...(filters.companyKey ? { companyKey: filters.companyKey } : {}),
      ...(filters.branchKey ? { branchKey: filters.branchKey } : {}),
    };
    if (period) {
      priorWhere.entryDate = { lt: period.startDate };
    }

    const priorLines = await this.prisma.efmJournalLine.findMany({
      where: {
        accountKey: account.accountKey,
        entry: priorWhere,
      },
      select: { debit: true, credit: true },
    });

    const openingDebit = priorLines.reduce((s, l) => s + l.debit, 0);
    const openingCredit = priorLines.reduce((s, l) => s + l.credit, 0);
    const openingBalance = computeClosingBalance(0, openingDebit, openingCredit, account.nature);

    const currentWhere: Record<string, unknown> = {
      organizationId,
      status: 'posted',
      ...(periodKey !== '_all' ? { periodKey } : {}),
      ...(filters.companyKey ? { companyKey: filters.companyKey } : {}),
      ...(filters.branchKey ? { branchKey: filters.branchKey } : {}),
    };

    const currentLines = await this.prisma.efmJournalLine.findMany({
      where: { accountKey: account.accountKey, entry: currentWhere },
      select: { debit: true, credit: true },
    });

    const totalDebit = currentLines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = currentLines.reduce((s, l) => s + l.credit, 0);
    const closingBalance = computeClosingBalance(openingBalance, totalDebit, totalCredit, account.nature);

    return {
      accountKey: account.accountKey,
      accountCode: account.code,
      accountName: account.name,
      openingBalance,
      totalDebit,
      totalCredit,
      closingBalance,
      movementCount: currentLines.length,
    };
  }

  private async resolvePeriodKeys(organizationId: string, filters: LedgerFilters) {
    if (filters.periodKey) return [filters.periodKey];
    const periods = await this.prisma.efmAccountingPeriod.findMany({
      where: {
        organizationId,
        ...(filters.periodKeyFrom ? { periodKey: { gte: filters.periodKeyFrom } } : {}),
        ...(filters.periodKeyTo ? { periodKey: { lte: filters.periodKeyTo } } : {}),
      },
      orderBy: { startDate: 'asc' },
      select: { periodKey: true },
    });
    return periods.map((p) => p.periodKey);
  }
}
