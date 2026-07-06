import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EscmAuditService } from './escm-audit.service';
import { EscmQuotationService } from './escm-quotation.service';
import { EscmOrderValidationService } from './escm-order-validation.service';
import { EscmOrderApprovalService } from './escm-order-approval.service';
import { EscmOrderReservationService } from './escm-order-reservation.service';
import {
  canTransitionOrder,
  computeOrderTotals,
  generateConsolidationKey,
  generateRecurrenceKey,
  isEditableOrderStatus,
  normalizeOrderStatus,
  resolveOrderType,
  type EscmOrderStatusValue,
  type EscmOrderTypeValue,
} from '../domain/escm-order.engine';
import { canConvertQuotation, generateOrderKey } from '../domain/escm-quotation.engine';
import { computeLineTotals } from '../domain/escm-quotation.engine';

type OrderLineInput = {
  itemKey: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountPct?: number;
  taxKey?: string;
  taxRate?: number;
};

@Injectable()
export class EscmOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EscmAuditService,
    private readonly quotations: EscmQuotationService,
    private readonly validation: EscmOrderValidationService,
    private readonly approvals: EscmOrderApprovalService,
    private readonly orderReservations: EscmOrderReservationService,
  ) {}

  list(
    organizationId: string,
    filters?: {
      status?: string;
      customerKey?: string;
      orderType?: string;
      consolidationKey?: string;
      from?: string;
      to?: string;
    },
  ) {
    return this.prisma.escmSalesOrder.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.customerKey ? { customerKey: filters.customerKey } : {}),
        ...(filters?.orderType ? { orderType: filters.orderType as never } : {}),
        ...(filters?.consolidationKey ? { consolidationKey: filters.consolidationKey } : {}),
        ...(filters?.from || filters?.to
          ? {
              createdAt: {
                ...(filters.from ? { gte: new Date(filters.from) } : {}),
                ...(filters.to ? { lte: new Date(filters.to) } : {}),
              },
            }
          : {}),
      },
      include: { _count: { select: { lines: true, approvals: true } }, customer: { select: { legalName: true } } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });
  }

  async getOne(organizationId: string, orderKey: string) {
    const row = await this.prisma.escmSalesOrder.findFirst({
      where: { organizationId, orderKey },
      include: {
        lines: { orderBy: { sortOrder: 'asc' } },
        quotation: true,
        customer: true,
        approvals: { orderBy: { level: 'asc' } },
        statusLogs: { orderBy: { createdAt: 'desc' }, take: 50 },
        childOrders: { select: { orderKey: true, status: true, totalAmount: true } },
      },
    });
    if (!row) throw new NotFoundException(`Pedido ${orderKey} no encontrado`);
    return row;
  }

  async orderCenter(organizationId: string) {
    const statuses = [
      'draft',
      'pending_approval',
      'approved',
      'reserved',
      'in_preparation',
      'ready_for_dispatch',
      'dispatched',
    ] as const;
    const counts = await Promise.all(
      statuses.map((s) =>
        this.prisma.escmSalesOrder.count({ where: { organizationId, status: s } }),
      ),
    );
    const [pendingApprovals, recent, totalAmount] = await Promise.all([
      this.prisma.escmOrderApproval.count({ where: { organizationId, status: 'pending' } }),
      this.prisma.escmSalesOrder.findMany({
        where: { organizationId },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: { customer: { select: { legalName: true } } },
      }),
      this.prisma.escmSalesOrder.aggregate({
        where: { organizationId, status: { notIn: ['cancelled', 'rejected'] } },
        _sum: { totalAmount: true },
      }),
    ]);
    return {
      byStatus: Object.fromEntries(statuses.map((s, i) => [s, counts[i]])),
      pendingApprovals,
      recentOrders: recent,
      pipelineValue: totalAmount._sum.totalAmount ?? 0,
    };
  }

  async tracking(organizationId: string, orderKey: string) {
    const order = await this.getOne(organizationId, orderKey);
    const reservations = await this.orderReservations.listByOrder(organizationId, orderKey);
    return {
      order,
      reservations,
      timeline: order.statusLogs,
      currentStatus: normalizeOrderStatus(order.status),
    };
  }

  async create(
    organizationId: string,
    userId: string,
    input: {
      customerKey: string;
      lines: OrderLineInput[];
      orderType?: EscmOrderTypeValue;
      warehouseKey?: string;
      paymentTermKey?: string;
      countryCode?: string;
      incotermKey?: string;
      deliveryMethodKey?: string;
      scheduledAt?: string;
      recurrenceKey?: string;
      parentOrderKey?: string;
      consolidationKey?: string;
      priority?: number;
      notes?: string;
      currencyKey?: string;
      metadata?: Record<string, unknown>;
      submit?: boolean;
    },
  ) {
    const customer = await this.prisma.escmCustomer.findFirst({
      where: { organizationId, customerKey: input.customerKey, deletedAt: null },
    });
    if (!customer) throw new NotFoundException(`Cliente ${input.customerKey} no encontrado`);

    let parentOrderId: string | undefined;
    if (input.parentOrderKey) {
      const parent = await this.prisma.escmSalesOrder.findFirst({
        where: { organizationId, orderKey: input.parentOrderKey },
      });
      if (!parent) throw new NotFoundException(`Pedido padre ${input.parentOrderKey} no encontrado`);
      parentOrderId = parent.id;
    }

    const linePayloads = input.lines.map((line, idx) => {
      const totals = computeLineTotals(line);
      return {
        lineKey: `L${idx + 1}`,
        itemKey: line.itemKey,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountPct: line.discountPct ?? 0,
        taxKey: line.taxKey,
        taxRate: line.taxRate,
        taxAmount: totals.taxAmount,
        lineSubtotal: totals.lineSubtotal,
        lineTotal: totals.lineTotal,
        sortOrder: idx,
      };
    });
    const headerTotals = computeOrderTotals(input.lines);

    const count = await this.prisma.escmSalesOrder.count({ where: { organizationId } });
    const orderKey = generateOrderKey(count + 1);
    const orderType = resolveOrderType({
      orderType: input.orderType,
      countryCode: input.countryCode,
      scheduledAt: input.scheduledAt,
      recurrenceKey: input.recurrenceKey,
      parentOrderId,
      consolidationKey: input.consolidationKey,
    });

    const order = await this.prisma.escmSalesOrder.create({
      data: {
        organizationId,
        orderKey,
        status: 'draft',
        orderType,
        priority: input.priority ?? 50,
        customerId: customer.id,
        customerKey: customer.customerKey,
        parentOrderId,
        consolidationKey: input.consolidationKey,
        recurrenceKey: input.recurrenceKey,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
        countryCode: input.countryCode,
        incotermKey: input.incotermKey,
        deliveryMethodKey: input.deliveryMethodKey,
        currencyKey: input.currencyKey ?? 'COP',
        subtotal: headerTotals.subtotal,
        discountAmount: headerTotals.discountAmount,
        taxAmount: headerTotals.taxAmount,
        totalAmount: headerTotals.totalAmount,
        warehouseKey: input.warehouseKey ?? 'WH-MAIN',
        paymentTermKey: input.paymentTermKey,
        documentKey: `DOC-${orderKey}`,
        notes: input.notes,
        metadata: (input.metadata ?? {}) as object,
        createdBy: userId,
        lines: { create: linePayloads },
      },
      include: { lines: true },
    });

    await this.logStatus(organizationId, order.id, orderKey, null, 'draft', userId, 'Creación manual');
    await this.audit.log(organizationId, 'SalesOrder', orderKey, 'created', userId, {
      orderType,
      customerKey: input.customerKey,
    });
    await this.core.emitUserAction(organizationId, 'EscmSalesOrder', order.id, EVENT_TYPES.ESCM_ORDER_CREATED, {
      orderKey,
      orderType,
    });

    if (input.submit) {
      return this.submit(organizationId, userId, orderKey);
    }
    return order;
  }

  async update(
    organizationId: string,
    userId: string,
    orderKey: string,
    input: Partial<{
      lines: OrderLineInput[];
      warehouseKey: string;
      paymentTermKey: string;
      scheduledAt: string;
      priority: number;
      notes: string;
      metadata: Record<string, unknown>;
    }>,
  ) {
    const order = await this.getOne(organizationId, orderKey);
    if (!isEditableOrderStatus(order.status)) {
      throw new BadRequestException('El pedido no es editable en su estado actual');
    }

    if (input.lines?.length) {
      await this.prisma.escmSalesOrderLine.deleteMany({ where: { orderId: order.id } });
      const linePayloads = input.lines.map((line, idx) => {
        const totals = computeLineTotals(line);
        return {
          orderId: order.id,
          lineKey: `L${idx + 1}`,
          itemKey: line.itemKey,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountPct: line.discountPct ?? 0,
          taxKey: line.taxKey,
          taxRate: line.taxRate,
          taxAmount: totals.taxAmount,
          lineSubtotal: totals.lineSubtotal,
          lineTotal: totals.lineTotal,
          sortOrder: idx,
        };
      });
      await this.prisma.escmSalesOrderLine.createMany({ data: linePayloads });
    }

    const headerTotals = input.lines ? computeOrderTotals(input.lines) : null;
    const updated = await this.prisma.escmSalesOrder.update({
      where: { id: order.id },
      data: {
        ...(input.warehouseKey ? { warehouseKey: input.warehouseKey } : {}),
        ...(input.paymentTermKey ? { paymentTermKey: input.paymentTermKey } : {}),
        ...(input.scheduledAt ? { scheduledAt: new Date(input.scheduledAt) } : {}),
        ...(input.priority != null ? { priority: input.priority } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.metadata ? { metadata: input.metadata as object } : {}),
        ...(headerTotals
          ? {
              subtotal: headerTotals.subtotal,
              discountAmount: headerTotals.discountAmount,
              taxAmount: headerTotals.taxAmount,
              totalAmount: headerTotals.totalAmount,
            }
          : {}),
        updatedBy: userId,
      },
      include: { lines: { orderBy: { sortOrder: 'asc' } } },
    });

    await this.audit.log(organizationId, 'SalesOrder', orderKey, 'updated', userId, input);
    return updated;
  }

  async validateOrder(organizationId: string, orderKey: string, userId: string) {
    const order = await this.getOne(organizationId, orderKey);
    const result = await this.validation.validate(organizationId, {
      customerKey: order.customerKey,
      warehouseKey: order.warehouseKey ?? undefined,
      lines: order.lines.map((l) => ({
        itemKey: l.itemKey,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountPct: l.discountPct,
      })),
      userCanCreateOrder: true,
    });
    await this.prisma.escmSalesOrder.update({
      where: { id: order.id },
      data: { validationResult: result as object, updatedBy: userId },
    });
    return result;
  }

  async submit(organizationId: string, userId: string, orderKey: string) {
    const order = await this.getOne(organizationId, orderKey);
    if (order.status !== 'draft' && order.status !== 'rejected') {
      throw new BadRequestException('Solo pedidos en borrador o rechazados pueden enviarse');
    }

    const validation = await this.validateOrder(organizationId, orderKey, userId);
    if (validation.hasErrors) {
      throw new BadRequestException({
        message: 'Validación comercial fallida',
        checks: validation.checks.filter((c) => !c.passed),
      });
    }

    const approvalReq = await this.approvals.evaluateForOrder(organizationId, {
      totalAmount: order.totalAmount,
      discountAmount: order.discountAmount,
      subtotal: order.subtotal + order.discountAmount,
      customerKey: order.customerKey,
      metadata: order.metadata as Record<string, unknown>,
    }, userId);

    let status: EscmOrderStatusValue = 'approved';
    if (approvalReq.required) {
      status = 'pending_approval';
      await this.approvals.createApprovalChain(organizationId, userId, order.id, orderKey, approvalReq);
    }

    const updated = await this.prisma.escmSalesOrder.update({
      where: { id: order.id },
      data: {
        status,
        requiresApproval: approvalReq.required,
        approvalLevel: approvalReq.maxLevels,
        confirmedAt: status === 'approved' ? new Date() : undefined,
        approvedAt: status === 'approved' ? new Date() : undefined,
        approvedBy: status === 'approved' ? userId : undefined,
        updatedBy: userId,
      },
      include: { lines: true, approvals: true },
    });

    await this.logStatus(organizationId, order.id, orderKey, order.status, status, userId, 'Envío a flujo');
    await this.audit.log(organizationId, 'SalesOrder', orderKey, 'submitted', userId, { approvalReq });
    await this.core.emitUserAction(organizationId, 'EscmSalesOrder', order.id, EVENT_TYPES.ESCM_ORDER_SUBMITTED, {
      orderKey,
      requiresApproval: approvalReq.required,
    });

    if (status === 'approved') {
      await this.orderReservations.reserveOrder(organizationId, userId, orderKey, { forcePartial: true });
    }

    return updated;
  }

  async transitionStatus(
    organizationId: string,
    userId: string,
    orderKey: string,
    toStatus: EscmOrderStatusValue,
    reason?: string,
  ) {
    const order = await this.getOne(organizationId, orderKey);
    if (!canTransitionOrder(order.status, toStatus)) {
      throw new BadRequestException(`Transición inválida: ${order.status} → ${toStatus}`);
    }

    const timestamps: Record<string, Date> = {};
    if (toStatus === 'in_preparation') timestamps.reservedAt = new Date();
    if (toStatus === 'dispatched') timestamps.dispatchedAt = new Date();
    if (toStatus === 'delivered') {
      timestamps.deliveredAt = new Date();
      timestamps.fulfilledAt = new Date();
    }

    const updated = await this.prisma.escmSalesOrder.update({
      where: { id: order.id },
      data: {
        status: toStatus,
        ...timestamps,
        updatedBy: userId,
      },
    });

    await this.logStatus(organizationId, order.id, orderKey, order.status, toStatus, userId, reason);
    await this.audit.log(organizationId, 'SalesOrder', orderKey, 'status_changed', userId, { toStatus, reason });
    await this.core.emitUserAction(organizationId, 'EscmSalesOrder', order.id, EVENT_TYPES.ESCM_ORDER_STATUS_CHANGED, {
      orderKey,
      from: order.status,
      to: toStatus,
    });
    return updated;
  }

  async cancel(
    organizationId: string,
    userId: string,
    orderKey: string,
    reason?: string,
  ) {
    const order = await this.getOne(organizationId, orderKey);
    for (const line of order.lines) {
      if (line.reservationKey && line.reservedQty > 0) {
        try {
          await this.orderReservations.releaseLine(organizationId, userId, orderKey, line.lineKey, {
            reason: reason ?? 'Cancelación de pedido',
          });
        } catch {
          // reserva ya liberada
        }
      }
    }
    const updated = await this.prisma.escmSalesOrder.update({
      where: { id: order.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancelReason: reason,
        updatedBy: userId,
      },
    });
    await this.logStatus(organizationId, order.id, orderKey, order.status, 'cancelled', userId, reason);
    await this.audit.log(organizationId, 'SalesOrder', orderKey, 'cancelled', userId, { reason });
    await this.core.emitUserAction(organizationId, 'EscmSalesOrder', order.id, EVENT_TYPES.ESCM_ORDER_CANCELLED, {
      orderKey,
      reason,
    });
    return updated;
  }

  async createPartial(
    organizationId: string,
    userId: string,
    parentOrderKey: string,
    input: { lines: Array<{ lineKey: string; quantity: number }> },
  ) {
    const parent = await this.getOne(organizationId, parentOrderKey);
    const partialLines: OrderLineInput[] = [];
    for (const req of input.lines) {
      const src = parent.lines.find((l) => l.lineKey === req.lineKey);
      if (!src) throw new NotFoundException(`Línea ${req.lineKey} no encontrada`);
      if (req.quantity > src.quantity - src.shippedQty) {
        throw new BadRequestException(`Cantidad parcial excede pendiente en ${req.lineKey}`);
      }
      partialLines.push({
        itemKey: src.itemKey,
        description: src.description ?? undefined,
        quantity: req.quantity,
        unitPrice: src.unitPrice,
        discountPct: src.discountPct,
        taxKey: src.taxKey ?? undefined,
        taxRate: src.taxRate,
      });
    }
    return this.create(organizationId, userId, {
      customerKey: parent.customerKey,
      lines: partialLines,
      parentOrderKey,
      orderType: 'partial',
      warehouseKey: parent.warehouseKey ?? undefined,
      paymentTermKey: parent.paymentTermKey ?? undefined,
      currencyKey: parent.currencyKey,
      submit: true,
    });
  }

  async consolidate(
    organizationId: string,
    userId: string,
    orderKeys: string[],
  ) {
    if (orderKeys.length < 2) throw new BadRequestException('Se requieren al menos 2 pedidos');
    const orders = await Promise.all(orderKeys.map((k) => this.getOne(organizationId, k)));
    const customerKey = orders[0].customerKey;
    if (!orders.every((o) => o.customerKey === customerKey)) {
      throw new BadRequestException('Todos los pedidos deben ser del mismo cliente');
    }

    const count = await this.prisma.escmSalesOrder.count({ where: { organizationId } });
    const consolidationKey = generateConsolidationKey(count + 1);
    const mergedLines: OrderLineInput[] = [];
    for (const order of orders) {
      for (const line of order.lines) {
        const existing = mergedLines.find((l) => l.itemKey === line.itemKey && l.unitPrice === line.unitPrice);
        if (existing) {
          existing.quantity += line.quantity;
        } else {
          mergedLines.push({
            itemKey: line.itemKey,
            description: line.description ?? undefined,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountPct: line.discountPct,
            taxKey: line.taxKey ?? undefined,
            taxRate: line.taxRate,
          });
        }
      }
    }

    const consolidated = await this.create(organizationId, userId, {
      customerKey,
      lines: mergedLines,
      consolidationKey,
      orderType: 'consolidated',
      warehouseKey: orders[0].warehouseKey ?? undefined,
      metadata: { sourceOrders: orderKeys },
    });

    await this.prisma.escmSalesOrder.updateMany({
      where: { organizationId, orderKey: { in: orderKeys } },
      data: { consolidationKey, updatedBy: userId },
    });

    return consolidated;
  }

  async scheduleRecurring(
    organizationId: string,
    userId: string,
    input: {
      customerKey: string;
      lines: OrderLineInput[];
      scheduledAt: string;
      recurrenceKey?: string;
      warehouseKey?: string;
    },
  ) {
    let recurrenceKey = input.recurrenceKey;
    if (!recurrenceKey) {
      const count = await this.prisma.escmSalesOrder.count({
        where: { organizationId, recurrenceKey: { not: null } },
      });
      recurrenceKey = generateRecurrenceKey(count + 1);
    }
    return this.create(organizationId, userId, {
      ...input,
      recurrenceKey,
      orderType: input.recurrenceKey ? 'recurring' : 'scheduled',
      scheduledAt: input.scheduledAt,
      submit: false,
    });
  }

  async convertFromQuotation(
    organizationId: string,
    userId: string,
    quotationKey: string,
    input?: { warehouseKey?: string; reserveInventory?: boolean; submit?: boolean },
  ) {
    const quote = await this.quotations.getOne(organizationId, quotationKey);
    if (!canConvertQuotation(quote.status)) {
      throw new BadRequestException('La cotización debe estar aprobada para convertirse en pedido');
    }
    if (quote.convertedOrderKey) {
      throw new BadRequestException(`Ya convertida en pedido ${quote.convertedOrderKey}`);
    }

    const orderType = quote.currencyKey !== 'COP' ? 'international' : 'national';
    const order = await this.create(organizationId, userId, {
      customerKey: quote.customerKey,
      lines: quote.lines.map((line) => ({
        itemKey: line.itemKey,
        description: line.description ?? undefined,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountPct: line.discountPct,
        taxKey: line.taxKey ?? undefined,
        taxRate: line.taxRate,
      })),
      orderType,
      warehouseKey: input?.warehouseKey,
      paymentTermKey: quote.paymentTermKey ?? undefined,
      currencyKey: quote.currencyKey,
      metadata: { quotationKey, opportunityId: quote.opportunityId },
    });

    await this.prisma.escmSalesOrder.update({
      where: { id: order.id },
      data: {
        opportunityId: quote.opportunityId,
        quotationId: quote.id,
        quotationKey: quote.quotationKey,
      },
    });

    const submitted = input?.submit !== false
      ? await this.submit(organizationId, userId, order.orderKey)
      : order;

    if (quote.opportunityId) {
      const wonStage = await this.prisma.escmPipelineStage.findFirst({
        where: { organizationId, isWon: true, isActive: true },
      });
      if (wonStage) {
        await this.prisma.escmOpportunity.update({
          where: { id: quote.opportunityId },
          data: {
            stageKey: wonStage.stageKey,
            pipelineStageId: wonStage.id,
            status: 'won',
            probability: 100,
            closedAt: new Date(),
            updatedBy: userId,
          },
        });
      }
    }

    await this.prisma.escmQuotation.update({
      where: { id: quote.id },
      data: { status: 'converted', convertedOrderKey: order.orderKey, updatedBy: userId },
    });

    await this.prisma.escmPurchaseHistory.create({
      data: {
        customerId: quote.customerId,
        historyKey: `HIS-${order.orderKey}`,
        documentKey: order.orderKey,
        documentType: 'sales_order',
        totalAmount: order.totalAmount,
        currencyKey: order.currencyKey,
        purchasedAt: new Date(),
        metadata: { quotationKey },
      },
    });

    await this.audit.log(organizationId, 'SalesOrder', order.orderKey, 'created_from_quotation', userId, {
      quotationKey,
    });
    await this.core.emitUserAction(organizationId, 'EscmQuotation', quote.id, EVENT_TYPES.ESCM_QUOTATION_CONVERTED, {
      quotationKey,
      orderKey: order.orderKey,
    });

    if (input?.reserveInventory !== false && normalizeOrderStatus(submitted.status) === 'approved') {
      await this.orderReservations.reserveOrder(organizationId, userId, order.orderKey, { forcePartial: true });
    }

    return { order: submitted, quotationKey };
  }

  async syncOfflineOrders(
    organizationId: string,
    userId: string,
    orders: Array<{
      clientRef: string;
      customerKey: string;
      lines: OrderLineInput[];
      notes?: string;
    }>,
  ) {
    const results = [];
    for (const item of orders) {
      try {
        const order = await this.create(organizationId, userId, {
          customerKey: item.customerKey,
          lines: item.lines,
          notes: item.notes,
          metadata: { clientRef: item.clientRef, offline: true },
          submit: true,
        });
        results.push({ clientRef: item.clientRef, orderKey: order.orderKey, status: 'synced' });
      } catch (err) {
        results.push({
          clientRef: item.clientRef,
          status: 'error',
          message: err instanceof Error ? err.message : 'Error',
        });
      }
    }
    return results;
  }

  private async logStatus(
    organizationId: string,
    orderId: string,
    orderKey: string,
    fromStatus: string | null,
    toStatus: string,
    userId: string,
    reason?: string,
  ) {
    await this.prisma.escmOrderStatusLog.create({
      data: {
        organizationId,
        orderId,
        orderKey,
        fromStatus,
        toStatus,
        changedBy: userId,
        reason,
      },
    });
  }
}
