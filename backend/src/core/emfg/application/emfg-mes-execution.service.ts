import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EmfgExecutionAction, EmfgOrderStatus } from '@prisma/client';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import { canMesTransition, computeElapsedMinutes } from '../domain/emfg-mes.engine';
import { EmfgAuditService } from './emfg-audit.service';
import { EmfgIntegrationService } from './emfg-integration.service';

const ACTION_MAP: Record<string, EmfgExecutionAction> = {
  start: 'start',
  pause: 'pause',
  resume: 'resume',
  finish: 'finish',
  cancel: 'cancel',
  suspend: 'suspend',
};

const AUDIT_MAP: Record<string, 'started' | 'paused' | 'resumed' | 'suspended' | 'finished' | 'cancelled'> = {
  start: 'started',
  pause: 'paused',
  resume: 'resumed',
  suspend: 'suspended',
  finish: 'finished',
  cancel: 'cancelled',
};

@Injectable()
export class EmfgMesExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
    private readonly core: CoreEngineService,
    private readonly integration: EmfgIntegrationService,
  ) {}

  listExecutions(organizationId: string, orderKey: string) {
    return this.prisma.emfgOrderExecution.findMany({
      where: { organizationId, orderKey },
      orderBy: { createdAt: 'desc' },
    });
  }

  async execute(
    organizationId: string,
    userId: string,
    orderKey: string,
    action: string,
    payload?: { reason?: string; operatorKey?: string },
  ) {
    const order = await this.prisma.emfgProductionOrder.findUnique({
      where: { organizationId_orderKey: { organizationId, orderKey } },
      include: { materials: true },
    });
    if (!order) throw new NotFoundException('order_not_found');

    const transition = canMesTransition(order.status, action);
    if (!transition.ok || !transition.to) {
      throw new BadRequestException(`invalid_transition:${order.status}:${action}`);
    }

    const now = new Date();
    let elapsedAdd = 0;
    if (order.status === 'in_progress' && ['pause', 'finish', 'suspend', 'cancel'].includes(action)) {
      const lastStart = await this.prisma.emfgOrderExecution.findFirst({
        where: { organizationId, orderKey, action: 'start' },
        orderBy: { createdAt: 'desc' },
      });
      const lastResume = await this.prisma.emfgOrderExecution.findFirst({
        where: { organizationId, orderKey, action: 'resume' },
        orderBy: { createdAt: 'desc' },
      });
      const anchor = lastResume?.startedAt ?? lastStart?.startedAt ?? order.actualStart;
      if (anchor) elapsedAdd = computeElapsedMinutes(anchor, now);
    }

    const seq = await this.prisma.emfgOrderExecution.count({ where: { organizationId } });
    const executionKey = generateEmfgKey('EX', seq + 1);

    const updateData: {
      status: EmfgOrderStatus;
      actualStart?: Date;
      actualEnd?: Date;
      elapsedMinutes?: { increment: number };
    } = { status: transition.to as EmfgOrderStatus };

    if (action === 'start') updateData.actualStart = now;
    if (action === 'finish') updateData.actualEnd = now;
    if (elapsedAdd > 0) updateData.elapsedMinutes = { increment: elapsedAdd };

    const [execution] = await this.prisma.$transaction([
      this.prisma.emfgOrderExecution.create({
        data: {
          organizationId,
          executionKey,
          orderKey,
          action: ACTION_MAP[action],
          previousStatus: order.status,
          newStatus: transition.to as EmfgOrderStatus,
          reason: payload?.reason,
          elapsedMinutes: elapsedAdd,
          operatorKey: payload?.operatorKey,
          userId,
          startedAt: now,
          endedAt: ['pause', 'finish', 'suspend', 'cancel'].includes(action) ? now : undefined,
        },
      }),
      this.prisma.emfgProductionOrder.update({
        where: { organizationId_orderKey: { organizationId, orderKey } },
        data: updateData,
      }),
    ]);

    await this.audit.log(organizationId, 'EmfgProductionOrder', orderKey, AUDIT_MAP[action], userId, {
      action,
      previousStatus: order.status,
      newStatus: transition.to,
      elapsedMinutes: elapsedAdd,
    });

    await this.core.emitUserAction(
      organizationId,
      'EmfgProductionOrder',
      orderKey,
      EVENT_TYPES.EMFG_ORDER_STATUS_CHANGED,
      { action, status: transition.to },
    );

    if (action === 'finish') {
      await this.integration.onOrderCompleted(organizationId, orderKey, order.itemKey, order.producedQty);
      await this.core.emitUserAction(
        organizationId,
        'EmfgProductionOrder',
        orderKey,
        EVENT_TYPES.EMFG_MES_ORDER_FINISHED,
        { producedQty: order.producedQty, scrapQty: order.scrapQty },
      );
    }

    if (action === 'start') {
      await this.core.emitUserAction(
        organizationId,
        'EmfgProductionOrder',
        orderKey,
        EVENT_TYPES.EMFG_MES_ORDER_STARTED,
        { operatorKey: payload?.operatorKey },
      );
    }

    return execution;
  }
}
