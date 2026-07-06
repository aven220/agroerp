import { Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EfmAuditService } from './efm-audit.service';
import {
  buildPeriodKey,
  distributeAnnualToMonthly,
  generateBgKey,
} from '../domain/efm-budget.engine';

@Injectable()
export class EfmBgBudgetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EfmAuditService,
  ) {}

  list(organizationId: string, filters?: { fiscalYear?: number; status?: string; budgetType?: string }) {
    return this.prisma.efmBgBudget.findMany({
      where: {
        organizationId,
        ...(filters?.fiscalYear ? { fiscalYear: filters.fiscalYear } : {}),
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.budgetType ? { budgetType: filters.budgetType as never } : {}),
      },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 3 } },
      orderBy: [{ fiscalYear: 'desc' }, { createdAt: 'desc' }],
    });
  }

  getOne(organizationId: string, budgetKey: string) {
    return this.prisma.efmBgBudget.findFirst({
      where: { organizationId, budgetKey },
      include: {
        versions: { orderBy: { versionNumber: 'desc' } },
        lines: { take: 500, orderBy: [{ periodKey: 'asc' }, { accountKey: 'asc' }] },
      },
    });
  }

  async create(organizationId: string, userId: string, input: {
    name: string;
    budgetType: string;
    fiscalYear: number;
    scenario?: string;
    companyKey?: string;
    branchKey?: string;
    projectKey?: string;
    costCenterKey?: string;
    currencyKey?: string;
    lines?: Array<{
      periodKey: string;
      accountKey: string;
      costCenterKey?: string;
      projectKey?: string;
      branchKey?: string;
      budgetAmount: number;
    }>;
    generateMonthlyFromAnnual?: boolean;
    annualAmount?: number;
    accountKey?: string;
  }) {
    const seq = (await this.prisma.efmBgBudget.count({ where: { organizationId } })) + 1;
    const budgetKey = generateBgKey('BGT', seq);
    const versionKey = generateBgKey('VER', seq);

    let lines = input.lines ?? [];
    if (input.generateMonthlyFromAnnual && input.annualAmount && input.accountKey) {
      const monthly = distributeAnnualToMonthly(input.annualAmount);
      lines = monthly.map((amount, idx) => ({
        periodKey: buildPeriodKey(input.fiscalYear, idx + 1),
        accountKey: input.accountKey!,
        costCenterKey: input.costCenterKey,
        budgetAmount: amount,
      }));
    }

    const totalAmount = lines.reduce((s, l) => s + l.budgetAmount, 0);

    const budget = await this.prisma.efmBgBudget.create({
      data: {
        organizationId,
        budgetKey,
        name: input.name,
        budgetType: input.budgetType as never,
        fiscalYear: input.fiscalYear,
        scenario: (input.scenario ?? 'base') as never,
        companyKey: input.companyKey ?? 'CO-MAIN',
        branchKey: input.branchKey,
        projectKey: input.projectKey,
        costCenterKey: input.costCenterKey,
        currencyKey: input.currencyKey ?? 'COP',
        totalAmount,
        activeVersionKey: versionKey,
        status: 'draft',
        createdBy: userId,
      },
    });

    await this.prisma.efmBgBudgetVersion.create({
      data: {
        organizationId,
        versionKey,
        budgetKey,
        versionNumber: 1,
        name: 'Versión inicial',
        scenario: (input.scenario ?? 'base') as never,
        totalAmount,
        isActive: true,
        createdBy: userId,
      },
    });

    let lineSeq = (await this.prisma.efmBgBudgetLine.count({ where: { organizationId } })) + 1;
    for (const line of lines) {
      await this.prisma.efmBgBudgetLine.create({
        data: {
          organizationId,
          lineKey: generateBgKey('BLN', lineSeq++),
          budgetKey,
          versionKey,
          periodKey: line.periodKey,
          accountKey: line.accountKey,
          costCenterKey: line.costCenterKey ?? input.costCenterKey,
          projectKey: line.projectKey ?? input.projectKey,
          branchKey: line.branchKey ?? input.branchKey,
          budgetAmount: line.budgetAmount,
        },
      });
    }

    await this.audit.log(organizationId, 'EfmBgBudget', budgetKey, 'created', userId, { totalAmount });
    await this.core.emitUserAction(organizationId, 'EfmBgBudget', budgetKey, EVENT_TYPES.EFM_BG_BUDGET_CREATED, {
      totalAmount,
    });
    return this.getOne(organizationId, budgetKey);
  }

  async createVersion(organizationId: string, budgetKey: string, userId: string, input: {
    name: string;
    scenario?: string;
    copyFromVersionKey?: string;
  }) {
    const budget = await this.prisma.efmBgBudget.findFirst({ where: { organizationId, budgetKey } });
    if (!budget) throw new NotFoundException(`Presupuesto ${budgetKey} no encontrado`);

    const lastVersion = await this.prisma.efmBgBudgetVersion.findFirst({
      where: { organizationId, budgetKey },
      orderBy: { versionNumber: 'desc' },
    });
    const versionNumber = (lastVersion?.versionNumber ?? 0) + 1;
    const versionKey = generateBgKey('VER', (await this.prisma.efmBgBudgetVersion.count({ where: { organizationId } })) + 1);

    const sourceKey = input.copyFromVersionKey ?? budget.activeVersionKey;
    const sourceLines = sourceKey
      ? await this.prisma.efmBgBudgetLine.findMany({ where: { organizationId, versionKey: sourceKey } })
      : [];

    const totalAmount = sourceLines.reduce((s, l) => s + l.budgetAmount, 0);

    await this.prisma.efmBgBudgetVersion.updateMany({
      where: { organizationId, budgetKey },
      data: { isActive: false },
    });

    await this.prisma.efmBgBudgetVersion.create({
      data: {
        organizationId,
        versionKey,
        budgetKey,
        versionNumber,
        name: input.name,
        scenario: (input.scenario ?? budget.scenario) as never,
        totalAmount,
        isActive: true,
        createdBy: userId,
      },
    });

    let lineSeq = (await this.prisma.efmBgBudgetLine.count({ where: { organizationId } })) + 1;
    for (const line of sourceLines) {
      await this.prisma.efmBgBudgetLine.create({
        data: {
          organizationId,
          lineKey: generateBgKey('BLN', lineSeq++),
          budgetKey,
          versionKey,
          periodKey: line.periodKey,
          accountKey: line.accountKey,
          costCenterKey: line.costCenterKey,
          projectKey: line.projectKey,
          branchKey: line.branchKey,
          budgetAmount: line.budgetAmount,
        },
      });
    }

    await this.prisma.efmBgBudget.update({
      where: { id: budget.id },
      data: { activeVersionKey: versionKey, totalAmount, scenario: (input.scenario ?? budget.scenario) as never },
    });

    await this.audit.log(organizationId, 'EfmBgBudgetVersion', versionKey, 'created', userId, { versionNumber });
    await this.core.emitUserAction(organizationId, 'EfmBgBudgetVersion', versionKey, EVENT_TYPES.EFM_BG_VERSION_CREATED, {
      budgetKey,
    });
    return this.getOne(organizationId, budgetKey);
  }

  async approve(organizationId: string, budgetKey: string, userId: string) {
    const budget = await this.prisma.efmBgBudget.findFirst({ where: { organizationId, budgetKey } });
    if (!budget) throw new NotFoundException(`Presupuesto ${budgetKey} no encontrado`);

    const updated = await this.prisma.efmBgBudget.update({
      where: { id: budget.id },
      data: { status: 'active', approvedBy: userId, approvedAt: new Date() },
    });

    await this.prisma.efmBgBudgetVersion.updateMany({
      where: { organizationId, budgetKey, versionKey: budget.activeVersionKey ?? undefined },
      data: { status: 'active' },
    });

    await this.audit.log(organizationId, 'EfmBgBudget', budgetKey, 'approved', userId);
    await this.core.emitUserAction(organizationId, 'EfmBgBudget', budgetKey, EVENT_TYPES.EFM_BG_BUDGET_APPROVED, {});
    return updated;
  }

  async upsertLine(organizationId: string, budgetKey: string, userId: string, input: {
    lineKey?: string;
    periodKey: string;
    accountKey: string;
    costCenterKey?: string;
    budgetAmount: number;
  }) {
    const budget = await this.prisma.efmBgBudget.findFirst({ where: { organizationId, budgetKey } });
    if (!budget?.activeVersionKey) throw new NotFoundException(`Presupuesto ${budgetKey} sin versión activa`);

    const lineKey = input.lineKey ?? generateBgKey('BLN', (await this.prisma.efmBgBudgetLine.count({ where: { organizationId } })) + 1);

    const line = await this.prisma.efmBgBudgetLine.upsert({
      where: { organizationId_lineKey: { organizationId, lineKey } },
      create: {
        organizationId,
        lineKey,
        budgetKey,
        versionKey: budget.activeVersionKey,
        periodKey: input.periodKey,
        accountKey: input.accountKey,
        costCenterKey: input.costCenterKey,
        budgetAmount: input.budgetAmount,
      },
      update: { budgetAmount: input.budgetAmount },
    });

    const total = await this.prisma.efmBgBudgetLine.aggregate({
      where: { organizationId, budgetKey, versionKey: budget.activeVersionKey },
      _sum: { budgetAmount: true },
    });
    await this.prisma.efmBgBudget.update({
      where: { id: budget.id },
      data: { totalAmount: total._sum.budgetAmount ?? 0 },
    });

    await this.audit.log(organizationId, 'EfmBgBudgetLine', lineKey, 'upserted', userId);
    return line;
  }
}
