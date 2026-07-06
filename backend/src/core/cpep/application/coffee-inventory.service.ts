import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EimsMovementService } from '@/core/eims/application/eims-movement.service';
import { CoffeeReceptionService } from './coffee-reception.service';
import { CoffeeAuditService } from './coffee-audit.service';
import {
  InventoryMovementType,
  applyMovementToBalances,
  buildKardexDelta,
  computeAverageCost,
  generateInventoryLotKey,
  generateLotCodes,
  generateMovementKey,
} from '../domain/inventory.engine';

@Injectable()
export class CoffeeInventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly reception: CoffeeReceptionService,
    private readonly audit: CoffeeAuditService,
    @Optional() private readonly eimsMovements?: EimsMovementService,
  ) {}

  list(organizationId: string) {
    return this.prisma.cpepInventoryMovement.findMany({
      where: { organizationId },
      include: {
        ticket: { select: { ticketKey: true, producerName: true, lotCode: true } },
        lot: true,
      },
      orderBy: { postedAt: 'desc' },
      take: 200,
    });
  }

  listLots(organizationId: string, status?: string) {
    return this.prisma.cpepInventoryLot.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as 'available' } : {}),
      },
      include: {
        movements: { orderBy: { postedAt: 'desc' }, take: 5 },
        ticket: { select: { ticketKey: true, status: true } },
      },
      orderBy: { receivedAt: 'desc' },
      take: 200,
    });
  }

  async getLot(organizationId: string, lotKey: string) {
    const lot = await this.prisma.cpepInventoryLot.findFirst({
      where: { organizationId, lotKey },
      include: {
        movements: { orderBy: { postedAt: 'asc' } },
        kardexEntries: { orderBy: { postedAt: 'asc' } },
        costHistories: { orderBy: { recordedAt: 'asc' } },
        traceEvents: { orderBy: { occurredAt: 'asc' } },
        ticket: {
          include: {
            quality: true,
            settlement: true,
            weighings: true,
            documents: true,
          },
        },
      },
    });
    if (!lot) throw new NotFoundException(`Lote de inventario ${lotKey} no encontrado`);
    return lot;
  }

  async findByQr(organizationId: string, qrCode: string) {
    const lot = await this.prisma.cpepInventoryLot.findFirst({
      where: {
        organizationId,
        OR: [{ qrCode }, { barcode: qrCode }, { lotKey: qrCode }],
      },
      include: {
        movements: { orderBy: { postedAt: 'desc' }, take: 20 },
        traceEvents: { orderBy: { occurredAt: 'asc' } },
      },
    });
    if (!lot) throw new NotFoundException(`Lote no encontrado para ${qrCode}`);
    return lot;
  }

  kardex(organizationId: string, lotKey?: string, warehouse?: string) {
    return this.prisma.cpepKardexEntry.findMany({
      where: {
        organizationId,
        ...(warehouse ? { warehouse } : {}),
        ...(lotKey ? { lot: { lotKey } } : {}),
      },
      include: { lot: { select: { lotKey: true, producerName: true } } },
      orderBy: { postedAt: 'asc' },
      take: 500,
    });
  }

  costHistory(organizationId: string, lotKey?: string) {
    return this.prisma.cpepCostHistory.findMany({
      where: {
        organizationId,
        ...(lotKey ? { lot: { lotKey } } : {}),
      },
      include: { lot: { select: { lotKey: true } } },
      orderBy: { recordedAt: 'desc' },
      take: 200,
    });
  }

  async postToInventory(
    organizationId: string,
    userId: string,
    ticketKey: string,
    warehouse = 'Acopio principal',
    locationLabel = 'Recepción / Acopio',
  ) {
    const ticket = await this.reception.findOne(organizationId, ticketKey);
    if (ticket.netWeightKg == null) throw new BadRequestException('Sin peso neto');
    if (!ticket.settlement || ticket.settlement.voided) {
      throw new BadRequestException('Requiere liquidación previa válida');
    }

    const existingLot = await this.prisma.cpepInventoryLot.findFirst({
      where: { organizationId, ticketId: ticket.id },
    });
    if (existingLot) {
      return {
        lot: existingLot,
        movement: await this.prisma.cpepInventoryMovement.findFirst({
          where: { organizationId, lotId: existingLot.id, movementType: 'entry' },
        }),
        duplicate: true,
      };
    }

    const unitCost = ticket.settlement.totalAmount / ticket.netWeightKg;
    const lotKey = generateInventoryLotKey(ticket.ticketKey);
    const codes = generateLotCodes(lotKey);
    const movementKey = generateMovementKey(lotKey, 'entry', 1);

    let inventoryResourceId: string | undefined;
    const existingResource = await this.prisma.resource.findFirst({
      where: {
        organizationId,
        resourceType: 'inventory',
        deletedAt: null,
        data: { path: ['lot_code'], equals: ticket.lotCode ?? ticket.ticketKey },
      },
    });

    let averageCost = unitCost;
    if (existingResource) {
      const data = existingResource.data as Record<string, unknown>;
      const stock = Number(data.stock_kg ?? 0);
      const prevAvg = Number(data.average_cost ?? data.unit_cost ?? unitCost);
      averageCost = computeAverageCost(stock, prevAvg, ticket.netWeightKg, unitCost);
      const newStock = stock + ticket.netWeightKg;
      await this.prisma.resource.update({
        where: { id: existingResource.id },
        data: {
          data: {
            ...data,
            stock_kg: newStock,
            warehouse,
            location: locationLabel,
            quality_grade: ticket.quality?.grade ?? data.quality_grade,
            unit_cost: unitCost,
            average_cost: averageCost,
            lot_code: ticket.lotCode ?? ticket.ticketKey,
            source_ticket: ticket.ticketKey,
            inventory_lot_key: lotKey,
          } as object,
          updatedBy: userId,
        },
      });
      inventoryResourceId = existingResource.id;
    } else {
      const created = await this.prisma.resource.create({
        data: {
          organizationId,
          resourceType: 'inventory',
          data: {
            name: `Café ${ticket.producerName ?? ticket.ticketKey}`,
            stock_kg: ticket.netWeightKg,
            warehouse,
            location: locationLabel,
            quality_grade: ticket.quality?.grade ?? 'standard',
            lot_code: ticket.lotCode ?? ticket.ticketKey,
            unit_cost: unitCost,
            average_cost: unitCost,
            source_ticket: ticket.ticketKey,
            inventory_lot_key: lotKey,
            qr_code: codes.qrCode,
            barcode: codes.barcode,
          } as object,
          createdBy: userId,
        },
      });
      inventoryResourceId = created.id;
    }

    const lot = await this.prisma.cpepInventoryLot.create({
      data: {
        organizationId,
        lotKey,
        ticketId: ticket.id,
        settlementId: ticket.settlement.id,
        inventoryResourceId,
        qrCode: codes.qrCode,
        barcode: codes.barcode,
        purchaseCenterId: ticket.purchaseCenterId,
        producerId: ticket.producerId,
        producerName: ticket.producerName,
        farmId: ticket.farmId,
        farmName: ticket.farmName,
        agriculturalLotId: ticket.lotId,
        agriculturalLotCode: ticket.lotCode,
        qualityGrade: ticket.quality?.grade,
        qualityDecision: ticket.quality?.decision,
        qualityScore: ticket.quality?.qualityScore,
        humidityPct: ticket.quality?.humidityPct,
        factor: ticket.quality?.factor,
        grossWeightKg: ticket.grossWeightKg,
        tareWeightKg: ticket.tareWeightKg,
        netWeightKg: ticket.netWeightKg,
        availableKg: ticket.netWeightKg,
        unitCost,
        averageCost,
        totalCost: ticket.settlement.totalAmount,
        warehouse,
        locationLabel,
        status: 'available',
        createdBy: userId,
        metadata: {
          settlementKey: ticket.settlement.settlementKey,
          ticketKey: ticket.ticketKey,
        },
      },
    });

    const movement = await this.prisma.cpepInventoryMovement.create({
      data: {
        organizationId,
        ticketId: ticket.id,
        lotId: lot.id,
        movementKey,
        movementType: 'entry',
        warehouse,
        locationLabel,
        lotCode: lot.lotKey,
        quantityKg: ticket.netWeightKg,
        unitCost,
        averageCost,
        totalCost: ticket.settlement.totalAmount,
        balanceKg: ticket.netWeightKg,
        inventoryResourceId,
        referenceKey: ticket.settlement.settlementKey,
        postedBy: userId,
        details: {
          ticketKey,
          producerName: ticket.producerName,
          farmName: ticket.farmName,
          qualityGrade: ticket.quality?.grade,
          settlementKey: ticket.settlement.settlementKey,
        },
      },
    });

    await this.writeKardex(organizationId, lot.id, ticket.id, movementKey, 'entry', warehouse, {
      entryKg: ticket.netWeightKg,
      exitKg: 0,
      balanceKg: ticket.netWeightKg,
      unitCost,
      averageCost,
      totalCost: ticket.settlement.totalAmount,
      balanceCost: ticket.settlement.totalAmount,
    });

    await this.prisma.cpepCostHistory.create({
      data: {
        organizationId,
        lotId: lot.id,
        ticketId: ticket.id,
        eventType: 'entry',
        previousUnitCost: 0,
        newUnitCost: unitCost,
        previousAverageCost: 0,
        newAverageCost: averageCost,
        quantityKg: ticket.netWeightKg,
        totalCost: ticket.settlement.totalAmount,
        reason: 'Entrada por compra de café',
        recordedBy: userId,
      },
    });

    await this.writeTraceChain(organizationId, userId, lot, ticket);

    await this.prisma.cpepReceptionTicket.update({
      where: { id: ticket.id },
      data: { status: 'inventory_posted' },
    });

    if (ticket.settlement.id) {
      await this.prisma.cpepSettlement.update({
        where: { id: ticket.settlement.id },
        data: { inventoryPosted: true },
      });
    }

    await this.audit.log(organizationId, 'InventoryLot', lotKey, 'created', userId, {
      quantityKg: ticket.netWeightKg,
      warehouse,
      unitCost,
      averageCost,
    });
    await this.audit.log(organizationId, 'Inventory', movementKey, 'posted', userId, {
      quantityKg: ticket.netWeightKg,
      lotKey,
    });

    await this.core.emitUserAction(
      organizationId,
      'CoffeeInventory',
      movement.id,
      EVENT_TYPES.COFFEE_INVENTORY_POSTED,
      { ticketKey, quantityKg: ticket.netWeightKg, lotKey, warehouse },
    );
    await this.core.emitUserAction(
      organizationId,
      'CoffeeInventoryLot',
      lot.id,
      EVENT_TYPES.COFFEE_INVENTORY_LOT_CREATED,
      { lotKey, ticketKey, qrCode: codes.qrCode },
    );

    let eimsMovement = null;
    if (this.eimsMovements) {
      try {
        const eimsWarehouse = await this.prisma.eimsWarehouse.findFirst({
          where: { organizationId, isActive: true },
          orderBy: { createdAt: 'asc' },
        });
        const eimsItem = await this.prisma.eimsItem.findFirst({
          where: {
            organizationId,
            isActive: true,
            itemTypeKey: { in: ['coffee_parchment', 'coffee_green', 'raw_material'] },
          },
          orderBy: { createdAt: 'asc' },
        });
        if (eimsWarehouse && eimsItem) {
          eimsMovement = await this.eimsMovements.fromCoffeePurchase(organizationId, userId, {
            itemKey: eimsItem.itemKey,
            quantity: ticket.netWeightKg,
            warehouseKey: eimsWarehouse.warehouseKey,
            lotKey,
            unitCost,
            ticketKey,
            settlementKey: ticket.settlement.settlementKey,
            qrCode: codes.qrCode,
            barcode: codes.barcode,
            producerName: ticket.producerName ?? undefined,
            farmName: ticket.farmName ?? undefined,
            agriculturalLotCode: ticket.lotCode ?? undefined,
            purchaseCenterKey: ticket.purchaseCenterId ?? undefined,
          });
        }
      } catch {
        // EIMS optional — coffee inventory remains source of truth for CPEP
      }
    }

    return { lot, movement, eimsMovement, duplicate: false };
  }

  async registerMovement(
    organizationId: string,
    userId: string,
    lotKey: string,
    input: {
      movementType: InventoryMovementType;
      quantityKg: number;
      warehouse?: string;
      toWarehouse?: string;
      locationLabel?: string;
      reason?: string;
      unitCost?: number;
    },
  ) {
    const lot = await this.prisma.cpepInventoryLot.findFirst({
      where: { organizationId, lotKey },
    });
    if (!lot) throw new NotFoundException(`Lote ${lotKey} no encontrado`);
    if (input.quantityKg <= 0) throw new BadRequestException('Cantidad inválida');

    const count = await this.prisma.cpepInventoryMovement.count({ where: { lotId: lot.id } });
    const movementKey = generateMovementKey(lotKey, input.movementType, count + 1);
    const unitCost = input.unitCost ?? lot.unitCost;
    let averageCost = lot.averageCost;

    if (input.movementType === 'entry' || (input.movementType === 'adjustment' && input.quantityKg > 0)) {
      averageCost = computeAverageCost(lot.availableKg, lot.averageCost, input.quantityKg, unitCost);
    }

    const balances = applyMovementToBalances(
      lot.availableKg,
      lot.reservedKg,
      lot.blockedKg,
      input.movementType,
      input.quantityKg,
    );

    if (
      ['exit', 'transfer', 'reservation', 'block', 'transformation'].includes(input.movementType) &&
      input.quantityKg > lot.availableKg
    ) {
      throw new BadRequestException('Cantidad supera disponible del lote');
    }

    const previousBalance = await this.prisma.cpepKardexEntry.findFirst({
      where: { lotId: lot.id },
      orderBy: { postedAt: 'desc' },
    });
    const kardex = buildKardexDelta(
      previousBalance?.balanceKg ?? lot.availableKg,
      previousBalance?.balanceCost ?? lot.totalCost,
      input.movementType,
      input.quantityKg,
      unitCost,
      averageCost,
    );

    const movement = await this.prisma.cpepInventoryMovement.create({
      data: {
        organizationId,
        ticketId: lot.ticketId,
        lotId: lot.id,
        movementKey,
        movementType: input.movementType,
        warehouse: input.warehouse ?? lot.warehouse,
        fromWarehouse: input.movementType === 'transfer' ? lot.warehouse : undefined,
        toWarehouse: input.toWarehouse,
        locationLabel: input.locationLabel ?? lot.locationLabel,
        lotCode: lot.lotKey,
        quantityKg: input.quantityKg,
        unitCost,
        averageCost,
        totalCost: input.quantityKg * unitCost,
        balanceKg: balances.availableKg,
        inventoryResourceId: lot.inventoryResourceId,
        reason: input.reason,
        postedBy: userId,
        details: { lotKey, movementType: input.movementType },
      },
    });

    const updatedLot = await this.prisma.cpepInventoryLot.update({
      where: { id: lot.id },
      data: {
        availableKg: balances.availableKg,
        reservedKg: balances.reservedKg,
        blockedKg: balances.blockedKg,
        status: balances.status,
        averageCost,
        unitCost: input.movementType === 'entry' ? unitCost : lot.unitCost,
        totalCost: balances.availableKg * averageCost,
        warehouse: input.toWarehouse && input.movementType === 'transfer' ? input.toWarehouse : lot.warehouse,
        locationLabel: input.locationLabel ?? lot.locationLabel,
      },
    });

    await this.writeKardex(
      organizationId,
      lot.id,
      lot.ticketId,
      movementKey,
      input.movementType,
      movement.warehouse,
      kardex,
    );

    await this.prisma.cpepCostHistory.create({
      data: {
        organizationId,
        lotId: lot.id,
        ticketId: lot.ticketId,
        eventType: input.movementType,
        previousUnitCost: lot.unitCost,
        newUnitCost: updatedLot.unitCost,
        previousAverageCost: lot.averageCost,
        newAverageCost: averageCost,
        quantityKg: input.quantityKg,
        totalCost: input.quantityKg * unitCost,
        reason: input.reason ?? `Movimiento ${input.movementType}`,
        recordedBy: userId,
      },
    });

    await this.prisma.cpepTraceEvent.create({
      data: {
        organizationId,
        lotId: lot.id,
        ticketId: lot.ticketId,
        eventKey: `trace-mov-${movementKey}`,
        stage: input.movementType === 'transformation' ? 'transformation' : input.movementType === 'exit' ? 'dispatch' : 'movement',
        eventType: input.movementType,
        title: `Movimiento ${input.movementType}`,
        description: input.reason,
        actorId: userId,
        warehouse: movement.warehouse,
        payload: { quantityKg: input.quantityKg, movementKey },
      },
    });

    if (lot.inventoryResourceId) {
      const resource = await this.prisma.resource.findUnique({ where: { id: lot.inventoryResourceId } });
      if (resource) {
        const data = resource.data as Record<string, unknown>;
        await this.prisma.resource.update({
          where: { id: resource.id },
          data: {
            data: {
              ...data,
              stock_kg: balances.availableKg,
              reserved_kg: balances.reservedKg,
              blocked_kg: balances.blockedKg,
              average_cost: averageCost,
              unit_cost: updatedLot.unitCost,
              warehouse: updatedLot.warehouse,
              location: updatedLot.locationLabel,
            } as object,
            updatedBy: userId,
          },
        });
      }
    }

    await this.audit.log(organizationId, 'InventoryLot', lotKey, `movement_${input.movementType}`, userId, {
      quantityKg: input.quantityKg,
      movementKey,
    });
    await this.core.emitUserAction(
      organizationId,
      'CoffeeInventory',
      movement.id,
      EVENT_TYPES.COFFEE_INVENTORY_MOVEMENT,
      { lotKey, movementType: input.movementType, quantityKg: input.quantityKg },
    );

    return { lot: updatedLot, movement };
  }

  async revalueLot(
    organizationId: string,
    userId: string,
    lotKey: string,
    newUnitCost: number,
    reason: string,
  ) {
    if (newUnitCost < 0) throw new BadRequestException('Costo inválido');
    if (!reason?.trim()) throw new BadRequestException('Justificación obligatoria');
    const lot = await this.prisma.cpepInventoryLot.findFirst({
      where: { organizationId, lotKey },
    });
    if (!lot) throw new NotFoundException(`Lote ${lotKey} no encontrado`);

    const updated = await this.prisma.cpepInventoryLot.update({
      where: { id: lot.id },
      data: {
        unitCost: newUnitCost,
        averageCost: newUnitCost,
        totalCost: lot.availableKg * newUnitCost,
      },
    });

    await this.prisma.cpepCostHistory.create({
      data: {
        organizationId,
        lotId: lot.id,
        ticketId: lot.ticketId,
        eventType: 'revaluation',
        previousUnitCost: lot.unitCost,
        newUnitCost,
        previousAverageCost: lot.averageCost,
        newAverageCost: newUnitCost,
        quantityKg: lot.availableKg,
        totalCost: lot.availableKg * newUnitCost,
        reason,
        recordedBy: userId,
      },
    });

    await this.audit.log(organizationId, 'InventoryLot', lotKey, 'revalued', userId, {
      previousUnitCost: lot.unitCost,
      newUnitCost,
      reason,
    });
    return updated;
  }

  private async writeKardex(
    organizationId: string,
    lotId: string,
    ticketId: string | null | undefined,
    movementKey: string,
    movementType: string,
    warehouse: string,
    delta: {
      entryKg: number;
      exitKg: number;
      balanceKg: number;
      unitCost: number;
      averageCost: number;
      totalCost: number;
      balanceCost: number;
    },
  ) {
    return this.prisma.cpepKardexEntry.create({
      data: {
        organizationId,
        lotId,
        ticketId: ticketId ?? undefined,
        movementKey,
        movementType,
        warehouse,
        entryKg: delta.entryKg,
        exitKg: delta.exitKg,
        balanceKg: delta.balanceKg,
        unitCost: delta.unitCost,
        averageCost: delta.averageCost,
        totalCost: delta.totalCost,
        balanceCost: delta.balanceCost,
      },
    });
  }

  private async writeTraceChain(
    organizationId: string,
    userId: string,
    lot: { id: string; lotKey: string; warehouse: string; ticketId: string | null },
    ticket: {
      id: string;
      ticketKey: string;
      producerId: string | null;
      producerName: string | null;
      farmId: string | null;
      farmName: string | null;
      lotId: string | null;
      lotCode: string | null;
      purchaseCenterId: string | null;
      grossWeightKg: number | null;
      tareWeightKg: number | null;
      netWeightKg: number | null;
      quality: {
        grade: string;
        decision: string | null;
        qualityScore: number | null;
        humidityPct: number | null;
        factor: number | null;
      } | null;
      settlement: { settlementKey: string; totalAmount: number } | null;
      weighings: Array<{ weighingType: string; weightKg: number }>;
    },
  ) {
    const events = [
      {
        stage: 'producer',
        eventType: 'producer_linked',
        title: 'Productor',
        description: ticket.producerName ?? undefined,
        payload: { producerId: ticket.producerId, producerName: ticket.producerName },
      },
      {
        stage: 'farm',
        eventType: 'farm_linked',
        title: 'Finca',
        description: ticket.farmName ?? undefined,
        payload: { farmId: ticket.farmId, farmName: ticket.farmName },
      },
      {
        stage: 'agricultural_lot',
        eventType: 'agricultural_lot_linked',
        title: 'Lote agrícola',
        description: ticket.lotCode ?? undefined,
        payload: { lotId: ticket.lotId, lotCode: ticket.lotCode },
      },
      {
        stage: 'purchase',
        eventType: 'purchase_ticket',
        title: 'Compra',
        description: ticket.ticketKey,
        payload: { ticketKey: ticket.ticketKey, purchaseCenterId: ticket.purchaseCenterId },
      },
      {
        stage: 'weighing',
        eventType: 'weighing_recorded',
        title: 'Pesaje',
        description: `Neto ${ticket.netWeightKg} kg`,
        payload: {
          grossWeightKg: ticket.grossWeightKg,
          tareWeightKg: ticket.tareWeightKg,
          netWeightKg: ticket.netWeightKg,
          weighings: ticket.weighings,
        },
      },
      {
        stage: 'quality',
        eventType: 'quality_recorded',
        title: 'Calidad',
        description: ticket.quality?.grade,
        payload: ticket.quality,
      },
      {
        stage: 'settlement',
        eventType: 'settlement_registered',
        title: 'Liquidación',
        description: ticket.settlement?.settlementKey,
        payload: ticket.settlement,
      },
      {
        stage: 'inventory',
        eventType: 'inventory_entry',
        title: 'Entrada a inventario',
        description: lot.lotKey,
        payload: { lotKey: lot.lotKey, warehouse: lot.warehouse },
      },
    ];

    for (const event of events) {
      await this.prisma.cpepTraceEvent.create({
        data: {
          organizationId,
          lotId: lot.id,
          ticketId: ticket.id,
          eventKey: `trace-${lot.lotKey}-${event.stage}`,
          stage: event.stage,
          eventType: event.eventType,
          title: event.title,
          description: event.description,
          actorId: userId,
          warehouse: lot.warehouse,
          payload: (event.payload ?? {}) as object,
        },
      });
    }
  }
}
