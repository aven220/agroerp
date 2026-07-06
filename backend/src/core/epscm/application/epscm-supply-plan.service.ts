import { Injectable } from '@nestjs/common';
import { EpscmSupplyPlanStatus } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EpscmAuditService } from './epscm-audit.service';
import { generateEpscmKey } from '../domain/epscm-planning.engine';

@Injectable()
export class EpscmSupplyPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EpscmAuditService,
  ) {}

  listPlans(organizationId: string, status?: EpscmSupplyPlanStatus) {
    return this.prisma.epscmSupplyPlan.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: { lines: true },
      take: 50,
    });
  }

  getPlan(organizationId: string, planKey: string) {
    return this.prisma.epscmSupplyPlan.findUniqueOrThrow({
      where: { organizationId_planKey: { organizationId, planKey } },
      include: { lines: { orderBy: { priority: 'desc' } } },
    });
  }

  async createPlan(
    organizationId: string,
    userId: string,
    input: {
      name: string;
      periodStart: Date;
      periodEnd: Date;
      dcKey?: string;
      companyKey?: string;
      priority?: number;
      constraints?: Record<string, unknown>;
    },
  ) {
    const seq = await this.prisma.epscmSupplyPlan.count({ where: { organizationId } });
    const plan = await this.prisma.epscmSupplyPlan.create({
      data: {
        organizationId,
        planKey: generateEpscmKey('SPL', seq + 1),
        name: input.name,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        dcKey: input.dcKey,
        companyKey: input.companyKey,
        priority: input.priority ?? 50,
        constraints: (input.constraints ?? {}) as object,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'EpscmSupplyPlan', plan.planKey, 'created', userId);
    return plan;
  }

  async addPlanLine(
    organizationId: string,
    planKey: string,
    input: {
      itemKey: string;
      plannedQty: number;
      warehouseKey?: string;
      priority?: number;
      scheduledDate?: Date;
    },
  ) {
    const seq = await this.prisma.epscmSupplyPlanLine.count({ where: { organizationId } });
    return this.prisma.epscmSupplyPlanLine.create({
      data: {
        organizationId,
        lineKey: generateEpscmKey('SPLN', seq + 1),
        planKey,
        itemKey: input.itemKey,
        plannedQty: input.plannedQty,
        warehouseKey: input.warehouseKey,
        priority: input.priority ?? 50,
        scheduledDate: input.scheduledDate,
      },
    });
  }

  async activatePlan(organizationId: string, userId: string, planKey: string) {
    const plan = await this.prisma.epscmSupplyPlan.update({
      where: { organizationId_planKey: { organizationId, planKey } },
      data: { status: EpscmSupplyPlanStatus.active, activatedAt: new Date() },
      include: { lines: true },
    });

    for (const line of plan.lines) {
      const calSeq = await this.prisma.epscmSupplyCalendar.count({ where: { organizationId } });
      await this.prisma.epscmSupplyCalendar.create({
        data: {
          organizationId,
          calendarKey: generateEpscmKey('CAL', calSeq + 1),
          planKey,
          itemKey: line.itemKey,
          eventType: 'supply',
          scheduledAt: line.scheduledDate ?? plan.periodStart,
          quantity: line.plannedQty,
          warehouseKey: line.warehouseKey,
        },
      });
    }

    await this.audit.log(organizationId, 'EpscmSupplyPlan', planKey, 'plan_activated', userId);
    return plan;
  }

  listCalendar(organizationId: string, from?: Date, to?: Date) {
    return this.prisma.epscmSupplyCalendar.findMany({
      where: {
        organizationId,
        ...(from || to ? {
          scheduledAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        } : {}),
      },
      orderBy: { scheduledAt: 'asc' },
      take: 500,
    });
  }
}
