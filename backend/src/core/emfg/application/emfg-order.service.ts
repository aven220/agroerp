import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EmfgOrderOrigin, EmfgOrderPriority, EmfgOrderStatus } from '@prisma/client';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { canTransitionOrderStatus, generateEmfgKey, validateOrderRelease } from '../domain/emfg-manufacturing.engine';
import { EmfgAuditService } from './emfg-audit.service';
import { EmfgBomService } from './emfg-bom.service';
import { EmfgRoutingService } from './emfg-routing.service';
import { EmfgIntegrationService } from './emfg-integration.service';

@Injectable()
export class EmfgOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
    private readonly core: CoreEngineService,
    private readonly bom: EmfgBomService,
    private readonly routing: EmfgRoutingService,
    private readonly integration: EmfgIntegrationService,
  ) {}

  list(organizationId: string, filters?: { status?: EmfgOrderStatus; centerKey?: string }) {
    return this.prisma.emfgProductionOrder.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.centerKey ? { centerKey: filters.centerKey } : {}),
      },
      include: {
        materials: true,
        operations: { orderBy: { sequence: 'asc' } },
        progress: { orderBy: { recordedAt: 'desc' }, take: 5 },
      },
      orderBy: [{ priority: 'desc' }, { plannedStart: 'asc' }],
    });
  }

  get(organizationId: string, orderKey: string) {
    return this.prisma.emfgProductionOrder.findUnique({
      where: { organizationId_orderKey: { organizationId, orderKey } },
      include: {
        materials: true,
        operations: { orderBy: { sequence: 'asc' } },
        progress: { orderBy: { recordedAt: 'desc' } },
        schedules: true,
      },
    });
  }

  async create(organizationId: string, userId: string, payload: {
    itemKey: string; centerKey: string; plannedQty: number;
    bomKey?: string; routingKey?: string; lineKey?: string;
    origin?: EmfgOrderOrigin; priority?: EmfgOrderPriority;
    plannedStart?: string; plannedEnd?: string; responsibleKey?: string;
    planKey?: string; salesOrderKey?: string;
  }) {
    const seq = await this.prisma.emfgProductionOrder.count({ where: { organizationId } });
    const orderKey = generateEmfgKey('PO', seq + 1);
    const orderNumber = `OP-${String(seq + 1).padStart(5, '0')}`;

    let bomKey = payload.bomKey;
    if (!bomKey) {
      const defaultBom = await this.prisma.emfgBom.findFirst({
        where: { organizationId, itemKey: payload.itemKey, isDefault: true, isActive: true },
      });
      bomKey = defaultBom?.bomKey;
    }

    let routingKey = payload.routingKey;
    if (!routingKey) {
      const defaultRt = await this.prisma.emfgRouting.findFirst({
        where: { organizationId, itemKey: payload.itemKey, isDefault: true, isActive: true },
      });
      routingKey = defaultRt?.routingKey;
    }

    const order = await this.prisma.emfgProductionOrder.create({
      data: {
        organizationId,
        orderKey,
        orderNumber,
        itemKey: payload.itemKey,
        bomKey,
        routingKey,
        centerKey: payload.centerKey,
        lineKey: payload.lineKey,
        origin: payload.origin ?? 'manual',
        priority: payload.priority ?? 'normal',
        plannedQty: payload.plannedQty,
        plannedStart: payload.plannedStart ? new Date(payload.plannedStart) : undefined,
        plannedEnd: payload.plannedEnd ? new Date(payload.plannedEnd) : undefined,
        responsibleKey: payload.responsibleKey,
        planKey: payload.planKey,
        salesOrderKey: payload.salesOrderKey,
        createdBy: userId,
      },
    });

    if (bomKey) {
      const exploded = await this.bom.explode(organizationId, bomKey, payload.plannedQty);
      for (const mat of exploded) {
        const mSeq = await this.prisma.emfgProductionOrderMaterial.count({ where: { organizationId, orderKey } });
        await this.prisma.emfgProductionOrderMaterial.create({
          data: {
            organizationId,
            materialKey: generateEmfgKey('MAT', mSeq + 1),
            orderKey,
            componentKey: mat.componentKey,
            lineType: mat.lineType,
            requiredQty: mat.requiredQty,
            uomKey: mat.uomKey,
          },
        });
      }
    }

    if (routingKey) {
      const times = await this.routing.computeStandardTimes(routingKey, organizationId, payload.plannedQty);
      for (const t of times) {
        const op = await this.prisma.emfgRoutingOperation.findUnique({
          where: { organizationId_operationKey: { organizationId, operationKey: t.operationKey } },
        });
        if (!op) continue;
        await this.prisma.emfgProductionOrderOperation.create({
          data: {
            organizationId,
            orderOpKey: generateEmfgKey('OOP', t.sequence),
            orderKey,
            operationKey: t.operationKey,
            workCenterKey: t.workCenterKey,
            sequence: t.sequence,
            name: op.name,
            setupMinutes: op.setupMinutes,
            runMinutes: t.runMinutes,
          },
        });
      }
    }

    await this.audit.log(organizationId, 'EmfgProductionOrder', orderKey, 'created', userId, { origin: order.origin });
    await this.core.emitUserAction(organizationId, 'EmfgProductionOrder', orderKey, EVENT_TYPES.EMFG_ORDER_CREATED, { orderKey, itemKey: payload.itemKey });
    return this.get(organizationId, orderKey);
  }

  async updateStatus(organizationId: string, userId: string, orderKey: string, status: EmfgOrderStatus) {
    const order = await this.get(organizationId, orderKey);
    if (!order) throw new NotFoundException('Order not found');
    if (!canTransitionOrderStatus(order.status, status)) {
      throw new BadRequestException(`Cannot transition from ${order.status} to ${status}`);
    }
    const data: Record<string, unknown> = { status };
    if (status === 'in_progress' && !order.actualStart) data.actualStart = new Date();
    if (status === 'completed') {
      data.actualEnd = new Date();
      data.producedQty = order.plannedQty;
    }
    const updated = await this.prisma.emfgProductionOrder.update({
      where: { organizationId_orderKey: { organizationId, orderKey } },
      data,
    });
    await this.audit.log(organizationId, 'EmfgProductionOrder', orderKey, 'updated', userId, { status });
    await this.core.emitUserAction(organizationId, 'EmfgProductionOrder', orderKey, EVENT_TYPES.EMFG_ORDER_STATUS_CHANGED, { status });
    return updated;
  }

  async release(organizationId: string, userId: string, orderKey: string) {
    const order = await this.get(organizationId, orderKey);
    if (!order) throw new NotFoundException('Order not found');
    const errors = validateOrderRelease(order.status, order.plannedQty, order.materials.length);
    if (errors.length) throw new BadRequestException(errors.join(', '));

    const updated = await this.updateStatus(organizationId, userId, orderKey, 'released');
    await this.integration.onOrderReleased(organizationId, userId, order);
    await this.audit.log(organizationId, 'EmfgProductionOrder', orderKey, 'released', userId);
    await this.core.emitUserAction(organizationId, 'EmfgProductionOrder', orderKey, EVENT_TYPES.EMFG_ORDER_RELEASED, { orderKey });
    return updated;
  }

  async recordProgress(organizationId: string, userId: string, orderKey: string, payload: {
    orderOpKey?: string; qtyProduced?: number; qtyScrap?: number; notes?: string;
  }) {
    const order = await this.get(organizationId, orderKey);
    if (!order) throw new NotFoundException('Order not found');
    if (!['released', 'in_progress'].includes(order.status)) {
      throw new BadRequestException('Order not open for progress');
    }

    const seq = await this.prisma.emfgProductionOrderProgress.count({ where: { organizationId, orderKey } });
    const progressKey = generateEmfgKey('PRG', seq + 1);
    const qtyProduced = payload.qtyProduced ?? 0;
    const qtyScrap = payload.qtyScrap ?? 0;

    await this.prisma.emfgProductionOrderProgress.create({
      data: {
        organizationId,
        progressKey,
        orderKey,
        orderOpKey: payload.orderOpKey,
        qtyProduced,
        qtyScrap,
        notes: payload.notes,
        recordedBy: userId,
      },
    });

    const newProduced = order.producedQty + qtyProduced;
    const newScrap = order.scrapQty + qtyScrap;
    const newStatus: EmfgOrderStatus = newProduced >= order.plannedQty ? 'completed' : 'in_progress';

    await this.prisma.emfgProductionOrder.update({
      where: { organizationId_orderKey: { organizationId, orderKey } },
      data: {
        producedQty: newProduced,
        scrapQty: newScrap,
        status: newStatus,
        actualStart: order.actualStart ?? new Date(),
        actualEnd: newStatus === 'completed' ? new Date() : undefined,
      },
    });

    if (payload.orderOpKey) {
      await this.prisma.emfgProductionOrderOperation.updateMany({
        where: { organizationId, orderOpKey: payload.orderOpKey },
        data: { status: 'in_progress', actualStart: new Date() },
      });
    }

    await this.audit.log(organizationId, 'EmfgProductionOrder', orderKey, 'progress', userId, { qtyProduced, qtyScrap });
    await this.core.emitUserAction(organizationId, 'EmfgProductionOrder', orderKey, EVENT_TYPES.EMFG_ORDER_PROGRESS_RECORDED, { progressKey });
    return this.get(organizationId, orderKey);
  }

  async updateOperationStatus(organizationId: string, userId: string, orderOpKey: string, status: string) {
    const op = await this.prisma.emfgProductionOrderOperation.findUnique({
      where: { organizationId_orderOpKey: { organizationId, orderOpKey } },
    });
    if (!op) throw new NotFoundException('Operation not found');
    const updated = await this.prisma.emfgProductionOrderOperation.update({
      where: { organizationId_orderOpKey: { organizationId, orderOpKey } },
      data: {
        status: status as never,
        actualStart: status === 'in_progress' ? new Date() : op.actualStart,
        actualEnd: status === 'completed' ? new Date() : op.actualEnd,
      },
    });
    await this.audit.log(organizationId, 'EmfgProductionOrderOperation', orderOpKey, 'updated', userId, { status });
    return updated;
  }
}
