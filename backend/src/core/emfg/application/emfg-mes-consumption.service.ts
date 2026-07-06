import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EmfgConsumptionType } from '@prisma/client';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { applySubstitutionQty, generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import { validateConsumption } from '../domain/emfg-mes.engine';
import { EmfgAuditService } from './emfg-audit.service';
import { EmfgIntegrationService } from './emfg-integration.service';
import { EmfgMesTraceabilityService } from './emfg-mes-traceability.service';

@Injectable()
export class EmfgMesConsumptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
    private readonly core: CoreEngineService,
    private readonly integration: EmfgIntegrationService,
    private readonly traceability: EmfgMesTraceabilityService,
  ) {}

  list(organizationId: string, orderKey: string) {
    return this.prisma.emfgMaterialConsumption.findMany({
      where: { organizationId, orderKey },
      orderBy: { consumedAt: 'desc' },
    });
  }

  async consumeAutomatic(organizationId: string, userId: string, orderKey: string) {
    const order = await this.prisma.emfgProductionOrder.findUnique({
      where: { organizationId_orderKey: { organizationId, orderKey } },
      include: { materials: true },
    });
    if (!order) throw new NotFoundException('order_not_found');
    if (!['in_progress', 'paused'].includes(order.status)) {
      throw new BadRequestException('order_not_executing');
    }

    const results = [];
    for (const mat of order.materials) {
      const remaining = mat.requiredQty - mat.issuedQty;
      if (remaining <= 0) continue;
      const row = await this.record(organizationId, userId, orderKey, {
        materialKey: mat.materialKey,
        componentKey: mat.componentKey,
        consumptionType: 'automatic',
        quantity: remaining,
      });
      results.push(row);
    }
    return results;
  }

  async consume(
    organizationId: string,
    userId: string,
    orderKey: string,
    payload: {
      materialKey?: string;
      componentKey: string;
      consumptionType: EmfgConsumptionType;
      quantity: number;
      wasteQty?: number;
      substituteKey?: string;
      lotKey?: string;
      serialKey?: string;
      authorizedBy?: string;
    },
  ) {
    if (['manual', 'substitution', 'additional'].includes(payload.consumptionType) && !payload.authorizedBy) {
      throw new BadRequestException('authorization_required');
    }
    return this.record(organizationId, userId, orderKey, payload);
  }

  private async record(
    organizationId: string,
    userId: string,
    orderKey: string,
    payload: {
      materialKey?: string;
      componentKey: string;
      consumptionType: EmfgConsumptionType;
      quantity: number;
      wasteQty?: number;
      substituteKey?: string;
      lotKey?: string;
      serialKey?: string;
      authorizedBy?: string;
    },
  ) {
    const order = await this.prisma.emfgProductionOrder.findUnique({
      where: { organizationId_orderKey: { organizationId, orderKey } },
      include: { materials: true },
    });
    if (!order) throw new NotFoundException('order_not_found');

    let qty = payload.quantity;
    if (payload.consumptionType === 'substitution' && payload.substituteKey) {
      const sub = await this.prisma.emfgBomSubstitution.findFirst({
        where: {
          organizationId,
          bomKey: order.bomKey ?? undefined,
          componentKey: payload.componentKey,
          substituteKey: payload.substituteKey,
        },
      });
      qty = applySubstitutionQty(payload.quantity, sub?.factor ?? 1);
    }

    const mat = order.materials.find(
      (m) => m.materialKey === payload.materialKey || m.componentKey === payload.componentKey,
    );
    const allowOver = ['additional', 'waste'].includes(payload.consumptionType);
    const errors = validateConsumption(
      mat?.requiredQty ?? qty,
      mat?.issuedQty ?? 0,
      qty,
      allowOver,
    );
    if (errors.length) throw new BadRequestException(errors.join(','));

    const seq = await this.prisma.emfgMaterialConsumption.count({ where: { organizationId } });
    const consumptionKey = generateEmfgKey('MC', seq + 1);
    const totalQty = qty + (payload.wasteQty ?? 0);

    const updates = [
      this.prisma.emfgMaterialConsumption.create({
        data: {
          organizationId,
          consumptionKey,
          orderKey,
          materialKey: payload.materialKey ?? mat?.materialKey,
          componentKey: payload.componentKey,
          consumptionType: payload.consumptionType,
          quantity: qty,
          wasteQty: payload.wasteQty ?? 0,
          substituteKey: payload.substituteKey,
          lotKey: payload.lotKey,
          serialKey: payload.serialKey,
          authorizedBy: payload.authorizedBy,
          consumedBy: userId,
        },
      }),
    ];
    if (mat) {
      updates.push(
        this.prisma.emfgProductionOrderMaterial.update({
          where: { organizationId_materialKey: { organizationId, materialKey: mat.materialKey } },
          data: { issuedQty: { increment: totalQty } },
        }) as never,
      );
    }
    const [consumption] = await this.prisma.$transaction(updates);

    await this.audit.log(organizationId, 'EmfgMaterialConsumption', consumptionKey, 'consumed', userId, {
      orderKey,
      componentKey: payload.componentKey,
      quantity: qty,
      type: payload.consumptionType,
    });

    await this.core.emitUserAction(
      organizationId,
      'EmfgMaterialConsumption',
      consumptionKey,
      EVENT_TYPES.EMFG_MES_MATERIAL_CONSUMED,
      {
        orderKey,
        componentKey: payload.componentKey,
        quantity: qty,
        wasteQty: payload.wasteQty ?? 0,
        integration: 'eims',
      },
    );

    await this.integration.onMaterialConsumed(organizationId, orderKey, {
      componentKey: payload.componentKey,
      quantity: qty,
      wasteQty: payload.wasteQty ?? 0,
      lotKey: payload.lotKey,
    });

    await this.traceability.record(organizationId, userId, orderKey, {
      eventType: 'material_consume',
      itemKey: payload.componentKey,
      lotKey: payload.lotKey,
      serialKey: payload.serialKey,
      quantity: qty,
      details: { consumptionType: payload.consumptionType, wasteQty: payload.wasteQty ?? 0 },
    });

    return consumption;
  }
}
