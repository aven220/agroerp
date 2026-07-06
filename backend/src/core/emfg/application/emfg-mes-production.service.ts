import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EmfgOutputType } from '@prisma/client';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import { computeYieldPct } from '../domain/emfg-mes.engine';
import { EmfgAuditService } from './emfg-audit.service';
import { EmfgIntegrationService } from './emfg-integration.service';
import { EmfgMesTraceabilityService } from './emfg-mes-traceability.service';

@Injectable()
export class EmfgMesProductionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
    private readonly core: CoreEngineService,
    private readonly integration: EmfgIntegrationService,
    private readonly traceability: EmfgMesTraceabilityService,
  ) {}

  list(organizationId: string, orderKey: string) {
    return this.prisma.emfgProductionOutput.findMany({
      where: { organizationId, orderKey },
      orderBy: { recordedAt: 'desc' },
    });
  }

  async record(
    organizationId: string,
    userId: string,
    orderKey: string,
    payload: {
      outputType: EmfgOutputType;
      quantity: number;
      orderOpKey?: string;
      lotKey?: string;
      serialKey?: string;
      notes?: string;
      isPartial?: boolean;
    },
  ) {
    const order = await this.prisma.emfgProductionOrder.findUnique({
      where: { organizationId_orderKey: { organizationId, orderKey } },
    });
    if (!order) throw new NotFoundException('order_not_found');
    if (!['in_progress', 'paused'].includes(order.status)) {
      throw new BadRequestException('order_not_executing');
    }
    if (payload.quantity <= 0) throw new BadRequestException('invalid_quantity');

    const seq = await this.prisma.emfgProductionOutput.count({ where: { organizationId } });
    const outputKey = generateEmfgKey('OUT', seq + 1);

    const orderUpdate: {
      producedQty?: { increment: number };
      scrapQty?: { increment: number };
      reworkQty?: { increment: number };
    } = {};
    if (payload.outputType === 'good') orderUpdate.producedQty = { increment: payload.quantity };
    if (payload.outputType === 'defect') orderUpdate.scrapQty = { increment: payload.quantity };
    if (payload.outputType === 'rework') orderUpdate.reworkQty = { increment: payload.quantity };

    const newProduced = order.producedQty + (payload.outputType === 'good' ? payload.quantity : 0);
    const yieldPct = computeYieldPct(newProduced, order.plannedQty);

    const [output] = await this.prisma.$transaction([
      this.prisma.emfgProductionOutput.create({
        data: {
          organizationId,
          outputKey,
          orderKey,
          orderOpKey: payload.orderOpKey,
          outputType: payload.outputType,
          quantity: payload.quantity,
          lotKey: payload.lotKey,
          serialKey: payload.serialKey,
          yieldPct,
          notes: payload.notes,
          recordedBy: userId,
          metadata: { isPartial: payload.isPartial ?? false },
        },
      }),
      this.prisma.emfgProductionOrder.update({
        where: { organizationId_orderKey: { organizationId, orderKey } },
        data: orderUpdate,
      }),
      this.prisma.emfgProductionOrderProgress.create({
        data: {
          organizationId,
          progressKey: generateEmfgKey('PR', seq + 1),
          orderKey,
          orderOpKey: payload.orderOpKey,
          qtyProduced: payload.outputType === 'good' ? payload.quantity : 0,
          qtyScrap: payload.outputType === 'defect' ? payload.quantity : 0,
          notes: payload.notes,
          recordedBy: userId,
          metadata: { outputType: payload.outputType, outputKey },
        },
      }),
    ]);

    await this.audit.log(organizationId, 'EmfgProductionOutput', outputKey, 'progress', userId, {
      orderKey,
      outputType: payload.outputType,
      quantity: payload.quantity,
      yieldPct,
    });

    await this.core.emitUserAction(
      organizationId,
      'EmfgProductionOutput',
      outputKey,
      EVENT_TYPES.EMFG_MES_PRODUCTION_RECORDED,
      { orderKey, outputType: payload.outputType, quantity: payload.quantity, yieldPct },
    );

    if (payload.outputType === 'good') {
      await this.integration.onProductionRecorded(organizationId, orderKey, order.itemKey, payload.quantity, {
        lotKey: payload.lotKey,
        partial: payload.isPartial ?? false,
      });
    }

    await this.traceability.record(organizationId, userId, orderKey, {
      eventType: 'production_output',
      itemKey: order.itemKey,
      lotKey: payload.lotKey,
      serialKey: payload.serialKey,
      quantity: payload.quantity,
      details: { outputType: payload.outputType, yieldPct },
    });

    return output;
  }
}
