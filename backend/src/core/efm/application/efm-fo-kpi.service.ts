import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EfmLedgerService } from './efm-ledger.service';
import { EfmBgAnalysisService } from './efm-bg-analysis.service';
import { EfmTrCashflowService } from './efm-tr-cashflow.service';
import { computeFinancialKpis, generateFoKey, roundMoney } from '../domain/efm-financial-ops.engine';

@Injectable()
export class EfmFoKpiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: EfmLedgerService,
    private readonly bgAnalysis: EfmBgAnalysisService,
    private readonly cashflow: EfmTrCashflowService,
  ) {}

  list(organizationId: string, periodKey?: string, companyKey?: string) {
    return this.prisma.efmFoKpiSnapshot.findMany({
      where: {
        organizationId,
        ...(periodKey ? { periodKey } : {}),
        ...(companyKey ? { companyKey } : {}),
      },
      orderBy: [{ periodKey: 'desc' }, { kpiCategory: 'asc' }, { kpiCode: 'asc' }],
    });
  }

  async calculate(organizationId: string, periodKey: string, companyKey?: string) {
    const ledger = await this.ledger.query(organizationId, { periodKey, companyKey });
    const accounts = await this.prisma.efmAccount.findMany({ where: { organizationId, isActive: true } });
    const natureMap = new Map(accounts.map((a) => [a.accountKey, a.nature]));
    const codeMap = new Map(accounts.map((a) => [a.accountKey, a.code]));

    const sumByPrefix = (prefix: string) => ledger.accounts
      .filter((a) => codeMap.get(a.accountKey)?.startsWith(prefix))
      .reduce((s, a) => s + Math.abs(a.closingBalance), 0);

    const sumByNature = (nature: string) => ledger.accounts
      .filter((a) => natureMap.get(a.accountKey) === nature)
      .reduce((s, a) => s + Math.abs(a.closingBalance), 0);

    const currentAssets = sumByPrefix('11') + sumByPrefix('13') + sumByPrefix('14');
    const currentLiabilities = sumByPrefix('22') + sumByPrefix('23');
    const inventory = sumByPrefix('14');
    const totalAssets = sumByNature('asset');
    const totalLiabilities = sumByNature('liability');
    const totalEquity = sumByNature('equity');
    const revenue = sumByNature('revenue');
    const cogs = sumByPrefix('61') + sumByPrefix('62');
    const operatingExpenses = sumByPrefix('51') + sumByPrefix('52') + sumByPrefix('53');
    const netIncome = roundMoney(revenue - sumByNature('expense'));
    const accountsReceivable = sumByPrefix('13');
    const accountsPayable = sumByPrefix('22');

    const budgetAgg = await this.prisma.efmBgBudget.aggregate({
      where: { organizationId, status: 'active' },
      _sum: { totalAmount: true },
    });
    const execAgg = await this.prisma.efmBgExecution.aggregate({
      where: { organizationId, status: 'active', periodKey },
      _sum: { amount: true },
    });

    const period = await this.prisma.efmAccountingPeriod.findFirst({ where: { organizationId, periodKey } });
    const dateFrom = period?.startDate.toISOString().slice(0, 10) ?? `${periodKey}-01`;
    const dateTo = period?.endDate.toISOString().slice(0, 10) ?? `${periodKey}-28`;
    const cf = await this.cashflow.monthly(organizationId, dateFrom, dateTo);
    const buckets = (cf as { buckets?: Array<{ inflows: number; outflows: number }> }).buckets ?? [];
    const netCashFlow = roundMoney(buckets.reduce((s, b) => s + b.inflows - b.outflows, 0));

    const bankAgg = await this.prisma.efmTrBankAccount.aggregate({
      where: { organizationId, isActive: true },
      _sum: { currentBalance: true },
    });

    const kpiInput = {
      currentAssets,
      currentLiabilities,
      inventory,
      totalAssets,
      totalLiabilities,
      totalEquity,
      revenue,
      cogs,
      operatingExpenses,
      netIncome,
      accountsReceivable,
      accountsPayable,
      budgetAmount: budgetAgg._sum.totalAmount ?? 0,
      budgetExecuted: execAgg._sum.amount ?? 0,
      netCashFlow,
      openingCash: bankAgg._sum.currentBalance ?? 0,
    };

    const kpis = computeFinancialKpis(kpiInput);
    const snapshots = [];

    for (const kpi of kpis) {
      const snapshotKey = generateFoKey('KPI', snapshots.length + 1);
      const existing = await this.prisma.efmFoKpiSnapshot.findFirst({
        where: { organizationId, periodKey, kpiCode: kpi.kpiCode, companyKey: companyKey ?? null },
      });

      const data = {
        kpiName: kpi.kpiName,
        kpiCategory: kpi.kpiCategory,
        value: kpi.value,
        target: kpi.target,
        unit: kpi.unit,
        trend: kpi.trend,
        metadata: { calculatedFrom: periodKey },
      };

      const snapshot = existing
        ? await this.prisma.efmFoKpiSnapshot.update({ where: { id: existing.id }, data })
        : await this.prisma.efmFoKpiSnapshot.create({
            data: {
              organizationId,
              snapshotKey,
              periodKey,
              companyKey,
              kpiCode: kpi.kpiCode,
              ...data,
            },
          });
      snapshots.push(snapshot);
    }

    return snapshots;
  }

  async dashboard(organizationId: string, periodKey?: string) {
    const pk = periodKey ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    let kpis = await this.list(organizationId, pk);
    if (kpis.length === 0) {
      kpis = await this.calculate(organizationId, pk);
    }

    const grouped = new Map<string, typeof kpis>();
    for (const k of kpis) {
      const list = grouped.get(k.kpiCategory) ?? [];
      list.push(k);
      grouped.set(k.kpiCategory, list);
    }

    return {
      periodKey: pk,
      categories: Array.from(grouped.entries()).map(([category, items]) => ({ category, items })),
      totals: kpis.length,
    };
  }
}
