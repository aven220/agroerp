import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EfmFoKpiService } from './efm-fo-kpi.service';
import { EfmFoStatementService } from './efm-fo-statement.service';
import { EfmBgAnalysisService } from './efm-bg-analysis.service';
import { buildTrendSeries, projectScenario, roundMoney } from '../domain/efm-financial-ops.engine';

@Injectable()
export class EfmFoAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kpis: EfmFoKpiService,
    private readonly statements: EfmFoStatementService,
    private readonly bgAnalysis: EfmBgAnalysisService,
  ) {}

  async monthlyCompare(organizationId: string, year: number, kpiCode = 'MARGIN_NET') {
    const snapshots = await this.prisma.efmFoKpiSnapshot.findMany({
      where: { organizationId, kpiCode, periodKey: { startsWith: String(year) } },
      orderBy: { periodKey: 'asc' },
    });
    return buildTrendSeries(snapshots.map((s) => ({ periodKey: s.periodKey, value: s.value })));
  }

  async annualCompare(organizationId: string, kpiCode: string, years: number[]) {
    const results = await Promise.all(
      years.map(async (year) => {
        const agg = await this.prisma.efmFoKpiSnapshot.aggregate({
          where: { organizationId, kpiCode, periodKey: { startsWith: String(year) } },
          _avg: { value: true },
        });
        return { year, avgValue: roundMoney(agg._avg.value ?? 0) };
      }),
    );
    return results;
  }

  async byCompany(organizationId: string, periodKey: string) {
    const statements = await this.statements.list(organizationId, { periodKey });
    const grouped = new Map<string, { netIncome: number; totalAssets: number }>();
    for (const s of statements) {
      const key = s.companyKey ?? 'CONSOLIDATED';
      grouped.set(key, {
        netIncome: (grouped.get(key)?.netIncome ?? 0) + (s.netIncome ?? 0),
        totalAssets: (grouped.get(key)?.totalAssets ?? 0) + (s.totalAssets ?? 0),
      });
    }
    return Array.from(grouped.entries()).map(([companyKey, vals]) => ({ companyKey, ...vals }));
  }

  async byBranch(organizationId: string, periodKey: string) {
    const statements = await this.prisma.efmFoStatement.findMany({
      where: { organizationId, periodKey, branchKey: { not: null } },
    });
    const grouped = new Map<string, number>();
    for (const s of statements) {
      const key = s.branchKey ?? 'UNASSIGNED';
      grouped.set(key, (grouped.get(key) ?? 0) + (s.netIncome ?? 0));
    }
    return Array.from(grouped.entries()).map(([branchKey, netIncome]) => ({ branchKey, netIncome }));
  }

  async byCostCenter(organizationId: string, budgetKey: string) {
    return this.bgAnalysis.byCostCenter(organizationId, budgetKey);
  }

  async byProject(organizationId: string, budgetKey: string) {
    return this.bgAnalysis.byProject(organizationId, budgetKey);
  }

  async trendAnalysis(organizationId: string, kpiCode: string, months = 12) {
    const snapshots = await this.prisma.efmFoKpiSnapshot.findMany({
      where: { organizationId, kpiCode },
      orderBy: { periodKey: 'desc' },
      take: months,
    });
    const points = snapshots.reverse().map((s) => ({ periodKey: s.periodKey, value: s.value }));
    return buildTrendSeries(points);
  }

  async projection(organizationId: string, horizonMonths = 12) {
    const year = new Date().getFullYear();
    const periodKey = `${year}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const income = await this.statements.list(organizationId, { periodKey, statementType: 'income_statement' });
    const latest = income[0];
    const revenue = latest?.lines?.filter((l) => l.sectionKey === 'REVENUE' && l.hierarchyLevel === 0)[0]?.amount ?? 0;
    const expenses = latest?.lines?.filter((l) => l.sectionKey === 'EXPENSE' && l.hierarchyLevel === 0)[0]?.amount ?? 0;

    return projectScenario(revenue * 12, expenses * 12, 5, 3, horizonMonths);
  }

  async simulateScenario(
    organizationId: string,
    userId: string,
    input: { name: string; basePeriodKey: string; horizonMonths?: number; revenueGrowthPct?: number; expenseGrowthPct?: number },
  ) {
    const income = await this.statements.list(organizationId, { periodKey: input.basePeriodKey, statementType: 'income_statement' });
    const latest = income[0];
    const revenue = latest?.lines?.filter((l) => l.sectionKey === 'REVENUE' && l.hierarchyLevel === 0)[0]?.amount ?? 0;
    const expenses = latest?.lines?.filter((l) => l.sectionKey === 'EXPENSE' && l.hierarchyLevel === 0)[0]?.amount ?? 0;

    const results = projectScenario(
      revenue * 12,
      expenses * 12,
      input.revenueGrowthPct ?? 0,
      input.expenseGrowthPct ?? 0,
      input.horizonMonths ?? 12,
    );

    const seq = (await this.prisma.efmFoScenario.count({ where: { organizationId } })) + 1;
    return this.prisma.efmFoScenario.create({
      data: {
        organizationId,
        scenarioKey: `SCN-${String(seq).padStart(8, '0')}`,
        name: input.name,
        basePeriodKey: input.basePeriodKey,
        horizonMonths: input.horizonMonths ?? 12,
        assumptions: {
          revenueGrowthPct: input.revenueGrowthPct ?? 0,
          expenseGrowthPct: input.expenseGrowthPct ?? 0,
        },
        results: { projection: results },
        createdBy: userId,
      },
    });
  }

  listScenarios(organizationId: string) {
    return this.prisma.efmFoScenario.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
