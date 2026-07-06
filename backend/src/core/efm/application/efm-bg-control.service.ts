import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EfmAuditService } from './efm-audit.service';
import { computeAvailableBudget, generateBgKey } from '../domain/efm-budget.engine';

@Injectable()
export class EfmBgControlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EfmAuditService,
  ) {}

  async getAvailability(organizationId: string, filters: {
    budgetKey: string;
    periodKey: string;
    accountKey: string;
    costCenterKey?: string;
  }) {
    const budget = await this.prisma.efmBgBudget.findFirst({ where: { organizationId, budgetKey: filters.budgetKey } });
    if (!budget?.activeVersionKey) throw new NotFoundException(`Presupuesto ${filters.budgetKey} no encontrado`);

    const line = await this.prisma.efmBgBudgetLine.findFirst({
      where: {
        organizationId,
        budgetKey: filters.budgetKey,
        versionKey: budget.activeVersionKey,
        periodKey: filters.periodKey,
        accountKey: filters.accountKey,
        ...(filters.costCenterKey ? { costCenterKey: filters.costCenterKey } : {}),
      },
    });

    const budgetAmount = line?.budgetAmount ?? 0;
    const whereBase = {
      organizationId,
      budgetKey: filters.budgetKey,
      periodKey: filters.periodKey,
      accountKey: filters.accountKey,
      ...(filters.costCenterKey ? { costCenterKey: filters.costCenterKey } : {}),
    };

    const [committedAgg, obligatedAgg, executedAgg, reservedAgg] = await Promise.all([
      this.prisma.efmBgCommitment.aggregate({ where: { ...whereBase, status: 'active' }, _sum: { amount: true } }),
      this.prisma.efmBgObligation.aggregate({ where: { ...whereBase, status: 'active' }, _sum: { amount: true } }),
      this.prisma.efmBgExecution.aggregate({ where: { ...whereBase, status: 'active' }, _sum: { amount: true } }),
      this.prisma.efmBgReservation.aggregate({ where: { ...whereBase, status: 'active' }, _sum: { amount: true } }),
    ]);

    const committed = committedAgg._sum.amount ?? 0;
    const obligated = obligatedAgg._sum.amount ?? 0;
    const executed = executedAgg._sum.amount ?? 0;
    const reserved = reservedAgg._sum.amount ?? 0;

    return computeAvailableBudget({ budgetAmount, committed, obligated, executed, reserved });
  }

  async createCommitment(organizationId: string, userId: string, input: {
    budgetKey: string;
    periodKey: string;
    accountKey: string;
    costCenterKey?: string;
    amount: number;
    sourceModule: string;
    sourceDocumentKey: string;
    description: string;
  }) {
    const seq = (await this.prisma.efmBgCommitment.count({ where: { organizationId } })) + 1;
    const row = await this.prisma.efmBgCommitment.create({
      data: {
        organizationId,
        commitmentKey: generateBgKey('COM', seq),
        ...input,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'EfmBgCommitment', row.commitmentKey, 'created', userId, { amount: input.amount });
    return row;
  }

  async createObligation(organizationId: string, userId: string, input: {
    budgetKey: string;
    commitmentKey?: string;
    periodKey: string;
    accountKey: string;
    costCenterKey?: string;
    amount: number;
    sourceModule: string;
    sourceDocumentKey: string;
    description: string;
  }) {
    const seq = (await this.prisma.efmBgObligation.count({ where: { organizationId } })) + 1;
    const row = await this.prisma.efmBgObligation.create({
      data: {
        organizationId,
        obligationKey: generateBgKey('OBL', seq),
        ...input,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'EfmBgObligation', row.obligationKey, 'created', userId, { amount: input.amount });
    return row;
  }

  async createExecution(organizationId: string, userId: string, input: {
    budgetKey: string;
    obligationKey?: string;
    periodKey: string;
    accountKey: string;
    costCenterKey?: string;
    amount: number;
    sourceModule: string;
    sourceDocumentKey: string;
    accountingRef?: string;
    description: string;
  }) {
    const seq = (await this.prisma.efmBgExecution.count({ where: { organizationId } })) + 1;
    const row = await this.prisma.efmBgExecution.create({
      data: {
        organizationId,
        executionKey: generateBgKey('EXE', seq),
        ...input,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'EfmBgExecution', row.executionKey, 'created', userId, { amount: input.amount });
    return row;
  }

  async createReservation(organizationId: string, userId: string, input: {
    budgetKey: string;
    periodKey: string;
    accountKey: string;
    costCenterKey?: string;
    amount: number;
    sourceModule: string;
    sourceDocumentKey: string;
    description: string;
    expiresAt?: string;
  }) {
    const seq = (await this.prisma.efmBgReservation.count({ where: { organizationId } })) + 1;
    const row = await this.prisma.efmBgReservation.create({
      data: {
        organizationId,
        reservationKey: generateBgKey('RSV', seq),
        ...input,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'EfmBgReservation', row.reservationKey, 'created', userId, { amount: input.amount });
    return row;
  }

  async releaseReservation(organizationId: string, reservationKey: string, userId: string) {
    const row = await this.prisma.efmBgReservation.findFirst({ where: { organizationId, reservationKey } });
    if (!row) throw new NotFoundException(`Reserva ${reservationKey} no encontrada`);
    if (row.status !== 'active') throw new BadRequestException('Reserva no activa');

    const updated = await this.prisma.efmBgReservation.update({
      where: { id: row.id },
      data: { status: 'released', releasedAt: new Date() },
    });
    await this.audit.log(organizationId, 'EfmBgReservation', reservationKey, 'released', userId);
    return updated;
  }

  listCommitments(organizationId: string, budgetKey?: string) {
    return this.prisma.efmBgCommitment.findMany({
      where: { organizationId, ...(budgetKey ? { budgetKey } : {}) },
      orderBy: { committedAt: 'desc' },
      take: 200,
    });
  }

  listExecutions(organizationId: string, budgetKey?: string) {
    return this.prisma.efmBgExecution.findMany({
      where: { organizationId, ...(budgetKey ? { budgetKey } : {}) },
      orderBy: { executedAt: 'desc' },
      take: 200,
    });
  }
}
