import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EimsAuditService } from './eims-audit.service';
import { EimsMovementService } from './eims-movement.service';
import {
  computeAvailableQty,
  generateReservationKey,
  type EimsReservationTypeValue,
} from '../domain/eims-planning.engine';

@Injectable()
export class EimsReservationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EimsAuditService,
    private readonly movements: EimsMovementService,
  ) {}

  list(
    organizationId: string,
    filters?: {
      status?: string;
      reservationType?: string;
      itemKey?: string;
      warehouseKey?: string;
      customerKey?: string;
      projectKey?: string;
      documentKey?: string;
    },
  ) {
    return this.prisma.eimsReservation.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.reservationType ? { reservationType: filters.reservationType as never } : {}),
        ...(filters?.itemKey ? { itemKey: filters.itemKey } : {}),
        ...(filters?.warehouseKey ? { warehouseKey: filters.warehouseKey } : {}),
        ...(filters?.customerKey ? { customerKey: filters.customerKey } : {}),
        ...(filters?.projectKey ? { projectKey: filters.projectKey } : {}),
        ...(filters?.documentKey ? { documentKey: filters.documentKey } : {}),
      },
      include: {
        item: { select: { name: true, uomKey: true } },
        warehouse: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async getOne(organizationId: string, reservationKey: string) {
    const row = await this.prisma.eimsReservation.findFirst({
      where: { organizationId, reservationKey },
      include: { item: true, warehouse: true, location: true, stockLot: true },
    });
    if (!row) throw new NotFoundException(`Reserva ${reservationKey} no encontrada`);
    return row;
  }

  async create(
    organizationId: string,
    userId: string,
    input: {
      reservationType: EimsReservationTypeValue;
      itemKey: string;
      warehouseKey: string;
      locationKey?: string;
      lotKey?: string;
      quantity: number;
      customerKey?: string;
      projectKey?: string;
      documentKey?: string;
      documentType?: string;
      sourceRef?: string;
      expiresAt?: string;
      reason?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    if (input.quantity <= 0) throw new BadRequestException('Cantidad inválida');
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
      const loc = await this.prisma.eimsLocation.findFirst({
        where: { organizationId, warehouseId: warehouse.id, locationKey: input.locationKey },
      });
      if (!loc) throw new NotFoundException(`Ubicación ${input.locationKey} no encontrada`);
      locationId = loc.id;
    }

    let stockLotId: string | undefined;
    if (input.lotKey) {
      const lot = await this.prisma.eimsStockLot.findFirst({
        where: { organizationId, itemId: item.id, lotKey: input.lotKey },
      });
      if (!lot) throw new NotFoundException(`Lote ${input.lotKey} no encontrado`);
      stockLotId = lot.id;
    }

    const balance = await this.prisma.eimsStockBalance.findFirst({
      where: { organizationId, itemId: item.id, warehouseId: warehouse.id },
    });
    const available = computeAvailableQty({
      onHandQty: balance?.onHandQty ?? 0,
      reservedQty: balance?.reservedQty ?? 0,
      availableQty: balance?.availableQty ?? 0,
    });
    if (available < input.quantity && !item.allowNegative) {
      throw new BadRequestException(
        `Disponible insuficiente (${available} < ${input.quantity}) para reservar`,
      );
    }

    const count = await this.prisma.eimsReservation.count({ where: { organizationId } });
    const reservationKey = generateReservationKey(input.reservationType, count + 1);

    const movement = await this.movements.post(organizationId, userId, {
      movementType: 'reservation',
      itemKey: input.itemKey,
      quantity: input.quantity,
      fromWarehouseKey: input.warehouseKey,
      fromLocationKey: input.locationKey,
      lotKey: input.lotKey,
      reason: input.reason ?? `Reserva ${input.reservationType}`,
      documentKey: input.documentKey,
      documentType: input.documentType ?? 'reservation',
      source: 'reservation',
      sourceRef: reservationKey,
      metadata: input.metadata,
    });

    const reservation = await this.prisma.eimsReservation.create({
      data: {
        organizationId,
        reservationKey,
        reservationType: input.reservationType,
        status: 'active',
        itemId: item.id,
        itemKey: input.itemKey,
        warehouseId: warehouse.id,
        warehouseKey: input.warehouseKey,
        locationId,
        locationKey: input.locationKey,
        stockLotId,
        lotKey: input.lotKey,
        quantity: input.quantity,
        customerKey: input.customerKey,
        projectKey: input.projectKey,
        documentKey: input.documentKey,
        documentType: input.documentType,
        sourceRef: input.sourceRef,
        movementKey: movement.movementKey,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        reservedBy: userId,
        reason: input.reason,
        metadata: (input.metadata ?? {}) as object,
      },
      include: { item: true, warehouse: true },
    });

    await this.audit.log(organizationId, 'Reservation', reservationKey, 'created', userId, {
      reservationType: input.reservationType,
      quantity: input.quantity,
      movementKey: movement.movementKey,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsReservation',
      reservation.id,
      EVENT_TYPES.EIMS_RESERVATION_CREATED,
      { reservationKey, reservationType: input.reservationType, quantity: input.quantity },
    );
    return reservation;
  }

  async release(
    organizationId: string,
    userId: string,
    reservationKey: string,
    input?: { quantity?: number; reason?: string },
  ) {
    const reservation = await this.getOne(organizationId, reservationKey);
    if (!['active', 'partial'].includes(reservation.status)) {
      throw new BadRequestException(`Reserva ${reservationKey} no está activa`);
    }
    const remaining = reservation.quantity - reservation.releasedQty;
    const qty = input?.quantity ?? remaining;
    if (qty <= 0 || qty > remaining) {
      throw new BadRequestException('Cantidad de liberación inválida');
    }

    const movement = await this.movements.post(organizationId, userId, {
      movementType: 'release',
      itemKey: reservation.itemKey,
      quantity: qty,
      fromWarehouseKey: reservation.warehouseKey,
      fromLocationKey: reservation.locationKey ?? undefined,
      lotKey: reservation.lotKey ?? undefined,
      reason: input?.reason ?? `Liberación reserva ${reservationKey}`,
      documentKey: reservation.documentKey ?? undefined,
      documentType: 'reservation_release',
      source: 'reservation',
      sourceRef: reservationKey,
    });

    const newReleased = reservation.releasedQty + qty;
    const status = newReleased >= reservation.quantity ? 'released' : 'partial';
    const updated = await this.prisma.eimsReservation.update({
      where: { id: reservation.id },
      data: {
        releasedQty: newReleased,
        status,
        releaseMovementKey: movement.movementKey,
        releasedAt: status === 'released' ? new Date() : reservation.releasedAt,
        releasedBy: status === 'released' ? userId : reservation.releasedBy,
      },
    });

    await this.audit.log(organizationId, 'Reservation', reservationKey, 'released', userId, {
      quantity: qty,
      movementKey: movement.movementKey,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsReservation',
      reservation.id,
      EVENT_TYPES.EIMS_RESERVATION_RELEASED,
      { reservationKey, quantity: qty },
    );
    return updated;
  }

  async reassign(
    organizationId: string,
    userId: string,
    reservationKey: string,
    input: {
      quantity?: number;
      customerKey?: string;
      projectKey?: string;
      documentKey?: string;
      reason?: string;
    },
  ) {
    const reservation = await this.getOne(organizationId, reservationKey);
    const remaining = reservation.quantity - reservation.releasedQty;
    const qty = input.quantity ?? remaining;
    await this.release(organizationId, userId, reservationKey, {
      quantity: qty,
      reason: input.reason ?? 'Liberación por reasignación',
    });

    const newReservation = await this.create(organizationId, userId, {
      reservationType: reservation.reservationType as EimsReservationTypeValue,
      itemKey: reservation.itemKey,
      warehouseKey: reservation.warehouseKey,
      locationKey: reservation.locationKey ?? undefined,
      lotKey: reservation.lotKey ?? undefined,
      quantity: qty,
      customerKey: input.customerKey ?? reservation.customerKey ?? undefined,
      projectKey: input.projectKey ?? reservation.projectKey ?? undefined,
      documentKey: input.documentKey ?? reservation.documentKey ?? undefined,
      documentType: reservation.documentType ?? undefined,
      sourceRef: reservationKey,
      reason: input.reason ?? `Reasignación desde ${reservationKey}`,
    });

    await this.prisma.eimsReservation.update({
      where: { id: newReservation.id },
      data: { reassignedFromId: reservation.id, status: 'active' },
    });
    await this.prisma.eimsReservation.update({
      where: { id: reservation.id },
      data: { status: 'reassigned' },
    });

    await this.audit.log(organizationId, 'Reservation', reservationKey, 'reassigned', userId, {
      newReservationKey: newReservation.reservationKey,
      quantity: qty,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsReservation',
      newReservation.id,
      EVENT_TYPES.EIMS_RESERVATION_REASSIGNED,
      { from: reservationKey, to: newReservation.reservationKey },
    );
    return newReservation;
  }

  async expireAutomatic(organizationId: string, userId: string) {
    const expired = await this.prisma.eimsReservation.findMany({
      where: {
        organizationId,
        status: { in: ['active', 'partial'] },
        expiresAt: { lt: new Date() },
      },
    });
    const results = [];
    for (const r of expired) {
      const remaining = r.quantity - r.releasedQty;
      if (remaining > 0) {
        await this.release(organizationId, userId, r.reservationKey, {
          quantity: remaining,
          reason: 'Liberación automática por vencimiento',
        });
      }
      await this.prisma.eimsReservation.update({
        where: { id: r.id },
        data: { status: 'expired' },
      });
      results.push(r.reservationKey);
    }
    return { expired: results.length, keys: results };
  }
}
