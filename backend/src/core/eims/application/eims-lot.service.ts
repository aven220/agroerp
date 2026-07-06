import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EimsAuditService } from './eims-audit.service';
import { EimsParameterService } from './eims-parameter.service';
import { EimsTraceabilityService } from './eims-traceability.service';
import { locationScope } from '../domain/eims-movement.engine';
import {
  computeExpiryDate,
  daysToExpiry,
  expiryAlertSeverity,
  generateAlertKey,
  generateIncidentKey,
  generateLotBarcode,
  generateLotKey,
  generateLotQrCode,
  isExpired,
  resolveLotStatusAfterQty,
  type EimsLotStatusValue,
} from '../domain/eims-traceability.engine';

export interface CreateLotInput {
  itemKey: string;
  warehouseKey: string;
  locationKey?: string;
  lotKey?: string;
  qrCode?: string;
  barcode?: string;
  serialNumber?: string;
  manufacturerSerial?: string;
  internalSerial?: string;
  productionDate?: string;
  receivedDate?: string;
  expiryDate?: string;
  shelfLifeDays?: number;
  initialQty?: number;
  unitCost?: number;
  purchaseCenterKey?: string;
  ownerOrgKey?: string;
  sourceRef?: string;
  sourceType?: string;
  producerName?: string;
  farmName?: string;
  agriculturalLotCode?: string;
  customerName?: string;
  warrantyUntil?: string;
  status?: EimsLotStatusValue;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class EimsLotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EimsAuditService,
    private readonly parameters: EimsParameterService,
    private readonly trace: EimsTraceabilityService,
  ) {}

  list(
    organizationId: string,
    filters?: {
      itemKey?: string;
      warehouseKey?: string;
      status?: string;
      q?: string;
      producer?: string;
      farm?: string;
      agriculturalLot?: string;
      customer?: string;
      documentKey?: string;
      fromDate?: string;
      toDate?: string;
      expiringWithinDays?: number;
    },
  ) {
    const and: Prisma.EimsStockLotWhereInput[] = [{ organizationId }];
    if (filters?.itemKey) and.push({ item: { itemKey: filters.itemKey } });
    if (filters?.warehouseKey) and.push({ warehouse: { warehouseKey: filters.warehouseKey } });
    if (filters?.status) and.push({ status: filters.status as never });
    if (filters?.producer) and.push({ producerName: { contains: filters.producer, mode: 'insensitive' } });
    if (filters?.farm) and.push({ farmName: { contains: filters.farm, mode: 'insensitive' } });
    if (filters?.agriculturalLot) {
      and.push({ agriculturalLotCode: { contains: filters.agriculturalLot, mode: 'insensitive' } });
    }
    if (filters?.customer) and.push({ customerName: { contains: filters.customer, mode: 'insensitive' } });
    if (filters?.documentKey) {
      and.push({
        OR: [
          { sourceRef: filters.documentKey },
          { movements: { some: { documentKey: filters.documentKey } } },
          { traceEvents: { some: { documentKey: filters.documentKey } } },
        ],
      });
    }
    if (filters?.fromDate || filters?.toDate) {
      and.push({
        receivedDate: {
          ...(filters.fromDate ? { gte: new Date(filters.fromDate) } : {}),
          ...(filters.toDate ? { lte: new Date(filters.toDate) } : {}),
        },
      });
    }
    if (filters?.expiringWithinDays != null) {
      const until = new Date();
      until.setUTCDate(until.getUTCDate() + filters.expiringWithinDays);
      and.push({ expiryDate: { lte: until }, status: { notIn: ['closed', 'sold', 'dispatched'] } });
    }
    if (filters?.q) {
      const q = filters.q;
      and.push({
        OR: [
          { lotKey: { contains: q, mode: 'insensitive' } },
          { qrCode: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q, mode: 'insensitive' } },
          { serialNumber: { contains: q, mode: 'insensitive' } },
          { manufacturerSerial: { contains: q, mode: 'insensitive' } },
          { internalSerial: { contains: q, mode: 'insensitive' } },
          { producerName: { contains: q, mode: 'insensitive' } },
          { farmName: { contains: q, mode: 'insensitive' } },
          { agriculturalLotCode: { contains: q, mode: 'insensitive' } },
          { customerName: { contains: q, mode: 'insensitive' } },
          { sourceRef: { contains: q, mode: 'insensitive' } },
          { item: { itemKey: { contains: q, mode: 'insensitive' } } },
          { item: { name: { contains: q, mode: 'insensitive' } } },
        ],
      });
    }
    return this.prisma.eimsStockLot.findMany({
      where: { AND: and },
      include: {
        item: { select: { itemKey: true, name: true, uomKey: true } },
        warehouse: { select: { warehouseKey: true, name: true } },
        location: { select: { locationKey: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });
  }

  async getOne(organizationId: string, lotKey: string) {
    const lot = await this.prisma.eimsStockLot.findFirst({
      where: { organizationId, lotKey },
      include: {
        item: true,
        warehouse: true,
        location: true,
        serials: true,
        incidents: { orderBy: { createdAt: 'desc' } },
        expiryAlerts: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!lot) throw new NotFoundException(`Lote ${lotKey} no encontrado`);
    return lot;
  }

  async findByCode(organizationId: string, code: string) {
    const lot = await this.prisma.eimsStockLot.findFirst({
      where: {
        organizationId,
        OR: [
          { lotKey: code },
          { qrCode: code },
          { barcode: code },
          { serialNumber: code },
          { manufacturerSerial: code },
          { internalSerial: code },
        ],
      },
      include: {
        item: true,
        warehouse: true,
        location: true,
        serials: true,
        incidents: { orderBy: { createdAt: 'desc' }, take: 20 },
        traceEvents: { orderBy: { occurredAt: 'desc' }, take: 50 },
      },
    });
    if (!lot) throw new NotFoundException(`Lote no encontrado para código ${code}`);
    return lot;
  }

  async createManual(organizationId: string, userId: string, input: CreateLotInput) {
    const item = await this.prisma.eimsItem.findFirst({
      where: { organizationId, itemKey: input.itemKey, isActive: true },
    });
    if (!item) throw new NotFoundException(`Artículo ${input.itemKey} no encontrado`);
    const warehouse = await this.prisma.eimsWarehouse.findFirst({
      where: { organizationId, warehouseKey: input.warehouseKey, isActive: true },
    });
    if (!warehouse) throw new NotFoundException(`Bodega ${input.warehouseKey} no encontrada`);
    let locationId: string | undefined;
    if (input.locationKey) {
      const location = await this.prisma.eimsLocation.findFirst({
        where: { organizationId, warehouseId: warehouse.id, locationKey: input.locationKey },
      });
      if (!location) throw new NotFoundException(`Ubicación ${input.locationKey} no encontrada`);
      locationId = location.id;
    }

    const lotKey = input.lotKey?.trim() || generateLotKey(item.itemKey);
    const existing = await this.prisma.eimsStockLot.findFirst({
      where: { organizationId, itemId: item.id, lotKey },
    });
    if (existing) throw new BadRequestException(`El lote ${lotKey} ya existe`);

    const qrCode = input.qrCode ?? generateLotQrCode(lotKey, item.itemKey);
    const barcode = input.barcode ?? generateLotBarcode(lotKey, item.itemKey);
    let expiryDate = input.expiryDate ? new Date(input.expiryDate) : undefined;
    const productionDate = input.productionDate ? new Date(input.productionDate) : undefined;
    const shelfLifeDays = input.shelfLifeDays;
    if (!expiryDate && productionDate && shelfLifeDays != null) {
      expiryDate = computeExpiryDate(productionDate, shelfLifeDays);
    }
    const initialQty = input.initialQty ?? 0;
    const unitCost = input.unitCost ?? 0;
    const status = resolveLotStatusAfterQty(
      initialQty,
      0,
      0,
      expiryDate,
      input.status,
    );

    const lot = await this.prisma.eimsStockLot.create({
      data: {
        organizationId,
        itemId: item.id,
        warehouseId: warehouse.id,
        locationId,
        lotKey,
        qrCode,
        barcode,
        serialNumber: input.serialNumber,
        manufacturerSerial: input.manufacturerSerial,
        internalSerial: input.internalSerial,
        productionDate,
        receivedDate: input.receivedDate ? new Date(input.receivedDate) : new Date(),
        expiryDate,
        shelfLifeDays,
        initialQty,
        onHandQty: initialQty,
        unitCost,
        accumulatedCost: Number((initialQty * unitCost).toFixed(6)),
        status,
        purchaseCenterKey: input.purchaseCenterKey,
        ownerOrgKey: input.ownerOrgKey,
        sourceRef: input.sourceRef,
        sourceType: input.sourceType ?? 'manual',
        producerName: input.producerName,
        farmName: input.farmName,
        agriculturalLotCode: input.agriculturalLotCode,
        customerName: input.customerName,
        warrantyUntil: input.warrantyUntil ? new Date(input.warrantyUntil) : undefined,
        createdBy: userId,
        metadata: (input.metadata ?? {}) as object,
      },
      include: {
        item: true,
        warehouse: true,
        location: true,
      },
    });

    if (initialQty > 0) {
      const scope = locationScope(locationId);
      const balance = await this.prisma.eimsStockBalance.findUnique({
        where: {
          organizationId_itemId_warehouseId_locationScope: {
            organizationId,
            itemId: item.id,
            warehouseId: warehouse.id,
            locationScope: scope,
          },
        },
      });
      if (balance) {
        const onHandQty = Number((balance.onHandQty + initialQty).toFixed(6));
        const totalCost = Number((balance.totalCost + initialQty * unitCost).toFixed(6));
        await this.prisma.eimsStockBalance.update({
          where: { id: balance.id },
          data: {
            onHandQty,
            availableQty: Number(Math.max(0, onHandQty - balance.reservedQty - balance.blockedQty).toFixed(6)),
            totalCost,
            averageCost: onHandQty > 0 ? Number((totalCost / onHandQty).toFixed(6)) : unitCost,
            version: { increment: 1 },
          },
        });
      } else {
        await this.prisma.eimsStockBalance.create({
          data: {
            organizationId,
            itemId: item.id,
            warehouseId: warehouse.id,
            locationId,
            locationScope: scope,
            onHandQty: initialQty,
            availableQty: initialQty,
            averageCost: unitCost,
            totalCost: Number((initialQty * unitCost).toFixed(6)),
          },
        });
      }
    }

    await this.trace.record(organizationId, {
      lotKey,
      stockLotId: lot.id,
      stage: 'inventory_entry',
      eventType: 'lot_created',
      title: 'Creación de lote',
      description: input.sourceType === 'manual' || !input.sourceType ? 'Creación manual' : `Origen ${input.sourceType}`,
      actorId: userId,
      warehouseKey: warehouse.warehouseKey,
      documentKey: input.sourceRef,
      payload: { initialQty, unitCost, qrCode, barcode },
    });

    await this.audit.log(organizationId, 'StockLot', lotKey, 'created', userId, {
      itemKey: input.itemKey,
      warehouseKey: input.warehouseKey,
      initialQty,
      status,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsStockLot',
      lot.id,
      EVENT_TYPES.EIMS_LOT_CREATED,
      { lotKey, itemKey: input.itemKey, qrCode, barcode },
    );
    await this.refreshExpiryAlerts(organizationId, lot.id);
    return lot;
  }

  async ensureLotForMovement(
    organizationId: string,
    userId: string,
    input: {
      itemId: string;
      itemKey: string;
      warehouseId: string;
      locationId?: string;
      lotKey: string;
      serialNumber?: string;
      manufacturerSerial?: string;
      internalSerial?: string;
      expiryDate?: string;
      productionDate?: string;
      shelfLifeDays?: number;
      unitCost?: number;
      quantity?: number;
      purchaseCenterKey?: string;
      ownerOrgKey?: string;
      sourceRef?: string;
      sourceType?: string;
      producerName?: string;
      farmName?: string;
      agriculturalLotCode?: string;
      customerName?: string;
      warrantyUntil?: string;
      qrCode?: string;
      barcode?: string;
      isNewEntry?: boolean;
    },
  ) {
    const qrCode = input.qrCode ?? generateLotQrCode(input.lotKey, input.itemKey);
    const barcode = input.barcode ?? generateLotBarcode(input.lotKey, input.itemKey);
    let expiryDate = input.expiryDate ? new Date(input.expiryDate) : undefined;
    const productionDate = input.productionDate ? new Date(input.productionDate) : undefined;
    if (!expiryDate && productionDate && input.shelfLifeDays != null) {
      expiryDate = computeExpiryDate(productionDate, input.shelfLifeDays);
    }

    const existing = await this.prisma.eimsStockLot.findUnique({
      where: {
        organizationId_itemId_lotKey: {
          organizationId,
          itemId: input.itemId,
          lotKey: input.lotKey,
        },
      },
    });

    if (existing) {
      return this.prisma.eimsStockLot.update({
        where: { id: existing.id },
        data: {
          serialNumber: input.serialNumber ?? existing.serialNumber,
          manufacturerSerial: input.manufacturerSerial ?? existing.manufacturerSerial,
          internalSerial: input.internalSerial ?? existing.internalSerial,
          expiryDate: expiryDate ?? existing.expiryDate,
          productionDate: productionDate ?? existing.productionDate,
          shelfLifeDays: input.shelfLifeDays ?? existing.shelfLifeDays,
          purchaseCenterKey: input.purchaseCenterKey ?? existing.purchaseCenterKey,
          ownerOrgKey: input.ownerOrgKey ?? existing.ownerOrgKey,
          sourceRef: input.sourceRef ?? existing.sourceRef,
          sourceType: input.sourceType ?? existing.sourceType,
          producerName: input.producerName ?? existing.producerName,
          farmName: input.farmName ?? existing.farmName,
          agriculturalLotCode: input.agriculturalLotCode ?? existing.agriculturalLotCode,
          customerName: input.customerName ?? existing.customerName,
          warrantyUntil: input.warrantyUntil ? new Date(input.warrantyUntil) : existing.warrantyUntil,
          qrCode: existing.qrCode ?? qrCode,
          barcode: existing.barcode ?? barcode,
          unitCost: existing.unitCost || input.unitCost || 0,
        },
      });
    }

    const initialQty = input.isNewEntry ? (input.quantity ?? 0) : 0;
    const unitCost = input.unitCost ?? 0;
    const lot = await this.prisma.eimsStockLot.create({
      data: {
        organizationId,
        itemId: input.itemId,
        warehouseId: input.warehouseId,
        locationId: input.locationId,
        lotKey: input.lotKey,
        qrCode,
        barcode,
        serialNumber: input.serialNumber,
        manufacturerSerial: input.manufacturerSerial,
        internalSerial: input.internalSerial,
        productionDate,
        expiryDate,
        shelfLifeDays: input.shelfLifeDays,
        initialQty,
        onHandQty: 0,
        unitCost,
        accumulatedCost: 0,
        status: 'available',
        purchaseCenterKey: input.purchaseCenterKey,
        ownerOrgKey: input.ownerOrgKey,
        sourceRef: input.sourceRef,
        sourceType: input.sourceType,
        producerName: input.producerName,
        farmName: input.farmName,
        agriculturalLotCode: input.agriculturalLotCode,
        customerName: input.customerName,
        warrantyUntil: input.warrantyUntil ? new Date(input.warrantyUntil) : undefined,
        createdBy: userId,
      },
    });

    await this.trace.record(organizationId, {
      lotKey: lot.lotKey,
      stockLotId: lot.id,
      stage: 'inventory_entry',
      eventType: 'lot_auto_created',
      title: 'Creación automática de lote',
      actorId: userId,
      documentKey: input.sourceRef,
      payload: { sourceType: input.sourceType, qrCode, barcode },
    });

    if (input.sourceType === 'coffee_purchase') {
      await this.trace.seedCoffeeOriginTrace(organizationId, userId, lot);
    }

    await this.audit.log(organizationId, 'StockLot', lot.lotKey, 'created', userId, {
      auto: true,
      sourceType: input.sourceType,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsStockLot',
      lot.id,
      EVENT_TYPES.EIMS_LOT_CREATED,
      { lotKey: lot.lotKey, auto: true },
    );
    return lot;
  }

  async assertLotMovable(organizationId: string, lotKey: string, itemId: string) {
    const lot = await this.prisma.eimsStockLot.findFirst({
      where: { organizationId, itemId, lotKey },
    });
    if (!lot) return;
    const blockParam = await this.parameters.resolve(organizationId, 'lot_block_on_expiry');
    const blockValue = (blockParam?.value ?? { enabled: true }) as { enabled?: boolean };
    const blockOnExpiry = blockValue.enabled !== false;
    if (
      lot.status === 'blocked' ||
      lot.status === 'expired' ||
      lot.status === 'quarantined' ||
      (blockOnExpiry && isExpired(lot.expiryDate))
    ) {
      throw new BadRequestException(`Lote ${lotKey} bloqueado por vencimiento o estado ${lot.status}`);
    }
  }

  async applyQtyChange(
    stockLotId: string,
    type: string,
    quantity: number,
    unitCost?: number,
    options?: { forceStatus?: EimsLotStatusValue; customerName?: string },
  ) {
    const lot = await this.prisma.eimsStockLot.findUnique({ where: { id: stockLotId } });
    if (!lot) return null;
    const qty = Math.abs(quantity);
    let onHandQty = lot.onHandQty;
    let reservedQty = lot.reservedQty;
    let blockedQty = lot.blockedQty;
    let accumulatedCost = lot.accumulatedCost;
    let initialQty = lot.initialQty;
    let appliedUnitCost = lot.unitCost;

    switch (type) {
      case 'entry':
      case 'adjustment_positive':
      case 'production':
      case 'return':
        onHandQty = Number((onHandQty + qty).toFixed(6));
        if (initialQty <= 0) initialQty = qty;
        if (unitCost != null && unitCost > 0) {
          const totalCost = accumulatedCost + qty * unitCost;
          appliedUnitCost = onHandQty > 0 ? Number((totalCost / onHandQty).toFixed(6)) : unitCost;
          accumulatedCost = Number(totalCost.toFixed(6));
        } else {
          accumulatedCost = Number((accumulatedCost + qty * appliedUnitCost).toFixed(6));
        }
        break;
      case 'exit':
      case 'adjustment_negative':
      case 'consumption':
      case 'shrinkage':
      case 'loss':
      case 'donation':
      case 'transformation':
        onHandQty = Number((onHandQty - qty).toFixed(6));
        accumulatedCost = Number(Math.max(0, accumulatedCost - qty * appliedUnitCost).toFixed(6));
        break;
      case 'reservation':
        reservedQty = Number((reservedQty + qty).toFixed(6));
        break;
      case 'release':
        reservedQty = Number(Math.max(0, reservedQty - qty).toFixed(6));
        break;
      case 'block':
        blockedQty = Number((blockedQty + qty).toFixed(6));
        break;
      case 'unblock':
        blockedQty = Number(Math.max(0, blockedQty - qty).toFixed(6));
        break;
      default:
        break;
    }

    const status = resolveLotStatusAfterQty(
      onHandQty,
      reservedQty,
      blockedQty,
      lot.expiryDate,
      options?.forceStatus,
    );

    return this.prisma.eimsStockLot.update({
      where: { id: stockLotId },
      data: {
        onHandQty,
        reservedQty,
        blockedQty,
        initialQty,
        unitCost: appliedUnitCost,
        accumulatedCost,
        status,
        customerName: options?.customerName ?? lot.customerName,
      },
    });
  }

  async reclassify(
    organizationId: string,
    userId: string,
    lotKey: string,
    input: { status: EimsLotStatusValue; reason: string; itemKey?: string },
  ) {
    const lot = await this.getOne(organizationId, lotKey);
    if (!input.reason?.trim()) throw new BadRequestException('Justificación requerida');
    let itemId = lot.itemId;
    if (input.itemKey) {
      const item = await this.prisma.eimsItem.findFirst({
        where: { organizationId, itemKey: input.itemKey },
      });
      if (!item) throw new NotFoundException(`Artículo ${input.itemKey} no encontrado`);
      itemId = item.id;
    }
    const updated = await this.prisma.eimsStockLot.update({
      where: { id: lot.id },
      data: {
        status: input.status,
        itemId,
        metadata: {
          ...((lot.metadata as object) ?? {}),
          reclassification: {
            previousStatus: lot.status,
            reason: input.reason,
            at: new Date().toISOString(),
            by: userId,
          },
        },
      },
    });
    await this.trace.record(organizationId, {
      lotKey,
      stockLotId: lot.id,
      stage: 'reclassification',
      eventType: 'lot_reclassified',
      title: 'Reclasificación de lote',
      description: input.reason,
      actorId: userId,
      payload: { previousStatus: lot.status, status: input.status, itemKey: input.itemKey },
    });
    await this.audit.log(organizationId, 'StockLot', lotKey, 'reclassified', userId, {
      previousStatus: lot.status,
      status: input.status,
      reason: input.reason,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsStockLot',
      lot.id,
      EVENT_TYPES.EIMS_LOT_RECLASSIFIED,
      { lotKey, status: input.status },
    );
    return updated;
  }

  async blockExpired(organizationId: string, userId: string) {
    const lots = await this.prisma.eimsStockLot.findMany({
      where: {
        organizationId,
        expiryDate: { lt: new Date() },
        status: { in: ['available', 'reserved'] },
        onHandQty: { gt: 0 },
      },
    });
    const results = [];
    for (const lot of lots) {
      const updated = await this.prisma.eimsStockLot.update({
        where: { id: lot.id },
        data: { status: 'expired', blockedQty: lot.onHandQty },
      });
      await this.trace.record(organizationId, {
        lotKey: lot.lotKey,
        stockLotId: lot.id,
        stage: 'expiry',
        eventType: 'lot_expired_blocked',
        title: 'Bloqueo por vencimiento',
        actorId: userId,
      });
      await this.audit.log(organizationId, 'StockLot', lot.lotKey, 'expired_blocked', userId, {});
      await this.core.emitUserAction(
        organizationId,
        'EimsStockLot',
        lot.id,
        EVENT_TYPES.EIMS_LOT_EXPIRED,
        { lotKey: lot.lotKey },
      );
      results.push(updated);
    }
    return { blocked: results.length, lots: results };
  }

  async refreshExpiryAlerts(organizationId: string, stockLotId?: string) {
    const lots = await this.prisma.eimsStockLot.findMany({
      where: {
        organizationId,
        ...(stockLotId ? { id: stockLotId } : {}),
        expiryDate: { not: null },
        status: { notIn: ['closed', 'sold', 'dispatched', 'transformed'] },
        onHandQty: { gt: 0 },
      },
      take: 2000,
    });
    const created = [];
    for (const lot of lots) {
      const days = daysToExpiry(lot.expiryDate);
      const severity = expiryAlertSeverity(days);
      if (severity == null || days == null || !lot.expiryDate) continue;
      const alertKey = generateAlertKey(lot.lotKey, days);
      const alert = await this.prisma.eimsExpiryAlert.upsert({
        where: { organizationId_alertKey: { organizationId, alertKey } },
        update: { daysToExpiry: days, severity, expiryDate: lot.expiryDate },
        create: {
          organizationId,
          stockLotId: lot.id,
          lotKey: lot.lotKey,
          alertKey,
          daysToExpiry: days,
          expiryDate: lot.expiryDate,
          severity,
        },
      });
      created.push(alert);
      if (!alert.acknowledged) {
        await this.core.emitUserAction(
          organizationId,
          'EimsExpiryAlert',
          alert.id,
          EVENT_TYPES.EIMS_EXPIRY_ALERT,
          { lotKey: lot.lotKey, daysToExpiry: days, severity },
        );
      }
    }
    return created;
  }

  expiryPanel(organizationId: string) {
    return this.prisma.eimsStockLot.findMany({
      where: {
        organizationId,
        expiryDate: { not: null },
        onHandQty: { gt: 0 },
        status: { notIn: ['closed', 'sold', 'dispatched'] },
      },
      include: {
        item: { select: { itemKey: true, name: true } },
        warehouse: { select: { warehouseKey: true, name: true } },
      },
      orderBy: { expiryDate: 'asc' },
      take: 300,
    });
  }

  alertsPanel(organizationId: string, acknowledged?: boolean) {
    return this.prisma.eimsExpiryAlert.findMany({
      where: {
        organizationId,
        ...(acknowledged == null ? {} : { acknowledged }),
      },
      include: { stockLot: { include: { item: true, warehouse: true } } },
      orderBy: { expiryDate: 'asc' },
      take: 300,
    });
  }

  async acknowledgeAlert(organizationId: string, userId: string, alertKey: string) {
    const alert = await this.prisma.eimsExpiryAlert.findFirst({
      where: { organizationId, alertKey },
    });
    if (!alert) throw new NotFoundException(`Alerta ${alertKey} no encontrada`);
    return this.prisma.eimsExpiryAlert.update({
      where: { id: alert.id },
      data: { acknowledged: true, acknowledgedBy: userId },
    });
  }

  async registerIncident(
    organizationId: string,
    userId: string,
    input: { lotKey: string; title: string; description?: string; severity?: string; metadata?: Record<string, unknown> },
  ) {
    const lot = await this.prisma.eimsStockLot.findFirst({
      where: { organizationId, lotKey: input.lotKey },
    });
    const incidentKey = generateIncidentKey(input.lotKey);
    const incident = await this.prisma.eimsLotIncident.create({
      data: {
        organizationId,
        stockLotId: lot?.id,
        lotKey: input.lotKey,
        incidentKey,
        severity: input.severity ?? 'warning',
        title: input.title,
        description: input.description,
        reportedBy: userId,
        metadata: (input.metadata ?? {}) as object,
      },
    });
    await this.trace.record(organizationId, {
      lotKey: input.lotKey,
      stockLotId: lot?.id,
      stage: 'incident',
      eventType: 'lot_incident',
      title: input.title,
      description: input.description,
      actorId: userId,
      payload: { severity: input.severity, incidentKey },
    });
    await this.audit.log(organizationId, 'LotIncident', incidentKey, 'created', userId, {
      lotKey: input.lotKey,
      title: input.title,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsLotIncident',
      incident.id,
      EVENT_TYPES.EIMS_LOT_INCIDENT,
      { lotKey: input.lotKey, incidentKey },
    );
    return incident;
  }

  transformationsPanel(organizationId: string) {
    return this.prisma.eimsLotTransformation.findMany({
      where: { organizationId },
      include: {
        parentLot: { include: { item: true } },
        childLot: { include: { item: true } },
      },
      orderBy: { performedAt: 'desc' },
      take: 300,
    });
  }
}
