import { BadRequestException, Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EfmAuditService } from './efm-audit.service';
import { EfmBgControlService } from './efm-bg-control.service';
import { generateBgKey, validateBudgetAvailability } from '../domain/efm-budget.engine';

export type BudgetCheckInput = {
  periodKey: string;
  accountKey: string;
  costCenterKey?: string;
  amount: number;
  sourceModule: string;
  sourceDocumentKey: string;
  companyKey?: string;
  description?: string;
  userId?: string;
  allowException?: boolean;
};

@Injectable()
export class EfmBgValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EfmAuditService,
    private readonly control: EfmBgControlService,
  ) {}

  async resolveActiveBudget(organizationId: string, filters?: { companyKey?: string; fiscalYear?: number }) {
    const year = filters?.fiscalYear ?? new Date().getFullYear();
    return this.prisma.efmBgBudget.findFirst({
      where: {
        organizationId,
        status: 'active',
        fiscalYear: year,
        ...(filters?.companyKey ? { companyKey: filters.companyKey } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getControlRule(organizationId: string, sourceModule: string, companyKey?: string) {
    return this.prisma.efmBgControlRule.findFirst({
      where: {
        organizationId,
        isActive: true,
        sourceModule,
        OR: [{ companyKey: null }, { companyKey: companyKey ?? 'CO-MAIN' }],
      },
    });
  }

  async checkAndReserve(organizationId: string, input: BudgetCheckInput): Promise<{
    allowed: boolean;
    budgetKey?: string;
    available?: number;
    shortfall?: number;
    exceptionKey?: string;
    reservationKey?: string;
  }> {
    const budget = await this.resolveActiveBudget(organizationId, { companyKey: input.companyKey });
    if (!budget) return { allowed: true };

    const rule = await this.getControlRule(organizationId, input.sourceModule, input.companyKey);
    const tolerance = rule?.tolerancePercent ?? 0;

    const availability = await this.control.getAvailability(organizationId, {
      budgetKey: budget.budgetKey,
      periodKey: input.periodKey,
      accountKey: input.accountKey,
      costCenterKey: input.costCenterKey,
    });

    const check = validateBudgetAvailability(availability.available, input.amount, tolerance);

    if (check.allowed) {
      const reservation = await this.control.createReservation(organizationId, input.userId ?? 'system', {
        budgetKey: budget.budgetKey,
        periodKey: input.periodKey,
        accountKey: input.accountKey,
        costCenterKey: input.costCenterKey,
        amount: input.amount,
        sourceModule: input.sourceModule,
        sourceDocumentKey: input.sourceDocumentKey,
        description: input.description ?? `Reserva ${input.sourceDocumentKey}`,
      });
      return {
        allowed: true,
        budgetKey: budget.budgetKey,
        available: availability.available,
        reservationKey: reservation.reservationKey,
      };
    }

    if (rule?.allowExceptions && input.allowException !== false) {
      const exception = await this.requestException(organizationId, input.userId ?? 'system', {
        budgetKey: budget.budgetKey,
        periodKey: input.periodKey,
        accountKey: input.accountKey,
        costCenterKey: input.costCenterKey,
        requestedAmount: input.amount,
        sourceModule: input.sourceModule,
        sourceDocumentKey: input.sourceDocumentKey,
        reason: `Disponibilidad insuficiente: falta ${check.shortfall}`,
      });
      return {
        allowed: false,
        budgetKey: budget.budgetKey,
        available: availability.available,
        shortfall: check.shortfall,
        exceptionKey: exception.exceptionKey,
      };
    }

    if (rule?.enforceHardBlock !== false) {
      await this.audit.log(organizationId, 'EfmBgValidation', input.sourceDocumentKey, 'blocked', input.userId ?? 'system', {
        shortfall: check.shortfall,
        amount: input.amount,
      });
      await this.createAlert(organizationId, budget.budgetKey, input.periodKey, check.shortfall, availability.utilizationPct);
      throw new BadRequestException(
        `Disponibilidad presupuestal insuficiente. Disponible: ${availability.available}, solicitado: ${input.amount}, faltante: ${check.shortfall}`,
      );
    }

    return { allowed: false, budgetKey: budget.budgetKey, available: availability.available, shortfall: check.shortfall };
  }

  async validateOnly(organizationId: string, input: BudgetCheckInput) {
    const budget = await this.resolveActiveBudget(organizationId, { companyKey: input.companyKey });
    if (!budget) return { allowed: true, budgetKey: null as string | null, available: Infinity };

    const rule = await this.getControlRule(organizationId, input.sourceModule, input.companyKey);
    const availability = await this.control.getAvailability(organizationId, {
      budgetKey: budget.budgetKey,
      periodKey: input.periodKey,
      accountKey: input.accountKey,
      costCenterKey: input.costCenterKey,
    });

    const check = validateBudgetAvailability(availability.available, input.amount, rule?.tolerancePercent ?? 0);
    return {
      allowed: check.allowed,
      budgetKey: budget.budgetKey,
      available: availability.available,
      shortfall: check.shortfall,
      utilizationPct: availability.utilizationPct,
    };
  }

  async requestException(organizationId: string, userId: string, input: {
    budgetKey: string;
    periodKey: string;
    accountKey: string;
    costCenterKey?: string;
    requestedAmount: number;
    sourceModule: string;
    sourceDocumentKey: string;
    reason: string;
  }) {
    const seq = (await this.prisma.efmBgException.count({ where: { organizationId } })) + 1;
    const row = await this.prisma.efmBgException.create({
      data: {
        organizationId,
        exceptionKey: generateBgKey('EXC', seq),
        ...input,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'EfmBgException', row.exceptionKey, 'requested', userId);
    await this.core.emitUserAction(organizationId, 'EfmBgException', row.exceptionKey, EVENT_TYPES.EFM_BG_EXCEPTION_REQUESTED, {
      requestedAmount: input.requestedAmount,
    });
    return row;
  }

  async approveException(organizationId: string, exceptionKey: string, userId: string, approvedAmount?: number) {
    const row = await this.prisma.efmBgException.findFirst({ where: { organizationId, exceptionKey } });
    if (!row) throw new BadRequestException(`Excepción ${exceptionKey} no encontrada`);

    const updated = await this.prisma.efmBgException.update({
      where: { id: row.id },
      data: {
        status: 'approved',
        approvedAmount: approvedAmount ?? row.requestedAmount,
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });

    await this.audit.log(organizationId, 'EfmBgException', exceptionKey, 'approved', userId);
    await this.core.emitUserAction(organizationId, 'EfmBgException', exceptionKey, EVENT_TYPES.EFM_BG_EXCEPTION_APPROVED, {});
    return updated;
  }

  listPendingExceptions(organizationId: string) {
    return this.prisma.efmBgException.findMany({
      where: { organizationId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async seedRules(organizationId: string, userId: string) {
    const { DEFAULT_BG_CONTROL_RULES } = await import('../domain/efm-budget.engine');
    for (const rule of DEFAULT_BG_CONTROL_RULES) {
      await this.prisma.efmBgControlRule.upsert({
        where: { organizationId_ruleKey: { organizationId, ruleKey: rule.ruleKey } },
        create: { organizationId, ...rule },
        update: { isActive: true },
      });
    }
    await this.audit.log(organizationId, 'EfmBgControlRule', 'seed', 'completed', userId);
    return this.prisma.efmBgControlRule.findMany({ where: { organizationId, isActive: true } });
  }

  private async createAlert(organizationId: string, budgetKey: string, periodKey: string, shortfall: number, utilizationPct: number) {
    const seq = (await this.prisma.efmBgAlert.count({ where: { organizationId } })) + 1;
    await this.prisma.efmBgAlert.create({
      data: {
        organizationId,
        alertKey: generateBgKey('ALT', seq),
        alertType: 'over_budget',
        severity: utilizationPct >= 100 ? 'critical' : 'warning',
        budgetKey,
        periodKey,
        message: `Sobre-ejecución presupuestal. Faltante: ${shortfall}`,
        currentPct: utilizationPct,
        thresholdPct: 100,
      },
    });
  }
}
