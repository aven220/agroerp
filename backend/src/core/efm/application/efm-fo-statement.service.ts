import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EfmLedgerService } from './efm-ledger.service';
import { EfmTrCashflowService } from './efm-tr-cashflow.service';
import { EfmAuditService } from './efm-audit.service';
import {
  buildBalanceSheetLines,
  buildCashFlowLines,
  buildEquityChangesLines,
  buildIncomeStatementLines,
  DEFAULT_FO_STATEMENT_NOTES,
  generateFoKey,
  roundMoney,
  type AccountBalanceRow,
} from '../domain/efm-financial-ops.engine';
import type { EfmFoStatementType } from '@prisma/client';

export type GenerateStatementInput = {
  statementType: EfmFoStatementType;
  periodKey: string;
  comparePeriodKey?: string;
  companyKey?: string;
  branchKey?: string;
  isConsolidated?: boolean;
};

@Injectable()
export class EfmFoStatementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: EfmLedgerService,
    private readonly cashflow: EfmTrCashflowService,
    private readonly audit: EfmAuditService,
  ) {}

  list(organizationId: string, filters?: { periodKey?: string; statementType?: EfmFoStatementType; companyKey?: string }) {
    return this.prisma.efmFoStatement.findMany({
      where: {
        organizationId,
        ...(filters?.periodKey ? { periodKey: filters.periodKey } : {}),
        ...(filters?.statementType ? { statementType: filters.statementType } : {}),
        ...(filters?.companyKey ? { companyKey: filters.companyKey } : {}),
      },
      orderBy: { generatedAt: 'desc' },
      include: { lines: { orderBy: [{ sectionKey: 'asc' }, { hierarchyLevel: 'asc' }] }, notes: true },
    });
  }

  async get(organizationId: string, statementKey: string) {
    const stmt = await this.prisma.efmFoStatement.findFirst({
      where: { organizationId, statementKey },
      include: { lines: { orderBy: [{ sectionKey: 'asc' }, { hierarchyLevel: 'asc' }] }, notes: true },
    });
    if (!stmt) throw new NotFoundException(`Estado financiero ${statementKey} no encontrado`);
    return stmt;
  }

  async generate(organizationId: string, userId: string, input: GenerateStatementInput) {
    const seq = (await this.prisma.efmFoStatement.count({ where: { organizationId } })) + 1;
    const statementKey = generateFoKey('STMT', seq);
    const ledgerFilters = {
      periodKey: input.periodKey,
      comparePeriodKey: input.comparePeriodKey,
      companyKey: input.companyKey,
      branchKey: input.branchKey,
    };

    let lines: ReturnType<typeof buildBalanceSheetLines>;
    let totals: { totalAssets?: number; totalLiabilities?: number; totalEquity?: number; netIncome?: number } = {};

    if (input.statementType === 'balance_sheet' || input.statementType === 'consolidated') {
      const accountRows = await this.toAccountRows(organizationId, ledgerFilters);
      lines = buildBalanceSheetLines(accountRows);
      totals = {
        totalAssets: roundMoney(accountRows.filter((a) => a.nature === 'asset').reduce((s, a) => s + a.closingBalance, 0)),
        totalLiabilities: roundMoney(accountRows.filter((a) => a.nature === 'liability').reduce((s, a) => s + Math.abs(a.closingBalance), 0)),
        totalEquity: roundMoney(accountRows.filter((a) => a.nature === 'equity').reduce((s, a) => s + a.closingBalance, 0)),
      };
    } else if (input.statementType === 'income_statement') {
      const accountRows = await this.toAccountRows(organizationId, ledgerFilters, ['revenue', 'expense']);
      lines = buildIncomeStatementLines(accountRows);
      const revenue = accountRows.filter((a) => a.nature === 'revenue').reduce((s, a) => s + Math.abs(a.closingBalance), 0);
      const expenses = accountRows.filter((a) => a.nature === 'expense').reduce((s, a) => s + Math.abs(a.closingBalance), 0);
      totals = { netIncome: roundMoney(revenue - expenses) };
    } else if (input.statementType === 'cash_flow') {
      const cf = await this.buildCashFlowData(organizationId, input.periodKey);
      lines = buildCashFlowLines(cf.operating, cf.investing, cf.financing, cf.openingCash);
    } else if (input.statementType === 'equity_changes') {
      const accountRows = await this.toAccountRows(organizationId, ledgerFilters, ['equity']);
      const incomeRows = await this.toAccountRows(organizationId, ledgerFilters, ['revenue', 'expense']);
      const netIncome = buildIncomeStatementLines(incomeRows).find((l) => l.lineCode === 'NET-INCOME')?.amount ?? 0;
      const openingEquity = accountRows.reduce((s, a) => s + (a.compareBalance ?? a.closingBalance * 0.9), 0);
      lines = buildEquityChangesLines(openingEquity, netIncome, 0, 0);
      totals = { totalEquity: lines.find((l) => l.lineCode === 'EQ-CLOSE')?.amount };
    } else {
      throw new BadRequestException(`Tipo de estado no soportado: ${input.statementType}`);
    }

    const stmt = await this.prisma.efmFoStatement.create({
      data: {
        organizationId,
        statementKey,
        statementType: input.statementType,
        periodKey: input.periodKey,
        comparePeriodKey: input.comparePeriodKey,
        companyKey: input.companyKey,
        branchKey: input.branchKey,
        isConsolidated: input.isConsolidated ?? input.statementType === 'consolidated',
        totalAssets: totals.totalAssets,
        totalLiabilities: totals.totalLiabilities,
        totalEquity: totals.totalEquity,
        netIncome: totals.netIncome,
        generatedBy: userId,
      },
    });

    let lineSeq = 1;
    for (const line of lines) {
      await this.prisma.efmFoStatementLine.create({
        data: {
          organizationId,
          lineKey: generateFoKey('LN', lineSeq++),
          statementKey,
          sectionKey: line.sectionKey,
          lineCode: line.lineCode,
          lineName: line.lineName,
          accountKey: line.accountKey,
          amount: line.amount,
          compareAmount: line.compareAmount,
          variance: line.variance,
          hierarchyLevel: line.hierarchyLevel,
        },
      });
    }

    for (const note of DEFAULT_FO_STATEMENT_NOTES) {
      await this.prisma.efmFoStatementNote.create({
        data: {
          organizationId,
          noteKey: generateFoKey('NOTE', note.noteNumber),
          statementKey,
          noteNumber: note.noteNumber,
          title: note.title,
          content: note.content,
          createdBy: userId,
        },
      });
    }

    await this.audit.log(organizationId, 'EfmFoStatement', statementKey, 'generated', userId, {
      statementType: input.statementType,
      periodKey: input.periodKey,
    });

    return this.get(organizationId, statementKey);
  }

  async addNote(
    organizationId: string,
    statementKey: string,
    userId: string,
    input: { noteNumber: number; title: string; content: string },
  ) {
    await this.get(organizationId, statementKey);
    const noteKey = generateFoKey('NOTE', (await this.prisma.efmFoStatementNote.count({ where: { organizationId } })) + 1);
    return this.prisma.efmFoStatementNote.create({
      data: {
        organizationId,
        noteKey,
        statementKey,
        noteNumber: input.noteNumber,
        title: input.title,
        content: input.content,
        createdBy: userId,
      },
    });
  }

  private async toAccountRows(
    organizationId: string,
    filters: { periodKey?: string; comparePeriodKey?: string; companyKey?: string; branchKey?: string },
    natures?: string[],
  ): Promise<AccountBalanceRow[]> {
    const ledger = await this.ledger.query(organizationId, filters);
    const accounts = await this.prisma.efmAccount.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(natures?.length ? { nature: { in: natures as never[] } } : {}),
      },
    });
    const natureMap = new Map(accounts.map((a) => [a.accountKey, a.nature]));

    return ledger.accounts
      .filter((a) => !natures?.length || natures.includes(natureMap.get(a.accountKey) ?? ''))
      .map((a) => ({
        accountKey: a.accountKey,
        accountCode: a.accountCode,
        accountName: a.accountName,
        nature: natureMap.get(a.accountKey) ?? 'asset',
        closingBalance: a.closingBalance,
        compareBalance: a.compare?.closingBalance,
      }));
  }

  private async buildCashFlowData(organizationId: string, periodKey: string) {
    const period = await this.prisma.efmAccountingPeriod.findFirst({ where: { organizationId, periodKey } });
    const dateFrom = period?.startDate.toISOString().slice(0, 10) ?? `${periodKey}-01`;
    const dateTo = period?.endDate.toISOString().slice(0, 10) ?? `${periodKey}-28`;

    const monthly = await this.cashflow.monthly(organizationId, dateFrom, dateTo);
    const buckets = (monthly as { buckets?: Array<{ inflows: number; outflows: number }> }).buckets ?? [];
    const operating = roundMoney(buckets.reduce((s, b) => s + b.inflows - b.outflows, 0));

    const assetMovements = await this.prisma.efmJournalLine.aggregate({
      where: {
        accountKey: { startsWith: 'ACC-15' },
        entry: { organizationId, periodKey, status: 'posted' },
      },
      _sum: { debit: true, credit: true },
    });
    const investing = roundMoney((assetMovements._sum.credit ?? 0) - (assetMovements._sum.debit ?? 0));

    const liabilityMovements = await this.prisma.efmJournalLine.aggregate({
      where: {
        accountKey: { startsWith: 'ACC-21' },
        entry: { organizationId, periodKey, status: 'posted' },
      },
      _sum: { debit: true, credit: true },
    });
    const financing = roundMoney((liabilityMovements._sum.credit ?? 0) - (liabilityMovements._sum.debit ?? 0));

    const cashAccounts = await this.prisma.efmTrBankAccount.aggregate({
      where: { organizationId, isActive: true },
      _sum: { currentBalance: true },
    });
    const openingCash = roundMoney((cashAccounts._sum.currentBalance ?? 0) - operating - investing - financing);

    return { operating, investing, financing, openingCash: Math.max(0, openingCash) };
  }
}
