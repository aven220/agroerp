import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EimsReservationService } from '@/core/eims/application/eims-reservation.service';
import { EscmAuditService } from './escm-audit.service';
import { compareOrderPriority } from '../domain/escm-order.engine';

@Injectable()
export class EscmOrderReservationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reservations: EimsReservationService,
    private readonly audit: EscmAuditService,
    private readonly core: CoreEngineService,
  ) {}

  async listAll(organizationId: string) {
    return this.reservations.list(organizationId);
  }

  async listByOrder(organizationId: string, orderKey: string) {
    return this.reservations.list(organizationId, { documentKey: orderKey });
  }

  async listByCustomer(organizationId: string, customerKey: string) {
    return this.reservations.list(organizationId, { customerKey });
  }

  async reserveOrder(
    organizationId: string,
    userId: string,
    orderKey: string,
    input?: { warehouseKey?: string; forcePartial?: boolean },
  ) {
    const order = await this.prisma.escmSalesOrder.findFirst({
      where: { organizationId, orderKey },
      include: { lines: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!order) throw new NotFoundException(`Pedido ${orderKey} no encontrado`);
    const warehouseKey = input?.warehouseKey ?? order.warehouseKey ?? 'WH-MAIN';
    const results: Array<{ lineKey: string; reservationKey?: string; error?: string }> = [];

    for (const line of order.lines) {
      const pending = line.quantity - line.reservedQty;
      if (pending <= 0) continue;
      try {
        const reservation = await this.reservations.create(organizationId, userId, {
          reservationType: 'sales_order',
          itemKey: line.itemKey,
          warehouseKey,
          quantity: pending,
          customerKey: order.customerKey,
          documentKey: orderKey,
          documentType: 'sales_order',
          reason: `Reserva pedido ${orderKey}`,
        });
        await this.prisma.escmSalesOrderLine.update({
          where: { id: line.id },
          data: {
            reservationKey: reservation.reservationKey,
            reservedQty: { increment: pending },
          },
        });
        results.push({ lineKey: line.lineKey, reservationKey: reservation.reservationKey });
        await this.audit.log(organizationId, 'SalesOrder', orderKey, 'reservation_created', userId, {
          lineKey: line.lineKey,
          reservationKey: reservation.reservationKey,
          quantity: pending,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error de reserva';
        results.push({ lineKey: line.lineKey, error: message });
        if (!input?.forcePartial) {
          throw new BadRequestException(`No se pudo reservar línea ${line.lineKey}: ${message}`);
        }
      }
    }

    const allReserved = order.lines.every((l) => {
      const updated = results.find((r) => r.lineKey === l.lineKey);
      if (updated?.error) return false;
      return l.reservedQty + (updated ? l.quantity - l.reservedQty : 0) >= l.quantity || l.reservedQty >= l.quantity;
    });

    if (results.some((r) => r.reservationKey)) {
      await this.prisma.escmSalesOrder.update({
        where: { id: order.id },
        data: {
          status: allReserved ? 'reserved' : order.status,
          reservedAt: new Date(),
          warehouseKey,
          updatedBy: userId,
        },
      });
      await this.core.emitUserAction(organizationId, 'EscmSalesOrder', order.id, EVENT_TYPES.ESCM_ORDER_RESERVED, {
        orderKey,
        results,
      });
    }

    return { orderKey, results, allReserved };
  }

  async releaseLine(
    organizationId: string,
    userId: string,
    orderKey: string,
    lineKey: string,
    input?: { quantity?: number; reason?: string },
  ) {
    const line = await this.prisma.escmSalesOrderLine.findFirst({
      where: { order: { organizationId, orderKey }, lineKey },
    });
    if (!line?.reservationKey) throw new NotFoundException('Línea sin reserva activa');
    const qty = input?.quantity ?? line.reservedQty;
    await this.reservations.release(organizationId, userId, line.reservationKey, {
      quantity: qty,
      reason: input?.reason ?? `Liberación pedido ${orderKey}`,
    });
    await this.prisma.escmSalesOrderLine.update({
      where: { id: line.id },
      data: { reservedQty: { decrement: qty } },
    });
    await this.audit.log(organizationId, 'SalesOrder', orderKey, 'reservation_released', userId, {
      lineKey,
      quantity: qty,
    });
    return { released: qty, lineKey };
  }

  async transferReservation(
    organizationId: string,
    userId: string,
    fromOrderKey: string,
    toOrderKey: string,
    lineKey: string,
    input?: { quantity?: number; reason?: string },
  ) {
    const line = await this.prisma.escmSalesOrderLine.findFirst({
      where: { order: { organizationId, orderKey: fromOrderKey }, lineKey },
    });
    if (!line?.reservationKey) throw new NotFoundException('Reserva origen no encontrada');
    const qty = input?.quantity ?? line.reservedQty;
    const newReservation = await this.reservations.reassign(organizationId, userId, line.reservationKey, {
      quantity: qty,
      documentKey: toOrderKey,
      reason: input?.reason ?? `Transferencia ${fromOrderKey} → ${toOrderKey}`,
    });
    await this.prisma.escmSalesOrderLine.update({
      where: { id: line.id },
      data: { reservedQty: { decrement: qty } },
    });
    const targetLine = await this.prisma.escmSalesOrderLine.findFirst({
      where: { order: { organizationId, orderKey: toOrderKey }, itemKey: line.itemKey },
    });
    if (targetLine) {
      await this.prisma.escmSalesOrderLine.update({
        where: { id: targetLine.id },
        data: {
          reservationKey: newReservation.reservationKey,
          reservedQty: { increment: qty },
        },
      });
    }
    await this.audit.log(organizationId, 'SalesOrder', fromOrderKey, 'reservation_transferred', userId, {
      toOrderKey,
      lineKey,
      quantity: qty,
      newReservationKey: newReservation.reservationKey,
    });
    return { from: line.reservationKey, to: newReservation.reservationKey, quantity: qty };
  }

  async prioritize(organizationId: string, userId: string, orderKeys: string[]) {
    const orders = await this.prisma.escmSalesOrder.findMany({
      where: { organizationId, orderKey: { in: orderKeys } },
    });
    const sorted = [...orders].sort((a, b) =>
      compareOrderPriority(
        { priority: a.priority, createdAt: a.createdAt },
        { priority: b.priority, createdAt: b.createdAt },
      ),
    );
    let priority = sorted.length * 10;
    for (const order of sorted) {
      await this.prisma.escmSalesOrder.update({
        where: { id: order.id },
        data: { priority, updatedBy: userId },
      });
      priority -= 10;
    }
    await this.audit.log(organizationId, 'SalesOrder', 'batch', 'priority_updated', userId, { orderKeys });
    return sorted.map((o) => o.orderKey);
  }

  async resolveConflicts(organizationId: string, userId: string, itemKey: string, warehouseKey: string) {
    const activeReservations = await this.prisma.eimsReservation.findMany({
      where: {
        organizationId,
        itemKey,
        warehouseKey,
        status: { in: ['active', 'partial'] },
        documentType: 'sales_order',
      },
      orderBy: { createdAt: 'asc' },
    });
    const orders = await this.prisma.escmSalesOrder.findMany({
      where: {
        organizationId,
        orderKey: { in: activeReservations.map((r) => r.documentKey).filter(Boolean) as string[] },
      },
    });
    const orderPriority = new Map(orders.map((o) => [o.orderKey, o.priority]));
    const ranked = [...activeReservations].sort((a, b) => {
      const pa = orderPriority.get(a.documentKey ?? '') ?? 0;
      const pb = orderPriority.get(b.documentKey ?? '') ?? 0;
      return pb - pa;
    });
    await this.audit.log(organizationId, 'Reservation', itemKey, 'conflict_resolved', userId, {
      warehouseKey,
      ranked: ranked.map((r) => r.reservationKey),
    });
    return { itemKey, warehouseKey, ranked: ranked.map((r) => r.reservationKey) };
  }
}
