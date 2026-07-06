import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EfmBgControlService } from './efm-bg-control.service';
import { computeVariance, projectClosing } from '../domain/efm-budget.engine';

@Injectable()
export class EfmBgAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly control: EfmBgControlService,
  ) {}

  async budgetVsExecuted(organizationId: string, budgetKey: string, periodKey?: string) {
    const budget = await this.prisma.efmBgBudget.findFirst({ where: { organizationId, budgetKey } });
    if (!budget?.activeVersionKey) return null;

    const lines = await this.prisma.efmBgBudgetLine.findMany({
      where: {
        organizationId,
        budgetKey,
        versionKey: budget.activeVersionKey,
        ...(periodKey ? { periodKey } : {}),
      },
    });

    const rows = await Promise.all(lines.map(async (line) => {
      const availability = await this.control.getAvailability(organizationId, {
        budgetKey,
        periodKey: line.periodKey,
        accountKey: line.accountKey,
        costCenterKey: line.costCenterKey ?? undefined,
      });
      const executed = availability.breakdown.executed;
      const variance = computeVariance(line.budgetAmount, executed, availability.breakdown.committed, availability.breakdown.obligated);
      return {
        lineKey: line.lineKey,
        periodKey: line.periodKey,
        accountKey: line.accountKey,
        costCenterKey: line.costCenterKey,
        ...variance,
        available: availability.available,
        utilizationPct: availability.utilizationPct,
      };
    }));

    const totals = rows.reduce(
      (acc, r) => ({
        budget: acc.budget + r.budget,
        executed: acc.executed + r.executed,
        committed: acc.committed + r.committed,
        obligated: acc.obligated + r.obligated,
      }),
      { budget: 0, executed: 0, committed: 0, obligated: 0 },
    );

    return {
      budgetKey,
      periodKey: periodKey ?? 'all',
      totals: computeVariance(totals.budget, totals.executed, totals.committed, totals.obligated),
      lines: rows,
    };
  }

  async byCostCenter(organizationId: string, budgetKey: string) {
    const report = await this.budgetVsExecuted(organizationId, budgetKey);
    if (!report) return null;

    const grouped = new Map<string, { budget: number; executed: number; committed: number; obligated: number }>();
    for (const line of report.lines) {
      const key = line.costCenterKey ?? 'UNASSIGNED';
      const cur = grouped.get(key) ?? { budget: 0, executed: 0, committed: 0, obligated: 0 };
      cur.budget += line.budget;
      cur.executed += line.executed;
      cur.committed += line.committed;
      cur.obligated += line.obligated;
      grouped.set(key, cur);
    }

    return Array.from(grouped.entries()).map(([costCenterKey, vals]) => ({
      costCenterKey,
      ...computeVariance(vals.budget, vals.executed, vals.committed, vals.obligated),
    }));
  }

  async byProject(organizationId: string, budgetKey: string) {
    const budget = await this.prisma.efmBgBudget.findFirst({ where: { organizationId, budgetKey } });
    if (!budget?.activeVersionKey) return [];

    const lines = await this.prisma.efmBgBudgetLine.findMany({
      where: { organizationId, budgetKey, versionKey: budget.activeVersionKey },
    });

    const grouped = new Map<string, number>();
    for (const line of lines) {
      const key = line.projectKey ?? budget.projectKey ?? 'UNASSIGNED';
      grouped.set(key, (grouped.get(key) ?? 0) + line.budgetAmount);
    }

    return Array.from(grouped.entries()).map(([projectKey, budgetAmount]) => ({ projectKey, budgetAmount }));
  }

  async closingProjection(organizationId: string, budgetKey: string) {
    const budget = await this.prisma.efmBgBudget.findFirst({ where: { organizationId, budgetKey } });
    if (!budget) return null;

    const report = await this.budgetVsExecuted(organizationId, budgetKey);
    if (!report) return null;

    const now = new Date();
    const startOfYear = new Date(budget.fiscalYear, 0, 1);
    const endOfYear = new Date(budget.fiscalYear, 11, 31);
    const daysElapsed = Math.max(1, Math.ceil((now.getTime() - startOfYear.getTime()) / 86400000));
    const totalDays = Math.ceil((endOfYear.getTime() - startOfYear.getTime()) / 86400000);

    const projection = projectClosing(report.totals.budget, report.totals.executed, daysElapsed, totalDays);

    return {
      budgetKey,
      fiscalYear: budget.fiscalYear,
      daysElapsed,
      totalDays,
      current: report.totals,
      projection,
    };
  }

  listAlerts(organizationId: string, resolved = false) {
    return this.prisma.efmBgAlert.findMany({
      where: { organizationId, isResolved: resolved },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
