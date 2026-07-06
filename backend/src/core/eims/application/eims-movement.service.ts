import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EimsAuditService } from './eims-audit.service';
import { EimsParameterService } from './eims-parameter.service';
import { EimsKardexService } from './eims-kardex.service';
import { EimsLotService } from './eims-lot.service';
import { EimsTraceabilityService } from './eims-traceability.service';
import {
  EimsMovementType,
  applyDelta,
  generateBatchKey,
  generateMovementKey,
  locationScope,
  movementDelta,
  parseCsvMovements,
  validateMovementInput,
  validateStockAvailability,
  type StockSnapshot,
} from '../domain/eims-movement.engine';
import { movementStage } from '../domain/eims-traceability.engine';

export interface PostMovementInput {
  movementType: EimsMovementType;
  itemKey: string;
  quantity: number;
  fromWarehouseKey?: string;
  toWarehouseKey?: string;
  fromLocationKey?: string;
  toLocationKey?: string;
  lotKey?: string;
  serialNumber?: string;
  manufacturerSerial?: string;
  internalSerial?: string;
  productionDate?: string;
  expiryDate?: string;
  shelfLifeDays?: number;
  purchaseCenterKey?: string;
  ownerOrgKey?: string;
  producerName?: string;
  farmName?: string;
  agriculturalLotCode?: string;
  customerName?: string;
  warrantyUntil?: string;
  qrCode?: string;
  barcode?: string;
  unitCost?: number;
  reasonKey?: string;
  reason?: string;
  documentKey?: string;
  documentType?: string;
  source?: string;
  sourceRef?: string;
  batchKey?: string;
  transportCost?: number;
  storageCost?: number;
  transformCost?: number;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class EimsMovementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EimsAuditService,
    private readonly parameters: EimsParameterService,
    private readonly kardex: EimsKardexService,
    private readonly lots: EimsLotService,
    private readonly trace: EimsTraceabilityService,
  ) {}

  list(
    organizationId: string,
    filters?: {
      itemKey?: string;
      warehouseKey?: string;
      lotKey?: string;
      userId?: string;
      movementType?: string;
      status?: string;
    },
  ) {
    return this.prisma.eimsMovement.findMany({
      where: {
        organizationId,
        ...(filters?.movementType ? { movementType: filters.movementType as 'entry' } : {}),
        ...(filters?.status ? { status: filters.status as 'confirmed' } : {}),
        ...(filters?.lotKey ? { lotKey: filters.lotKey } : {}),
        ...(filters?.userId ? { postedBy: filters.userId } : {}),
        ...(filters?.itemKey ? { item: { itemKey: filters.itemKey } } : {}),
        ...(filters?.warehouseKey
          ? {
              OR: [
                { fromWarehouse: { warehouseKey: filters.warehouseKey } },
                { toWarehouse: { warehouseKey: filters.warehouseKey } },
              ],
            }
          : {}),
      },
      include: {
        item: { select: { itemKey: true, name: true } },
        fromWarehouse: { select: { warehouseKey: true, name: true } },
        toWarehouse: { select: { warehouseKey: true, name: true } },
        fromLocation: { select: { locationKey: true, name: true } },
        toLocation: { select: { locationKey: true, name: true } },
        stockLot: true,
      },
      orderBy: { postedAt: 'desc' },
      take: 300,
    });
  }

  async getOne(organizationId: string, movementKey: string) {
    const row = await this.prisma.eimsMovement.findFirst({
      where: { organizationId, movementKey },
      include: {
        item: true,
        fromWarehouse: true,
        toWarehouse: true,
        fromLocation: true,
        toLocation: true,
        stockLot: true,
      },
    });
    if (!row) throw new NotFoundException(`Movimiento ${movementKey} no encontrado`);
    return row;
  }

  listBalances(organizationId: string, filters?: { itemKey?: string; warehouseKey?: string }) {
    return this.prisma.eimsStockBalance.findMany({
      where: {
        organizationId,
        ...(filters?.itemKey ? { item: { itemKey: filters.itemKey } } : {}),
        ...(filters?.warehouseKey ? { warehouse: { warehouseKey: filters.warehouseKey } } : {}),
      },
      include: {
        item: { select: { itemKey: true, name: true, uomKey: true } },
        warehouse: { select: { warehouseKey: true, name: true } },
        location: { select: { locationKey: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 300,
    });
  }

  async monitor(organizationId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const [today, confirmed, voided, balances] = await Promise.all([
      this.prisma.eimsMovement.count({ where: { organizationId, postedAt: { gte: start } } }),
      this.prisma.eimsMovement.count({ where: { organizationId, status: 'confirmed' } }),
      this.prisma.eimsMovement.count({ where: { organizationId, status: 'voided' } }),
      this.prisma.eimsStockBalance.aggregate({
        where: { organizationId },
        _sum: { onHandQty: true, reservedQty: true, blockedQty: true, availableQty: true },
      }),
    ]);
    const recent = await this.list(organizationId);
    return {
      today,
      confirmed,
      voided,
      stock: balances._sum,
      recent: recent.slice(0, 20),
    };
  }

  async post(organizationId: string, userId: string, input: PostMovementInput) {
    await this.kardex.assertPeriodOpen(organizationId);
    const item = await this.prisma.eimsItem.findFirst({
      where: { organizationId, itemKey: input.itemKey, isActive: true },
    });
    if (!item) throw new BadRequestException(`Artículo ${input.itemKey} no encontrado`);

    const allowNegativeParam = await this.parameters.resolve(organizationId, 'allow_negative_stock');
    const allowNegative =
      item.allowNegative || Boolean((allowNegativeParam?.value as { enabled?: boolean })?.enabled);

    const fromWarehouse = input.fromWarehouseKey
      ? await this.requireWarehouse(organizationId, input.fromWarehouseKey)
      : null;
    const toWarehouse = input.toWarehouseKey
      ? await this.requireWarehouse(organizationId, input.toWarehouseKey)
      : null;
    const fromLocation = input.fromLocationKey
      ? await this.requireLocation(organizationId, input.fromLocationKey)
      : null;
    const toLocation = input.toLocationKey
      ? await this.requireLocation(organizationId, input.toLocationKey)
      : null;

    const validation = validateMovementInput({
      movementType: input.movementType,
      quantity: input.quantity,
      fromWarehouseId: fromWarehouse?.id,
      toWarehouseId: toWarehouse?.id,
      trackLot: item.trackLot,
      lotKey: input.lotKey,
      trackSerial: item.trackSerial,
      serialNumber: input.serialNumber,
      trackExpiry: item.trackExpiry,
      expiryDate: input.expiryDate,
    });
    if (validation) throw new BadRequestException(validation);

    const delta = movementDelta(input.movementType, input.quantity, input.unitCost ?? 0);
    const count = await this.prisma.eimsMovement.count({ where: { organizationId } });
    const movementKey = generateMovementKey(input.movementType, count + 1);

    // Validate and apply source balance
    if (delta.requiresSource && fromWarehouse) {
      const sourceBalance = await this.getOrCreateBalance(
        organizationId,
        item.id,
        fromWarehouse.id,
        fromLocation?.id,
      );
      const err = validateStockAvailability(
        this.toSnapshot(sourceBalance),
        input.movementType,
        input.quantity,
        allowNegative,
      );
      if (err) throw new BadRequestException(err);
    }

    let stockLotId: string | undefined;
    let lotKey = input.lotKey;
    if (item.trackLot && (delta.requiresDestination || delta.requiresSource)) {
      if (!lotKey && delta.requiresDestination) {
        lotKey = `LOT-${item.itemKey}-${Date.now()}`;
      }
      if (lotKey) {
        const warehouseId =
          (delta.requiresDestination ? toWarehouse?.id : fromWarehouse?.id) ??
          fromWarehouse?.id ??
          toWarehouse?.id;
        if (warehouseId) {
          if (delta.requiresSource && !delta.requiresDestination) {
            await this.lots.assertLotMovable(organizationId, lotKey, item.id);
          }
          const lot = await this.lots.ensureLotForMovement(organizationId, userId, {
            itemId: item.id,
            itemKey: item.itemKey,
            warehouseId,
            locationId: (delta.requiresDestination ? toLocation?.id : fromLocation?.id) ?? undefined,
            lotKey,
            serialNumber: input.serialNumber,
            manufacturerSerial: input.manufacturerSerial,
            internalSerial: input.internalSerial,
            expiryDate: input.expiryDate,
            productionDate: input.productionDate,
            shelfLifeDays: input.shelfLifeDays ?? item.shelfLifeDays ?? undefined,
            unitCost: input.unitCost,
            quantity: input.quantity,
            purchaseCenterKey: input.purchaseCenterKey,
            ownerOrgKey: input.ownerOrgKey,
            sourceRef: input.sourceRef,
            sourceType: input.source,
            producerName: input.producerName,
            farmName: input.farmName,
            agriculturalLotCode: input.agriculturalLotCode,
            customerName: input.customerName,
            warrantyUntil: input.warrantyUntil,
            qrCode: input.qrCode,
            barcode: input.barcode,
            isNewEntry: delta.requiresDestination,
          });
          stockLotId = lot.id;
        }
      }
    }

    let unitCost = input.unitCost ?? 0;
    if (unitCost === 0 && delta.requiresSource && fromWarehouse) {
      const sourceBalance = await this.getOrCreateBalance(
        organizationId,
        item.id,
        fromWarehouse.id,
        fromLocation?.id,
      );
      unitCost = sourceBalance.averageCost || 0;
    }
    const totalCost = Math.abs(input.quantity) * unitCost;

    const movement = await this.prisma.eimsMovement.create({
      data: {
        organizationId,
        movementKey,
        movementType: input.movementType,
        status: 'confirmed',
        source: (input.source as 'manual') ?? 'manual',
        itemId: item.id,
        quantity: input.quantity,
        uomKey: item.uomKey,
        unitCost,
        totalCost,
        fromWarehouseId: fromWarehouse?.id,
        toWarehouseId: toWarehouse?.id,
        fromLocationId: fromLocation?.id,
        toLocationId: toLocation?.id,
        stockLotId,
        lotKey,
        serialNumber: input.serialNumber,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : undefined,
        reasonKey: input.reasonKey,
        reason: input.reason,
        documentKey: input.documentKey,
        documentType: input.documentType,
        sourceRef: input.sourceRef,
        batchKey: input.batchKey,
        postedBy: userId,
        metadata: (input.metadata ?? {}) as object,
      },
      include: {
        item: true,
        fromWarehouse: true,
        toWarehouse: true,
      },
    });

    // Apply balance effects — stock is only mutated through movements.
    if (input.movementType === 'transfer' || input.movementType === 'intercompany_transfer') {
      await this.applyBalanceChange(
        organizationId,
        item.id,
        fromWarehouse!.id,
        fromLocation?.id,
        movementDelta('exit', input.quantity, unitCost),
        unitCost,
      );
      await this.applyBalanceChange(
        organizationId,
        item.id,
        toWarehouse!.id,
        toLocation?.id,
        movementDelta('entry', input.quantity, unitCost),
        unitCost,
      );
      if (stockLotId) {
        await this.prisma.eimsStockLot.update({
          where: { id: stockLotId },
          data: {
            warehouseId: toWarehouse!.id,
            locationId: toLocation?.id,
          },
        });
      }
    } else {
      const warehouseId = delta.requiresDestination ? toWarehouse!.id : fromWarehouse!.id;
      const locationId = delta.requiresDestination ? toLocation?.id : fromLocation?.id;
      await this.applyBalanceChange(organizationId, item.id, warehouseId, locationId, delta, unitCost);
      if (stockLotId) {
        const lotBefore = await this.prisma.eimsStockLot.findUnique({ where: { id: stockLotId } });
        let forceStatus: 'sold' | 'dispatched' | undefined;
        if (
          lotBefore &&
          (input.movementType === 'exit' || input.movementType === 'donation') &&
          lotBefore.onHandQty - Math.abs(input.quantity) <= 0
        ) {
          forceStatus = input.customerName ? 'sold' : 'dispatched';
        }
        await this.lots.applyQtyChange(stockLotId, input.movementType, input.quantity, unitCost, {
          forceStatus,
          customerName: input.customerName,
        });
      }
    }

    if (lotKey && stockLotId) {
      await this.trace.record(organizationId, {
        lotKey,
        stockLotId,
        stage: movementStage(input.movementType),
        eventType: `movement_${input.movementType}`,
        title: `Movimiento ${input.movementType}`,
        description: input.reason,
        actorId: userId,
        warehouseKey: toWarehouse?.warehouseKey ?? fromWarehouse?.warehouseKey,
        documentKey: input.documentKey,
        payload: {
          movementKey,
          quantity: input.quantity,
          unitCost,
          source: input.source,
          sourceRef: input.sourceRef,
        },
      });
    }

    await this.kardex.recordFromMovement({
      organizationId,
      userId,
      movementKey,
      movementType: input.movementType,
      itemId: item.id,
      itemKey: item.itemKey,
      itemValuationMethod: item.valuationMethod,
      quantity: input.quantity,
      unitCost,
      fromWarehouseId: fromWarehouse?.id,
      toWarehouseId: toWarehouse?.id,
      stockLotId,
      lotKey,
      documentKey: input.documentKey,
      documentType: input.documentType,
      transportCost: input.transportCost,
      storageCost: input.storageCost,
      transformCost: input.transformCost,
    });

    await this.audit.log(organizationId, 'Movement', movementKey, 'posted', userId, {
      movementType: input.movementType,
      itemKey: input.itemKey,
      quantity: input.quantity,
      source: input.source,
      sourceRef: input.sourceRef,
      reason: input.reason,
      documentKey: input.documentKey,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsMovement',
      movement.id,
      EVENT_TYPES.EIMS_MOVEMENT_POSTED,
      { movementKey, movementType: input.movementType, itemKey: input.itemKey, quantity: input.quantity },
    );
    return movement;
  }

  async postBatch(organizationId: string, userId: string, movements: PostMovementInput[]) {
    const batchKey = generateBatchKey();
    const results = [];
    for (const movement of movements) {
      results.push(
        await this.post(organizationId, userId, {
          ...movement,
          batchKey,
        }),
      );
    }
    await this.audit.log(organizationId, 'MovementBatch', batchKey, 'posted', userId, {
      count: results.length,
    });
    return { batchKey, count: results.length, movements: results };
  }

  async importCsv(organizationId: string, userId: string, csv: string) {
    const rows = parseCsvMovements(csv);
    const movements: PostMovementInput[] = rows.map((row) => ({
      movementType: (row.movementType || row.type || 'entry') as EimsMovementType,
      itemKey: row.itemKey || row.item,
      quantity: Number(row.quantity || row.qty || 0),
      fromWarehouseKey: row.fromWarehouseKey || row.fromWarehouse || undefined,
      toWarehouseKey: row.toWarehouseKey || row.toWarehouse || undefined,
      fromLocationKey: row.fromLocationKey || undefined,
      toLocationKey: row.toLocationKey || undefined,
      lotKey: row.lotKey || undefined,
      serialNumber: row.serialNumber || undefined,
      expiryDate: row.expiryDate || undefined,
      unitCost: row.unitCost ? Number(row.unitCost) : undefined,
      reason: row.reason || 'Importación Excel/CSV',
      source: 'import',
      documentKey: row.documentKey || undefined,
    }));
    return this.postBatch(organizationId, userId, movements);
  }

  async voidMovement(organizationId: string, userId: string, movementKey: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('Motivo de anulación obligatorio');
    const movement = await this.getOne(organizationId, movementKey);
    if (movement.status !== 'confirmed') throw new BadRequestException('Solo movimientos confirmados pueden anularse');

    const reverseType = this.reverseType(movement.movementType as EimsMovementType);
    const reversal = await this.post(organizationId, userId, {
      movementType: reverseType,
      itemKey: movement.item.itemKey,
      quantity: movement.quantity,
      fromWarehouseKey:
        movement.movementType === 'transfer' || movement.movementType === 'intercompany_transfer'
          ? movement.toWarehouse?.warehouseKey
          : movement.fromWarehouse?.warehouseKey ?? movement.toWarehouse?.warehouseKey,
      toWarehouseKey:
        movement.movementType === 'transfer' || movement.movementType === 'intercompany_transfer'
          ? movement.fromWarehouse?.warehouseKey
          : movement.toWarehouse?.warehouseKey ?? movement.fromWarehouse?.warehouseKey,
      fromLocationKey: movement.toLocation?.locationKey ?? movement.fromLocation?.locationKey,
      toLocationKey: movement.fromLocation?.locationKey ?? movement.toLocation?.locationKey,
      lotKey: movement.lotKey ?? undefined,
      serialNumber: movement.serialNumber ?? undefined,
      unitCost: movement.unitCost,
      reason: `Reversión de ${movementKey}: ${reason}`,
      source: 'authorized_adjustment',
      sourceRef: movementKey,
      documentKey: movement.documentKey ?? undefined,
      metadata: { reversalOf: movementKey },
    });

    await this.prisma.eimsMovement.update({
      where: { id: movement.id },
      data: {
        status: 'voided',
        voidReason: reason,
        voidedBy: userId,
        voidedAt: new Date(),
        reversedMovementId: reversal.id,
      },
    });

    await this.audit.log(organizationId, 'Movement', movementKey, 'voided', userId, {
      reason,
      reversalKey: reversal.movementKey,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsMovement',
      movement.id,
      EVENT_TYPES.EIMS_MOVEMENT_VOIDED,
      { movementKey, reason },
    );
    return { movement: await this.getOne(organizationId, movementKey), reversal };
  }

  /** Integration: coffee purchase entry */
  async fromCoffeePurchase(
    organizationId: string,
    userId: string,
    input: {
      itemKey: string;
      quantity: number;
      warehouseKey: string;
      locationKey?: string;
      lotKey: string;
      unitCost: number;
      ticketKey: string;
      settlementKey?: string;
      qrCode?: string;
      barcode?: string;
      producerName?: string;
      farmName?: string;
      agriculturalLotCode?: string;
      purchaseCenterKey?: string;
      ownerOrgKey?: string;
    },
  ) {
    return this.post(organizationId, userId, {
      movementType: 'entry',
      itemKey: input.itemKey,
      quantity: input.quantity,
      toWarehouseKey: input.warehouseKey,
      toLocationKey: input.locationKey,
      lotKey: input.lotKey,
      unitCost: input.unitCost,
      source: 'coffee_purchase',
      sourceRef: input.ticketKey,
      documentKey: input.settlementKey,
      documentType: 'settlement',
      reason: `Entrada por compra de café ${input.ticketKey}`,
      qrCode: input.qrCode,
      barcode: input.barcode,
      producerName: input.producerName,
      farmName: input.farmName,
      agriculturalLotCode: input.agriculturalLotCode,
      purchaseCenterKey: input.purchaseCenterKey,
      ownerOrgKey: input.ownerOrgKey,
    });
  }

  private reverseType(type: EimsMovementType): EimsMovementType {
    switch (type) {
      case 'entry':
      case 'production':
      case 'return':
      case 'adjustment_positive':
        return 'adjustment_negative';
      case 'exit':
      case 'consumption':
      case 'shrinkage':
      case 'loss':
      case 'donation':
      case 'transformation':
      case 'adjustment_negative':
        return 'adjustment_positive';
      case 'reservation':
        return 'release';
      case 'release':
        return 'reservation';
      case 'block':
        return 'unblock';
      case 'unblock':
        return 'block';
      case 'transfer':
      case 'intercompany_transfer':
        return 'transfer';
      default:
        return 'adjustment_positive';
    }
  }

  private async requireWarehouse(organizationId: string, warehouseKey: string) {
    const row = await this.prisma.eimsWarehouse.findFirst({
      where: { organizationId, warehouseKey, isActive: true },
    });
    if (!row) throw new BadRequestException(`Bodega ${warehouseKey} no encontrada`);
    return row;
  }

  private async requireLocation(organizationId: string, locationKey: string) {
    const row = await this.prisma.eimsLocation.findFirst({
      where: { organizationId, locationKey, isActive: true },
    });
    if (!row) throw new BadRequestException(`Ubicación ${locationKey} no encontrada`);
    return row;
  }

  private toSnapshot(balance: {
    onHandQty: number;
    reservedQty: number;
    blockedQty: number;
    availableQty: number;
    averageCost: number;
    totalCost: number;
  }): StockSnapshot {
    return {
      onHandQty: balance.onHandQty,
      reservedQty: balance.reservedQty,
      blockedQty: balance.blockedQty,
      availableQty: balance.availableQty,
      averageCost: balance.averageCost,
      totalCost: balance.totalCost,
    };
  }

  private async getOrCreateBalance(
    organizationId: string,
    itemId: string,
    warehouseId: string,
    locationId?: string | null,
  ) {
    const scope = locationScope(locationId);
    return this.prisma.eimsStockBalance.upsert({
      where: {
        organizationId_itemId_warehouseId_locationScope: {
          organizationId,
          itemId,
          warehouseId,
          locationScope: scope,
        },
      },
      update: {},
      create: {
        organizationId,
        itemId,
        warehouseId,
        locationId: locationId ?? undefined,
        locationScope: scope,
      },
    });
  }

  private async applyBalanceChange(
    organizationId: string,
    itemId: string,
    warehouseId: string,
    locationId: string | null | undefined,
    delta: ReturnType<typeof movementDelta>,
    unitCost: number,
  ) {
    const balance = await this.getOrCreateBalance(organizationId, itemId, warehouseId, locationId);
    const exitUnitCost = balance.averageCost || unitCost;
    const appliedUnitCost = delta.onHandDelta < 0 ? exitUnitCost : unitCost;
    const next = applyDelta(this.toSnapshot(balance), {
      ...delta,
      costDelta:
        delta.onHandDelta > 0
          ? Math.abs(delta.onHandDelta) * appliedUnitCost
          : delta.onHandDelta < 0
            ? -Math.abs(delta.onHandDelta) * appliedUnitCost
            : delta.costDelta,
    });
    if (delta.onHandDelta > 0 && balance.onHandQty > 0) {
      const totalQty = balance.onHandQty + delta.onHandDelta;
      const totalValue = balance.totalCost + Math.abs(delta.onHandDelta) * appliedUnitCost;
      next.averageCost = totalQty > 0 ? Number((totalValue / totalQty).toFixed(6)) : appliedUnitCost;
      next.totalCost = Number(totalValue.toFixed(6));
    } else if (delta.onHandDelta < 0) {
      next.averageCost = next.onHandQty > 0 ? Number((next.totalCost / next.onHandQty).toFixed(6)) : 0;
    }
    return this.prisma.eimsStockBalance.update({
      where: { id: balance.id },
      data: {
        onHandQty: next.onHandQty,
        reservedQty: next.reservedQty,
        blockedQty: next.blockedQty,
        availableQty: next.availableQty,
        averageCost: next.averageCost,
        totalCost: next.totalCost,
        version: { increment: 1 },
      },
    });
  }

}
