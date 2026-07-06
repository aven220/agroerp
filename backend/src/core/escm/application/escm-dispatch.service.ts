import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EimsMovementService } from '@/core/eims/application/eims-movement.service';
import { EimsReservationService } from '@/core/eims/application/eims-reservation.service';
import { EscmAuditService } from './escm-audit.service';
import { EscmOrderService } from './escm-order.service';
import { EscmPickingService } from './escm-picking.service';
import { EscmLogisticsDocumentService } from './escm-logistics-document.service';
import {
  canTransitionDispatch,
  computeLoadUsedKg,
  generateDispatchKey,
  resolveDispatchType,
  type EscmDispatchStatusValue,
} from '../domain/escm-logistics.engine';
import { canTransitionOrder } from '../domain/escm-order.engine';

type DispatchLineInput = {
  orderLineKey: string;
  quantity: number;
  lotKey?: string;
  serialKey?: string;
};

@Injectable()
export class EscmDispatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EscmAuditService,
    private readonly movements: EimsMovementService,
    private readonly reservations: EimsReservationService,
    private readonly orders: EscmOrderService,
    private readonly picking: EscmPickingService,
    private readonly documents: EscmLogisticsDocumentService,
  ) {}

  list(
    organizationId: string,
    filters?: { status?: string; orderKey?: string; customerKey?: string },
  ) {
    return this.prisma.escmDispatch.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.orderKey ? { orderKey: filters.orderKey } : {}),
        ...(filters?.customerKey ? { customerKey: filters.customerKey } : {}),
      },
      include: {
        _count: { select: { lines: true, deliveries: true } },
        carrier: true,
        vehicle: true,
        driver: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async getOne(organizationId: string, dispatchKey: string) {
    const row = await this.prisma.escmDispatch.findFirst({
      where: { organizationId, dispatchKey },
      include: {
        lines: true,
        order: { include: { customer: true, lines: true } },
        wave: true,
        route: { include: { stops: { orderBy: { sequence: 'asc' } } } },
        packings: { include: { lines: true } },
        deliveries: { include: { proofs: true, lines: true } },
        documents: true,
        incidents: { orderBy: { reportedAt: 'desc' } },
        carrier: true,
        vehicle: true,
        driver: true,
      },
    });
    if (!row) throw new NotFoundException(`Despacho ${dispatchKey} no encontrado`);
    return row;
  }

  async createFromOrder(
    organizationId: string,
    userId: string,
    orderKey: string,
    input?: {
      lines?: DispatchLineInput[];
      dispatchType?: string;
      waveKey?: string;
      scheduledAt?: string;
      notes?: string;
    },
  ) {
    const order = await this.orders.getOne(organizationId, orderKey);
    if (!['reserved', 'in_preparation', 'ready_for_dispatch', 'approved', 'partial'].includes(order.status)) {
      throw new BadRequestException(`Pedido ${orderKey} no está listo para despacho (${order.status})`);
    }

    const isPartial = Boolean(input?.lines?.length);
    const dispatchType = resolveDispatchType({
      dispatchType: input?.dispatchType,
      countryCode: order.countryCode,
      consolidationKey: order.consolidationKey,
      isPartial,
    });

    const lineInputs: DispatchLineInput[] = input?.lines?.length
      ? input.lines
      : order.lines
          .filter((l) => l.quantity - l.shippedQty > 0)
          .map((l) => ({
            orderLineKey: l.lineKey,
            quantity: l.quantity - l.shippedQty,
            lotKey: (l.metadata as { lotKey?: string })?.lotKey,
          }));

    if (!lineInputs.length) throw new BadRequestException('No hay líneas pendientes de despacho');

    for (const li of lineInputs) {
      const src = order.lines.find((l) => l.lineKey === li.orderLineKey);
      if (!src) throw new NotFoundException(`Línea ${li.orderLineKey} no encontrada`);
      const pending = src.quantity - src.shippedQty;
      if (li.quantity > pending) {
        throw new BadRequestException(`Cantidad excede pendiente en ${li.orderLineKey}`);
      }
    }

    const count = await this.prisma.escmDispatch.count({ where: { organizationId } });
    const dispatchKey = generateDispatchKey(count + 1);
    let waveId: string | undefined;
    if (input?.waveKey) {
      const wave = await this.prisma.escmPickWave.findFirst({
        where: { organizationId, waveKey: input.waveKey },
      });
      waveId = wave?.id;
    }

    const loadUsedKg = computeLoadUsedKg(
      lineInputs.map((l) => {
        const src = order.lines.find((x) => x.lineKey === l.orderLineKey)!;
        return { itemKey: src.itemKey, quantity: l.quantity };
      }),
    );

    const dispatch = await this.prisma.escmDispatch.create({
      data: {
        organizationId,
        dispatchKey,
        status: waveId ? 'picking' : 'draft',
        dispatchType,
        orderId: order.id,
        orderKey: order.orderKey,
        customerKey: order.customerKey,
        warehouseKey: order.warehouseKey,
        consolidationKey: order.consolidationKey,
        waveId,
        countryCode: order.countryCode,
        scheduledAt: input?.scheduledAt ? new Date(input.scheduledAt) : undefined,
        loadUsedKg,
        loadCapacityKg: loadUsedKg,
        notes: input?.notes,
        documentKey: `DOC-DSP-${dispatchKey}`,
        createdBy: userId,
        lines: {
          create: lineInputs.map((l, idx) => {
            const src = order.lines.find((x) => x.lineKey === l.orderLineKey)!;
            return {
              lineKey: `DL${idx + 1}`,
              orderLineKey: l.orderLineKey,
              itemKey: src.itemKey,
              quantity: l.quantity,
              lotKey: l.lotKey,
              serialKey: l.serialKey,
            };
          }),
        },
      },
      include: { lines: true },
    });

    if (waveId) {
      for (const line of dispatch.lines) {
        await this.prisma.escmPickTask.updateMany({
          where: { waveId, orderLineKey: line.orderLineKey },
          data: { dispatchId: dispatch.id },
        });
      }
    }

    if (canTransitionOrder(order.status, 'in_preparation')) {
      await this.orders.transitionStatus(organizationId, userId, orderKey, 'in_preparation', 'Despacho creado');
    }
    await this.audit.log(organizationId, 'Dispatch', dispatchKey, 'created', userId, {
      orderKey,
      dispatchType,
      lineCount: dispatch.lines.length,
    });
    await this.core.emitUserAction(organizationId, 'EscmDispatch', dispatch.id, EVENT_TYPES.ESCM_DISPATCH_CREATED, {
      dispatchKey,
      orderKey,
    });

    return dispatch;
  }

  async consolidate(
    organizationId: string,
    userId: string,
    orderKeys: string[],
    input?: { scheduledAt?: string; notes?: string },
  ) {
    if (orderKeys.length < 2) throw new BadRequestException('Se requieren al menos 2 pedidos');
    const orders = await Promise.all(orderKeys.map((k) => this.orders.getOne(organizationId, k)));
    const customerKey = orders[0].customerKey;
    if (!orders.every((o) => o.customerKey === customerKey)) {
      throw new BadRequestException('Todos los pedidos deben ser del mismo cliente');
    }

    const consolidationKey = orders[0].consolidationKey ?? `CONS-${Date.now()}`;
    const dispatches = [];
    for (const orderKey of orderKeys) {
      const d = await this.createFromOrder(organizationId, userId, orderKey, {
        dispatchType: 'consolidated',
        scheduledAt: input?.scheduledAt,
        notes: input?.notes,
      });
      await this.prisma.escmDispatch.update({
        where: { id: d.id },
        data: { consolidationKey },
      });
      dispatches.push(d);
    }
    return dispatches;
  }

  async startPicking(organizationId: string, userId: string, dispatchKey: string) {
    const dispatch = await this.getOne(organizationId, dispatchKey);
    if (!canTransitionDispatch(dispatch.status, 'picking')) {
      throw new BadRequestException('Transición inválida a picking');
    }
    const updated = await this.transition(organizationId, userId, dispatchKey, 'picking');
    if (!dispatch.waveId) {
      await this.picking.createPacking(organizationId, userId, dispatchKey);
    }
    return updated;
  }

  async ship(
    organizationId: string,
    userId: string,
    dispatchKey: string,
    input?: { warehouseKey?: string },
  ) {
    const dispatch = await this.getOne(organizationId, dispatchKey);
    if (!['ready', 'scheduled', 'packing'].includes(dispatch.status)) {
      throw new BadRequestException('El despacho debe estar listo para salir');
    }

    const warehouseKey = input?.warehouseKey ?? dispatch.warehouseKey ?? 'WH-MAIN';
    const movementKeys: string[] = [];

    for (const line of dispatch.lines) {
      const qty = line.packedQty || line.pickedQty || line.quantity;
      try {
        const movement = await this.movements.post(organizationId, userId, {
          movementType: 'exit',
          itemKey: line.itemKey,
          quantity: qty,
          fromWarehouseKey: warehouseKey,
          lotKey: line.lotKey ?? undefined,
          reason: `Despacho ${dispatchKey}`,
          documentKey: dispatchKey,
          documentType: 'sales_dispatch',
          source: 'escm_dispatch',
          sourceRef: dispatch.orderKey,
        });
        movementKeys.push(movement.movementKey);
      } catch (err) {
        throw new BadRequestException(
          `Error de salida inventario ${line.itemKey}: ${err instanceof Error ? err.message : 'Error'}`,
        );
      }

      const orderLine = dispatch.order.lines.find((l) => l.lineKey === line.orderLineKey);
      if (orderLine?.reservationKey) {
        try {
          await this.reservations.release(organizationId, userId, orderLine.reservationKey, {
            quantity: Math.min(qty, orderLine.reservedQty),
            reason: `Despacho ${dispatchKey}`,
          });
        } catch {
          // reserva ya consumida
        }
      }

      await this.prisma.escmDispatchLine.update({
        where: { id: line.id },
        data: { shippedQty: qty },
      });

      await this.prisma.escmSalesOrderLine.updateMany({
        where: { orderId: dispatch.orderId, lineKey: line.orderLineKey },
        data: { shippedQty: { increment: qty } },
      });
    }

    const refreshedLines = await this.prisma.escmSalesOrderLine.findMany({
      where: { orderId: dispatch.orderId },
    });
    const allShipped = refreshedLines.every((l) => l.shippedQty >= l.quantity);

    const dispatchStatus: EscmDispatchStatusValue = allShipped ? 'in_transit' : 'partial';
    const updated = await this.prisma.escmDispatch.update({
      where: { id: dispatch.id },
      data: {
        status: dispatchStatus,
        dispatchedAt: new Date(),
        updatedBy: userId,
        metadata: { movementKeys },
      },
    });

    await this.orders.transitionStatus(
      organizationId,
      userId,
      dispatch.orderKey,
      allShipped ? 'dispatched' : 'in_preparation',
      `Despacho ${dispatchKey}`,
    );

    await this.documents.generateDispatchNote(organizationId, userId, dispatchKey);
    await this.audit.log(organizationId, 'Dispatch', dispatchKey, 'shipped', userId, { movementKeys });
    await this.core.emitUserAction(organizationId, 'EscmDispatch', dispatch.id, EVENT_TYPES.ESCM_ORDER_DISPATCHED, {
      dispatchKey,
      orderKey: dispatch.orderKey,
    });
    return updated;
  }

  async cancel(organizationId: string, userId: string, dispatchKey: string, reason?: string) {
    const dispatch = await this.getOne(organizationId, dispatchKey);
    if (['delivered', 'cancelled'].includes(dispatch.status)) {
      throw new BadRequestException('Despacho no cancelable');
    }
    const updated = await this.prisma.escmDispatch.update({
      where: { id: dispatch.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: reason,
        updatedBy: userId,
      },
    });
    await this.audit.log(organizationId, 'Dispatch', dispatchKey, 'cancelled', userId, { reason });
    await this.core.emitUserAction(organizationId, 'EscmDispatch', dispatch.id, EVENT_TYPES.ESCM_DISPATCH_CANCELLED, {
      dispatchKey,
      reason,
    });
    return updated;
  }

  async reschedule(
    organizationId: string,
    userId: string,
    dispatchKey: string,
    input: { scheduledAt: string; reason?: string },
  ) {
    const original = await this.getOne(organizationId, dispatchKey);
    await this.prisma.escmDispatch.update({
      where: { id: original.id },
      data: { status: 'rescheduled', updatedBy: userId },
    });

    const newDispatch = await this.createFromOrder(organizationId, userId, original.orderKey, {
      lines: original.lines.map((l) => ({
        orderLineKey: l.orderLineKey,
        quantity: l.quantity - l.shippedQty,
        lotKey: l.lotKey ?? undefined,
        serialKey: l.serialKey ?? undefined,
      })),
      scheduledAt: input.scheduledAt,
      notes: input.reason ?? original.notes ?? undefined,
    });

    await this.prisma.escmDispatch.update({
      where: { id: newDispatch.id },
      data: { rescheduledFromId: original.id, status: 'scheduled', scheduledAt: new Date(input.scheduledAt) },
    });

    await this.audit.log(organizationId, 'Dispatch', dispatchKey, 'rescheduled', userId, {
      newDispatchKey: newDispatch.dispatchKey,
      scheduledAt: input.scheduledAt,
    });
    return this.getOne(organizationId, newDispatch.dispatchKey);
  }

  async transition(
    organizationId: string,
    userId: string,
    dispatchKey: string,
    toStatus: EscmDispatchStatusValue,
    reason?: string,
  ) {
    const dispatch = await this.getOne(organizationId, dispatchKey);
    if (!canTransitionDispatch(dispatch.status, toStatus)) {
      throw new BadRequestException(`Transición inválida: ${dispatch.status} → ${toStatus}`);
    }
    const updated = await this.prisma.escmDispatch.update({
      where: { id: dispatch.id },
      data: { status: toStatus, updatedBy: userId },
    });
    await this.audit.log(organizationId, 'Dispatch', dispatchKey, 'status_changed', userId, { toStatus, reason });
    await this.core.emitUserAction(organizationId, 'EscmDispatch', dispatch.id, EVENT_TYPES.ESCM_DISPATCH_STATUS_CHANGED, {
      dispatchKey,
      toStatus,
    });
    return updated;
  }

  async tracking(organizationId: string, dispatchKey: string) {
    const dispatch = await this.getOne(organizationId, dispatchKey);
    return {
      dispatch,
      vehicleLocation: dispatch.route
        ? { lat: dispatch.route.currentLat, lng: dispatch.route.currentLng }
        : null,
      eta: dispatch.scheduledAt,
      incidents: dispatch.incidents,
    };
  }
}
