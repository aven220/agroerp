import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EimsAuditService } from './eims-audit.service';
import { EimsLotService } from './eims-lot.service';
import { EimsMovementService } from './eims-movement.service';
import { EimsTraceabilityService } from './eims-traceability.service';
import {
  allocateParentCost,
  generateLotKey,
  generateTransformationKey,
  validateTransformInput,
  type EimsTransformTypeValue,
} from '../domain/eims-traceability.engine';

export interface TransformInput {
  transformType: EimsTransformTypeValue;
  parents: Array<{ lotKey: string; quantity: number }>;
  children: Array<{
    lotKey?: string;
    quantity: number;
    itemKey?: string;
    warehouseKey?: string;
    locationKey?: string;
  }>;
  reason?: string;
  documentKey?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class EimsTransformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EimsAuditService,
    private readonly lots: EimsLotService,
    private readonly movements: EimsMovementService,
    private readonly trace: EimsTraceabilityService,
  ) {}

  list(organizationId: string) {
    return this.lots.transformationsPanel(organizationId);
  }

  async post(organizationId: string, userId: string, input: TransformInput) {
    const error = validateTransformInput(input);
    if (error) throw new BadRequestException(error);

    const parentLots = [];
    for (const parent of input.parents) {
      const lot = await this.prisma.eimsStockLot.findFirst({
        where: { organizationId, lotKey: parent.lotKey },
        include: {
          item: true,
          warehouse: true,
          location: true,
        },
      });
      if (!lot) throw new NotFoundException(`Lote origen ${parent.lotKey} no encontrado`);
      if (lot.onHandQty < parent.quantity) {
        throw new BadRequestException(
          `Lote ${parent.lotKey} no tiene cantidad suficiente (${lot.onHandQty} < ${parent.quantity})`,
        );
      }
      await this.lots.assertLotMovable(organizationId, lot.lotKey, lot.itemId);
      parentLots.push({ ...lot, consumeQty: parent.quantity });
    }

    const totalChildQty = input.children.reduce((s, c) => s + c.quantity, 0);
    const costParents = parentLots.map((p) => ({
      quantity: p.consumeQty,
      unitCost: p.unitCost,
      accumulatedCost: p.accumulatedCost * (p.consumeQty / Math.max(p.onHandQty, p.consumeQty)),
    }));

    const transformationBase = generateTransformationKey(input.transformType);
    const links = [];
    const childResults = [];

    for (const parent of parentLots) {
      await this.movements.post(organizationId, userId, {
        movementType: 'transformation',
        itemKey: parent.item.itemKey,
        quantity: parent.consumeQty,
        fromWarehouseKey: parent.warehouse.warehouseKey,
        fromLocationKey: parent.location?.locationKey,
        lotKey: parent.lotKey,
        unitCost: parent.unitCost,
        reason: input.reason ?? `Transformación ${input.transformType}`,
        documentKey: input.documentKey ?? transformationBase,
        documentType: 'transformation',
        source: 'transformation',
        sourceRef: transformationBase,
        metadata: { transformType: input.transformType, ...(input.metadata ?? {}) },
      });
      const remaining = parent.onHandQty - parent.consumeQty;
      if (remaining <= 0.000001) {
        await this.prisma.eimsStockLot.update({
          where: { id: parent.id },
          data: { status: 'transformed' },
        });
      }
    }

    let childIndex = 0;
    for (const child of input.children) {
      childIndex += 1;
      const primaryParent = parentLots[0];
      const itemKey = child.itemKey ?? primaryParent.item.itemKey;
      const warehouseKey = child.warehouseKey ?? primaryParent.warehouse.warehouseKey;
      const locationKey = child.locationKey ?? primaryParent.location?.locationKey;
      const lotKey = child.lotKey?.trim() || generateLotKey(itemKey, childIndex);
      const costs = allocateParentCost(costParents, child.quantity, totalChildQty);
      const parentKeys = parentLots.map((p) => p.lotKey);

      const created = await this.lots.createManual(organizationId, userId, {
        itemKey,
        warehouseKey,
        locationKey,
        lotKey,
        initialQty: 0,
        unitCost: costs.unitCost,
        status: 'available',
        sourceType: 'transformation',
        sourceRef: transformationBase,
        producerName: primaryParent.producerName ?? undefined,
        farmName: primaryParent.farmName ?? undefined,
        agriculturalLotCode: primaryParent.agriculturalLotCode ?? undefined,
        purchaseCenterKey: primaryParent.purchaseCenterKey ?? undefined,
        ownerOrgKey: primaryParent.ownerOrgKey ?? undefined,
        productionDate: primaryParent.productionDate?.toISOString(),
        expiryDate: primaryParent.expiryDate?.toISOString(),
        shelfLifeDays: primaryParent.shelfLifeDays ?? undefined,
        metadata: {
          transformType: input.transformType,
          parentLotKeys: parentKeys,
          ...(input.metadata ?? {}),
        },
      });

      await this.prisma.eimsStockLot.update({
        where: { id: created.id },
        data: {
          parentLotKeys: parentKeys,
          accumulatedCost: costs.accumulatedCost,
          unitCost: costs.unitCost,
        },
      });

      await this.movements.post(organizationId, userId, {
        movementType: 'production',
        itemKey,
        quantity: child.quantity,
        toWarehouseKey: warehouseKey,
        toLocationKey: locationKey,
        lotKey,
        unitCost: costs.unitCost,
        reason: input.reason ?? `Resultado ${input.transformType}`,
        documentKey: input.documentKey ?? transformationBase,
        documentType: 'transformation',
        source: 'transformation',
        sourceRef: transformationBase,
        metadata: { transformType: input.transformType, parents: parentKeys },
      });

      for (const parent of parentLots) {
        const ratio = parent.consumeQty / parentLots.reduce((s, p) => s + p.consumeQty, 0);
        const linkQty = Number((child.quantity * ratio).toFixed(6));
        const transformationKey = `${transformationBase}-${parent.lotKey}-${lotKey}`.slice(0, 120);
        const link = await this.prisma.eimsLotTransformation.create({
          data: {
            organizationId,
            transformationKey,
            transformType: input.transformType,
            parentLotId: parent.id,
            childLotId: created.id,
            parentLotKey: parent.lotKey,
            childLotKey: lotKey,
            quantity: linkQty,
            ratio,
            reason: input.reason,
            documentKey: input.documentKey ?? transformationBase,
            performedBy: userId,
            metadata: (input.metadata ?? {}) as object,
          },
        });
        links.push(link);

        await this.trace.record(organizationId, {
          lotKey: parent.lotKey,
          stockLotId: parent.id,
          stage: input.transformType === 'mix' ? 'mix' : input.transformType === 'split' ? 'split' : 'transformation',
          eventType: `transform_${input.transformType}_out`,
          title: `Transformación ${input.transformType} → ${lotKey}`,
          description: input.reason,
          actorId: userId,
          documentKey: transformationBase,
          payload: { childLotKey: lotKey, quantity: linkQty },
        });
        await this.trace.record(organizationId, {
          lotKey,
          stockLotId: created.id,
          stage: input.transformType === 'mix' ? 'mix' : input.transformType === 'split' ? 'split' : 'transformation',
          eventType: `transform_${input.transformType}_in`,
          title: `Origen ${parent.lotKey}`,
          description: input.reason,
          actorId: userId,
          documentKey: transformationBase,
          payload: { parentLotKey: parent.lotKey, quantity: linkQty },
        });
      }

      childResults.push(await this.lots.getOne(organizationId, lotKey));
    }

    await this.audit.log(organizationId, 'LotTransformation', transformationBase, 'posted', userId, {
      transformType: input.transformType,
      parents: input.parents,
      children: childResults.map((c) => ({ lotKey: c.lotKey, quantity: c.onHandQty })),
      reason: input.reason,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsLotTransformation',
      links[0]?.id ?? transformationBase,
      EVENT_TYPES.EIMS_TRANSFORM_POSTED,
      {
        transformationKey: transformationBase,
        transformType: input.transformType,
        parents: input.parents.map((p) => p.lotKey),
        children: childResults.map((c) => c.lotKey),
      },
    );

    return {
      transformationKey: transformationBase,
      transformType: input.transformType,
      links,
      children: childResults,
      parents: parentLots.map((p) => ({ lotKey: p.lotKey, quantity: p.consumeQty })),
    };
  }

  async split(
    organizationId: string,
    userId: string,
    input: {
      lotKey: string;
      parts: Array<{ quantity: number; lotKey?: string }>;
      reason?: string;
      documentKey?: string;
    },
  ) {
    return this.post(organizationId, userId, {
      transformType: 'split',
      parents: [{ lotKey: input.lotKey, quantity: input.parts.reduce((s, p) => s + p.quantity, 0) }],
      children: input.parts.map((p) => ({ lotKey: p.lotKey, quantity: p.quantity })),
      reason: input.reason,
      documentKey: input.documentKey,
    });
  }

  async merge(
    organizationId: string,
    userId: string,
    input: {
      parents: Array<{ lotKey: string; quantity: number }>;
      childLotKey?: string;
      reason?: string;
      documentKey?: string;
    },
  ) {
    const total = input.parents.reduce((s, p) => s + p.quantity, 0);
    return this.post(organizationId, userId, {
      transformType: 'merge',
      parents: input.parents,
      children: [{ lotKey: input.childLotKey, quantity: total }],
      reason: input.reason,
      documentKey: input.documentKey,
    });
  }

  async mix(
    organizationId: string,
    userId: string,
    input: {
      parents: Array<{ lotKey: string; quantity: number }>;
      childLotKey?: string;
      childQuantity?: number;
      reason?: string;
      documentKey?: string;
    },
  ) {
    const total = input.childQuantity ?? input.parents.reduce((s, p) => s + p.quantity, 0);
    return this.post(organizationId, userId, {
      transformType: 'mix',
      parents: input.parents,
      children: [{ lotKey: input.childLotKey, quantity: total }],
      reason: input.reason,
      documentKey: input.documentKey,
    });
  }
}
