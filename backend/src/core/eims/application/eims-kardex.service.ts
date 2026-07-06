import { BadRequestException, Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EimsAuditService } from './eims-audit.service';
import { EimsParameterService } from './eims-parameter.service';
import {
  ValuationMethod,
  buildKardexLine,
  consumeLayers,
  resolveValuationMethod,
} from '../domain/eims-valuation.engine';
import { EimsMovementType, movementDelta } from '../domain/eims-movement.engine';

@Injectable()
export class EimsKardexService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EimsAuditService,
    private readonly parameters: EimsParameterService,
  ) {}

  list(
    organizationId: string,
    filters?: { itemKey?: string; warehouseKey?: string; lotKey?: string },
  ) {
    return this.prisma.eimsKardexEntry.findMany({
      where: {
        organizationId,
        ...(filters?.lotKey ? { lotKey: filters.lotKey } : {}),
        ...(filters?.itemKey ? { item: { itemKey: filters.itemKey } } : {}),
        ...(filters?.warehouseKey ? { warehouse: { warehouseKey: filters.warehouseKey } } : {}),
      },
      include: {
        item: { select: { itemKey: true, name: true } },
        warehouse: { select: { warehouseKey: true, name: true } },
      },
      orderBy: { postedAt: 'asc' },
      take: 1000,
    });
  }

  costHistory(organizationId: string, itemKey?: string) {
    return this.prisma.eimsCostHistory.findMany({
      where: {
        organizationId,
        ...(itemKey ? { item: { itemKey } } : {}),
      },
      include: { item: { select: { itemKey: true, name: true } } },
      orderBy: { recordedAt: 'desc' },
      take: 500,
    });
  }

  async inventoryValue(organizationId: string) {
    const balances = await this.prisma.eimsStockBalance.findMany({
      where: { organizationId },
      include: {
        item: { select: { itemKey: true, name: true, valuationMethod: true } },
        warehouse: { select: { warehouseKey: true, name: true } },
      },
    });
    const byWarehouse: Record<string, number> = {};
    const byItem: Record<string, number> = {};
    let total = 0;
    for (const b of balances) {
      total += b.totalCost;
      const wh = b.warehouse.warehouseKey;
      const item = b.item.itemKey;
      byWarehouse[wh] = (byWarehouse[wh] ?? 0) + b.totalCost;
      byItem[item] = (byItem[item] ?? 0) + b.totalCost;
    }
    return { total, byWarehouse, byItem, balances };
  }

  async recordFromMovement(input: {
    organizationId: string;
    userId: string;
    movementKey: string;
    movementType: EimsMovementType;
    itemId: string;
    itemKey: string;
    itemValuationMethod?: string | null;
    quantity: number;
    unitCost: number;
    fromWarehouseId?: string | null;
    toWarehouseId?: string | null;
    stockLotId?: string | null;
    lotKey?: string | null;
    documentKey?: string | null;
    documentType?: string | null;
    transportCost?: number;
    storageCost?: number;
    transformCost?: number;
  }) {
    const orgMethod = await this.parameters.resolve(input.organizationId, 'valuation_method');
    const method = resolveValuationMethod(
      input.itemValuationMethod,
      (orgMethod?.value as { method?: string })?.method,
    );
    const delta = movementDelta(input.movementType, input.quantity, input.unitCost);

    if (input.movementType === 'transfer' || input.movementType === 'intercompany_transfer') {
      await this.writeSide({
        ...input,
        warehouseId: input.fromWarehouseId!,
        entryQty: 0,
        exitQty: input.quantity,
        method,
      });
      await this.writeSide({
        ...input,
        warehouseId: input.toWarehouseId!,
        entryQty: input.quantity,
        exitQty: 0,
        method,
      });
      return;
    }

    const warehouseId = delta.requiresDestination ? input.toWarehouseId! : input.fromWarehouseId!;
    const entryQty = delta.onHandDelta > 0 ? Math.abs(delta.onHandDelta) : 0;
    const exitQty = delta.onHandDelta < 0 ? Math.abs(delta.onHandDelta) : 0;
    // reservation/block don't change on-hand kardex qty but we still log zero-qty cost events if needed
    if (entryQty === 0 && exitQty === 0) return;

    await this.writeSide({
      ...input,
      warehouseId,
      entryQty,
      exitQty,
      method,
    });
  }

  private async writeSide(input: {
    organizationId: string;
    userId: string;
    movementKey: string;
    movementType: EimsMovementType;
    itemId: string;
    itemKey: string;
    warehouseId: string;
    entryQty: number;
    exitQty: number;
    unitCost: number;
    method: ValuationMethod;
    stockLotId?: string | null;
    lotKey?: string | null;
    documentKey?: string | null;
    documentType?: string | null;
    transportCost?: number;
    storageCost?: number;
    transformCost?: number;
  }) {
    const previous = await this.prisma.eimsKardexEntry.findFirst({
      where: {
        organizationId: input.organizationId,
        itemId: input.itemId,
        warehouseId: input.warehouseId,
      },
      orderBy: { postedAt: 'desc' },
    });

    let movementUnitCost = input.unitCost;
    if (input.exitQty > 0) {
      if (input.method === 'average') {
        movementUnitCost = previous?.averageCost || input.unitCost;
      } else {
        movementUnitCost = await this.resolveExitCost(input);
      }
    } else if (input.entryQty > 0) {
      await this.openCostLayer(input);
    }

    const line = buildKardexLine({
      previousBalanceQty: previous?.balanceQty ?? 0,
      previousBalanceCost: previous?.balanceCost ?? 0,
      entryQty: input.entryQty,
      exitQty: input.exitQty,
      movementUnitCost,
      valuationMethod: input.method,
    });

    await this.prisma.eimsKardexEntry.create({
      data: {
        organizationId: input.organizationId,
        itemId: input.itemId,
        warehouseId: input.warehouseId,
        stockLotId: input.stockLotId ?? undefined,
        movementKey: input.movementKey,
        movementType: input.movementType,
        previousBalanceQty: previous?.balanceQty ?? 0,
        entryQty: input.entryQty,
        exitQty: input.exitQty,
        balanceQty: line.balanceQty,
        unitCost: line.unitCost,
        totalCost: line.totalCost,
        balanceCost: line.balanceCost,
        averageCost: line.averageCost,
        valuationMethod: input.method,
        documentKey: input.documentKey ?? undefined,
        documentType: input.documentType ?? undefined,
        lotKey: input.lotKey ?? undefined,
        postedBy: input.userId,
        metadata: {
          transportCost: input.transportCost ?? 0,
          storageCost: input.storageCost ?? 0,
          transformCost: input.transformCost ?? 0,
        },
      },
    });

    await this.prisma.eimsCostHistory.create({
      data: {
        organizationId: input.organizationId,
        itemId: input.itemId,
        warehouseId: input.warehouseId,
        eventType: input.entryQty > 0 ? 'entry_cost' : 'exit_cost',
        valuationMethod: input.method,
        previousUnitCost: previous?.unitCost ?? 0,
        newUnitCost: line.unitCost,
        previousAverageCost: previous?.averageCost ?? 0,
        newAverageCost: line.averageCost,
        quantity: input.entryQty > 0 ? input.entryQty : input.exitQty,
        totalCost: line.totalCost,
        transportCost: input.transportCost ?? 0,
        storageCost: input.storageCost ?? 0,
        transformCost: input.transformCost ?? 0,
        movementKey: input.movementKey,
        reason: `Kardex ${input.movementType}`,
        recordedBy: input.userId,
      },
    });
  }

  private async openCostLayer(input: {
    organizationId: string;
    itemId: string;
    warehouseId: string;
    entryQty: number;
    unitCost: number;
    movementKey: string;
    lotKey?: string | null;
    stockLotId?: string | null;
    transportCost?: number;
    storageCost?: number;
    transformCost?: number;
  }) {
    const transport = input.transportCost ?? 0;
    const storage = input.storageCost ?? 0;
    const transform = input.transformCost ?? 0;
    const accumulated = input.unitCost + transport + storage + transform;
    await this.prisma.eimsCostLayer.create({
      data: {
        organizationId: input.organizationId,
        itemId: input.itemId,
        warehouseId: input.warehouseId,
        stockLotId: input.stockLotId ?? undefined,
        lotKey: input.lotKey ?? undefined,
        layerKey: `LYR-${input.movementKey}`,
        originalQty: input.entryQty,
        remainingQty: input.entryQty,
        unitCost: accumulated,
        totalCost: accumulated * input.entryQty,
        transportCost: transport,
        storageCost: storage,
        transformCost: transform,
        accumulatedCost: accumulated,
        sourceMovementKey: input.movementKey,
        isOpen: true,
      },
    });
  }

  private async resolveExitCost(input: {
    organizationId: string;
    itemId: string;
    warehouseId: string;
    exitQty: number;
    unitCost: number;
    method: ValuationMethod;
    lotKey?: string | null;
  }): Promise<number> {
    if (input.method === 'specific' && input.lotKey) {
      const lot = await this.prisma.eimsStockLot.findFirst({
        where: { organizationId: input.organizationId, itemId: input.itemId, lotKey: input.lotKey },
      });
      return lot?.unitCost ?? input.unitCost;
    }

    if (input.method === 'fifo' || input.method === 'lifo') {
      const layers = await this.prisma.eimsCostLayer.findMany({
        where: {
          organizationId: input.organizationId,
          itemId: input.itemId,
          warehouseId: input.warehouseId,
          isOpen: true,
          remainingQty: { gt: 0 },
        },
      });
      const result = consumeLayers(
        layers.map((l) => ({
          id: l.id,
          layerKey: l.layerKey,
          remainingQty: l.remainingQty,
          unitCost: l.unitCost,
          receivedAt: l.receivedAt,
          lotKey: l.lotKey,
        })),
        input.exitQty,
        input.method,
      );
      for (const consumed of result.layersConsumed) {
        const layer = layers.find((l) => l.layerKey === consumed.layerKey);
        if (!layer) continue;
        const remainingQty = Number((layer.remainingQty - consumed.qty).toFixed(6));
        await this.prisma.eimsCostLayer.update({
          where: { id: layer.id },
          data: {
            remainingQty,
            totalCost: remainingQty * layer.unitCost,
            isOpen: remainingQty > 0.0000001,
          },
        });
      }
      return result.unitCost;
    }

    const balance = await this.prisma.eimsStockBalance.findFirst({
      where: {
        organizationId: input.organizationId,
        itemId: input.itemId,
        warehouseId: input.warehouseId,
      },
    });
    return balance?.averageCost || input.unitCost;
  }

  async compareMethods(organizationId: string, itemKey: string, warehouseKey: string) {
    const item = await this.prisma.eimsItem.findFirst({ where: { organizationId, itemKey } });
    const warehouse = await this.prisma.eimsWarehouse.findFirst({
      where: { organizationId, warehouseKey },
    });
    if (!item || !warehouse) throw new BadRequestException('Artículo o bodega no encontrados');

    const balance = await this.prisma.eimsStockBalance.findFirst({
      where: { organizationId, itemId: item.id, warehouseId: warehouse.id },
    });
    const layers = await this.prisma.eimsCostLayer.findMany({
      where: { organizationId, itemId: item.id, warehouseId: warehouse.id, isOpen: true },
    });

    const { compareValuationMethods } = await import('../domain/eims-valuation.engine');
    return compareValuationMethods({
      previousQty: balance?.onHandQty ?? 0,
      previousCost: balance?.totalCost ?? 0,
      entryQty: 10,
      entryUnitCost: balance?.averageCost || 100,
      exitQty: Math.min(5, balance?.onHandQty ?? 5),
      layers: layers.map((l) => ({
        layerKey: l.layerKey,
        remainingQty: l.remainingQty,
        unitCost: l.unitCost,
        receivedAt: l.receivedAt,
        lotKey: l.lotKey,
      })),
    });
  }

  async assertPeriodOpen(organizationId: string, at = new Date()) {
    const closed = await this.prisma.eimsPeriodClose.findFirst({
      where: {
        organizationId,
        status: 'closed',
        periodStart: { lte: at },
        periodEnd: { gte: at },
      },
    });
    if (closed) {
      throw new BadRequestException(`Período ${closed.periodKey} cerrado — no se permiten movimientos`);
    }
  }
}
