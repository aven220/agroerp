import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EmfgMasterPlanStatus, EmfgOrderOrigin, EmfgOrderPriority } from '@prisma/client';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { generateEmfgKey, horizonEndFromDays } from '../domain/emfg-manufacturing.engine';
import { EmfgAuditService } from './emfg-audit.service';
import { EmfgOrderService } from './emfg-order.service';

@Injectable()
export class EmfgMasterPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
    private readonly core: CoreEngineService,
    private readonly orders: EmfgOrderService,
  ) {}

  list(organizationId: string) {
    return this.prisma.emfgMasterPlan.findMany({
      where: { organizationId },
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  get(organizationId: string, planKey: string) {
    return this.prisma.emfgMasterPlan.findUnique({
      where: { organizationId_planKey: { organizationId, planKey } },
      include: { lines: true },
    });
  }

  async create(organizationId: string, userId: string, payload: {
    name: string; horizonDays?: number; horizonStart?: string; calendarKey?: string; priority?: EmfgOrderPriority;
  }) {
    const seq = await this.prisma.emfgMasterPlan.count({ where: { organizationId } });
    const planKey = generateEmfgKey('MPS', seq + 1);
    const start = payload.horizonStart ? new Date(payload.horizonStart) : new Date();
    const days = payload.horizonDays ?? 90;
    const plan = await this.prisma.emfgMasterPlan.create({
      data: {
        organizationId,
        planKey,
        name: payload.name,
        horizonDays: days,
        horizonStart: start,
        horizonEnd: horizonEndFromDays(start, days),
        calendarKey: payload.calendarKey,
        priority: payload.priority ?? 'normal',
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'EmfgMasterPlan', planKey, 'created', userId);
    await this.core.emitUserAction(organizationId, 'EmfgMasterPlan', planKey, EVENT_TYPES.EMFG_MASTER_PLAN_CREATED, { planKey });
    return plan;
  }

  async addLine(organizationId: string, userId: string, planKey: string, payload: {
    itemKey: string; plannedQty: number; periodStart: string; periodEnd: string;
    bomKey?: string; routingKey?: string; priority?: EmfgOrderPriority;
  }) {
    const plan = await this.get(organizationId, planKey);
    if (!plan) throw new NotFoundException('Master plan not found');
    const seq = await this.prisma.emfgMasterPlanLine.count({ where: { organizationId, planKey } });
    const lineKey = generateEmfgKey('MPL', seq + 1);
    const line = await this.prisma.emfgMasterPlanLine.create({
      data: {
        organizationId,
        lineKey,
        planKey,
        itemKey: payload.itemKey,
        bomKey: payload.bomKey,
        routingKey: payload.routingKey,
        plannedQty: payload.plannedQty,
        periodStart: new Date(payload.periodStart),
        periodEnd: new Date(payload.periodEnd),
        priority: payload.priority ?? plan.priority,
      },
    });
    await this.audit.log(organizationId, 'EmfgMasterPlanLine', lineKey, 'created', userId, { planKey });
    return line;
  }

  async activate(organizationId: string, userId: string, planKey: string) {
    const plan = await this.get(organizationId, planKey);
    if (!plan) throw new NotFoundException('Master plan not found');
    if (plan.status !== 'draft' && plan.status !== 'frozen') {
      throw new BadRequestException('Plan cannot be activated from current status');
    }
    const updated = await this.prisma.emfgMasterPlan.update({
      where: { organizationId_planKey: { organizationId, planKey } },
      data: { status: 'active' },
    });
    await this.audit.log(organizationId, 'EmfgMasterPlan', planKey, 'updated', userId, { status: 'active' });
    await this.core.emitUserAction(organizationId, 'EmfgMasterPlan', planKey, EVENT_TYPES.EMFG_MASTER_PLAN_ACTIVATED, { planKey });
    return updated;
  }

  async generateOrders(organizationId: string, userId: string, planKey: string, centerKey: string) {
    const plan = await this.get(organizationId, planKey);
    if (!plan) throw new NotFoundException('Master plan not found');
    if (plan.status !== 'active') throw new BadRequestException('Plan must be active');

    const created = [];
    for (const line of plan.lines) {
      const order = await this.orders.create(organizationId, userId, {
        itemKey: line.itemKey,
        bomKey: line.bomKey ?? undefined,
        routingKey: line.routingKey ?? undefined,
        centerKey,
        plannedQty: line.plannedQty,
        origin: 'master_plan' as EmfgOrderOrigin,
        priority: line.priority,
        planKey,
        plannedStart: line.periodStart.toISOString(),
        plannedEnd: line.periodEnd.toISOString(),
      });
      created.push(order);
    }
    await this.core.emitUserAction(organizationId, 'EmfgMasterPlan', planKey, EVENT_TYPES.EMFG_ORDERS_GENERATED, { count: created.length });
    return { planKey, ordersCreated: created.length, orders: created };
  }
}
