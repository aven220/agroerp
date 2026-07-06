import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EfmAuditService } from './efm-audit.service';
import { generateBgKey } from '../domain/efm-budget.engine';

@Injectable()
export class EfmBgTransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EfmAuditService,
  ) {}

  list(organizationId: string, budgetKey?: string) {
    return this.prisma.efmBgTransfer.findMany({
      where: { organizationId, ...(budgetKey ? { budgetKey } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async create(organizationId: string, userId: string, input: {
    budgetKey: string;
    fromAccountKey: string;
    toAccountKey: string;
    fromCostCenterKey?: string;
    toCostCenterKey?: string;
    periodKey: string;
    amount: number;
    reason?: string;
    autoApprove?: boolean;
  }) {
    const budget = await this.prisma.efmBgBudget.findFirst({ where: { organizationId, budgetKey: input.budgetKey } });
    if (!budget?.activeVersionKey) throw new NotFoundException(`Presupuesto ${input.budgetKey} no encontrado`);

    const fromLine = await this.prisma.efmBgBudgetLine.findFirst({
      where: {
        organizationId,
        budgetKey: input.budgetKey,
        versionKey: budget.activeVersionKey,
        periodKey: input.periodKey,
        accountKey: input.fromAccountKey,
        costCenterKey: input.fromCostCenterKey ?? null,
      },
    });
    if (!fromLine || fromLine.budgetAmount < input.amount) {
      throw new BadRequestException('Saldo presupuestal insuficiente en cuenta origen');
    }

    const seq = (await this.prisma.efmBgTransfer.count({ where: { organizationId } })) + 1;
    const transfer = await this.prisma.efmBgTransfer.create({
      data: {
        organizationId,
        transferKey: generateBgKey('TFR', seq),
        ...input,
        createdBy: userId,
      },
    });

    if (input.autoApprove !== false) {
      return this.approve(organizationId, transfer.transferKey, userId);
    }
    return transfer;
  }

  async approve(organizationId: string, transferKey: string, userId: string) {
    const transfer = await this.prisma.efmBgTransfer.findFirst({ where: { organizationId, transferKey } });
    if (!transfer) throw new NotFoundException(`Traslado ${transferKey} no encontrado`);

    const budget = await this.prisma.efmBgBudget.findFirst({ where: { organizationId, budgetKey: transfer.budgetKey } });
    if (!budget?.activeVersionKey) throw new NotFoundException('Presupuesto no encontrado');

    const fromLine = await this.prisma.efmBgBudgetLine.findFirst({
      where: {
        organizationId,
        budgetKey: transfer.budgetKey,
        versionKey: budget.activeVersionKey,
        periodKey: transfer.periodKey,
        accountKey: transfer.fromAccountKey,
        costCenterKey: transfer.fromCostCenterKey ?? null,
      },
    });

    let toLine = await this.prisma.efmBgBudgetLine.findFirst({
      where: {
        organizationId,
        budgetKey: transfer.budgetKey,
        versionKey: budget.activeVersionKey,
        periodKey: transfer.periodKey,
        accountKey: transfer.toAccountKey,
        costCenterKey: transfer.toCostCenterKey ?? null,
      },
    });

    if (fromLine) {
      await this.prisma.efmBgBudgetLine.update({
        where: { id: fromLine.id },
        data: { budgetAmount: { decrement: transfer.amount } },
      });
    }

    if (toLine) {
      await this.prisma.efmBgBudgetLine.update({
        where: { id: toLine.id },
        data: { budgetAmount: { increment: transfer.amount } },
      });
    } else {
      const lineSeq = (await this.prisma.efmBgBudgetLine.count({ where: { organizationId } })) + 1;
      toLine = await this.prisma.efmBgBudgetLine.create({
        data: {
          organizationId,
          lineKey: generateBgKey('BLN', lineSeq),
          budgetKey: transfer.budgetKey,
          versionKey: budget.activeVersionKey,
          periodKey: transfer.periodKey,
          accountKey: transfer.toAccountKey,
          costCenterKey: transfer.toCostCenterKey,
          budgetAmount: transfer.amount,
        },
      });
    }

    const updated = await this.prisma.efmBgTransfer.update({
      where: { id: transfer.id },
      data: {
        status: 'completed',
        approvedBy: userId,
        approvedAt: new Date(),
        fromLineKey: fromLine?.lineKey,
        toLineKey: toLine.lineKey,
      },
    });

    await this.audit.log(organizationId, 'EfmBgTransfer', transferKey, 'completed', userId, { amount: transfer.amount });
    await this.core.emitUserAction(organizationId, 'EfmBgTransfer', transferKey, EVENT_TYPES.EFM_BG_TRANSFER_COMPLETED, {
      amount: transfer.amount,
    });
    return updated;
  }
}
