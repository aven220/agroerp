import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EfmAuditService } from './efm-audit.service';
import { EfmBgDimensionService } from './efm-bg-dimension.service';
import { EfmBgBudgetService } from './efm-bg-budget.service';
import { EfmBgValidationService } from './efm-bg-validation.service';

@Injectable()
export class EfmBgCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EfmAuditService,
    private readonly dimensions: EfmBgDimensionService,
    private readonly budgets: EfmBgBudgetService,
    private readonly validation: EfmBgValidationService,
  ) {}

  async center(organizationId: string) {
    const year = new Date().getFullYear();
    const [
      budgetCount,
      activeBudgets,
      pendingExceptions,
      openAlerts,
      totalBudgetAmount,
      totalCommitted,
      totalExecuted,
      recentTransfers,
      activeBudgetList,
    ] = await Promise.all([
      this.prisma.efmBgBudget.count({ where: { organizationId } }),
      this.prisma.efmBgBudget.count({ where: { organizationId, status: 'active' } }),
      this.prisma.efmBgException.count({ where: { organizationId, status: 'pending' } }),
      this.prisma.efmBgAlert.count({ where: { organizationId, isResolved: false } }),
      this.prisma.efmBgBudget.aggregate({ where: { organizationId, status: 'active' }, _sum: { totalAmount: true } }),
      this.prisma.efmBgCommitment.aggregate({ where: { organizationId, status: 'active' }, _sum: { amount: true } }),
      this.prisma.efmBgExecution.aggregate({ where: { organizationId, status: 'active' }, _sum: { amount: true } }),
      this.prisma.efmBgTransfer.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' }, take: 5 }),
      this.prisma.efmBgBudget.findMany({
        where: { organizationId, status: 'active', fiscalYear: year },
        take: 5,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const executed = totalExecuted._sum.amount ?? 0;
    const budgetTotal = totalBudgetAmount._sum.totalAmount ?? 0;
    const compliancePct = budgetTotal > 0 ? Math.round((executed / budgetTotal) * 10000) / 100 : 0;

    return {
      budgetCount,
      activeBudgets,
      pendingExceptions,
      openAlerts,
      totalBudgetAmount: budgetTotal,
      totalCommitted: totalCommitted._sum.amount ?? 0,
      totalExecuted: executed,
      compliancePct,
      recentTransfers,
      activeBudgetList,
      fiscalYear: year,
    };
  }

  async seed(organizationId: string, userId: string) {
    await this.dimensions.seed(organizationId, userId);
    await this.validation.seedRules(organizationId, userId);

    const year = new Date().getFullYear();
    const existing = await this.prisma.efmBgBudget.count({ where: { organizationId, fiscalYear: year } });
    if (existing === 0) {
      const budget = await this.budgets.create(organizationId, userId, {
        name: `Presupuesto operativo ${year}`,
        budgetType: 'annual',
        fiscalYear: year,
        scenario: 'base',
        companyKey: 'CO-MAIN',
        generateMonthlyFromAnnual: true,
        annualAmount: 600000000,
        accountKey: 'ACC-6135',
        costCenterKey: 'CC-OPS',
      });
      await this.budgets.approve(organizationId, budget!.budgetKey, userId);

      await this.budgets.create(organizationId, userId, {
        name: `Presupuesto conservador ${year}`,
        budgetType: 'annual',
        fiscalYear: year,
        scenario: 'conservative',
        companyKey: 'CO-MAIN',
        generateMonthlyFromAnnual: true,
        annualAmount: 540000000,
        accountKey: 'ACC-6135',
        costCenterKey: 'CC-ADMIN',
      });
    }

    await this.audit.log(organizationId, 'EfmBgConfig', 'seed', 'completed', userId);
    return this.center(organizationId);
  }
}
