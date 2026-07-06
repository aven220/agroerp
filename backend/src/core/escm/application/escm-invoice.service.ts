import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EscmAuditService } from './escm-audit.service';
import { EscmTaxService } from './escm-tax.service';
import { EscmBillingDocumentService } from './escm-billing-document.service';
import { EscmReceivableService } from './escm-receivable.service';
import {
  BillingLineInput,
  canIssueInvoice,
  canVoidInvoice,
  computeBillingLineTotals,
  computeBillingTotals,
  generateInvoiceKey,
  resolveInvoiceType,
} from '../domain/escm-billing.engine';

type InvoiceLineInput = BillingLineInput & {
  orderLineKey?: string;
  dispatchLineKey?: string;
};

function invoicedQty(metadata: unknown): number {
  const m = (metadata ?? {}) as { invoicedQty?: number };
  return m.invoicedQty ?? 0;
}

@Injectable()
export class EscmInvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EscmAuditService,
    private readonly tax: EscmTaxService,
    private readonly documents: EscmBillingDocumentService,
    private readonly receivables: EscmReceivableService,
  ) {}

  list(
    organizationId: string,
    filters?: { status?: string; customerKey?: string; orderKey?: string; invoiceType?: string },
  ) {
    return this.prisma.escmInvoice.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.customerKey ? { customerKey: filters.customerKey } : {}),
        ...(filters?.orderKey ? { orderKey: filters.orderKey } : {}),
        ...(filters?.invoiceType ? { invoiceType: filters.invoiceType as never } : {}),
      },
      include: { _count: { select: { lines: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async getOne(organizationId: string, invoiceKey: string) {
    const row = await this.prisma.escmInvoice.findFirst({
      where: { organizationId, invoiceKey },
      include: {
        lines: { orderBy: { sortOrder: 'asc' } },
        taxLines: true,
        customer: true,
        order: true,
        dispatch: true,
        returns: true,
        creditNotes: true,
        debitNotes: true,
        childInvoices: true,
      },
    });
    if (!row) throw new NotFoundException(`Factura ${invoiceKey} no encontrada`);
    return row;
  }

  private async nextKey(organizationId: string) {
    const count = await this.prisma.escmInvoice.count({ where: { organizationId } });
    return generateInvoiceKey(count + 1);
  }

  private async resolveLineTaxes(
    organizationId: string,
    customerKey: string,
    countryCode: string | null | undefined,
    lines: InvoiceLineInput[],
  ) {
    const resolved: InvoiceLineInput[] = [];
    for (const line of lines) {
      const rates = await this.tax.resolveRates(organizationId, {
        itemKey: line.itemKey,
        customerKey,
        countryCode: countryCode ?? undefined,
        taxKey: line.taxKey,
        withholdingKey: line.withholdingKey,
      });
      resolved.push({
        ...line,
        taxKey: rates.taxKey,
        taxRate: rates.taxRate,
        withholdingKey: rates.withholdingKey,
        withholdingRate: rates.withholdingRate,
      });
    }
    return resolved;
  }

  private async persistInvoice(
    organizationId: string,
    userId: string,
    data: {
      invoiceKey: string;
      status: 'draft' | 'proforma' | 'issued';
      invoiceType: string;
      sourceType: string;
      customerId: string;
      customerKey: string;
      orderId?: string;
      orderKey?: string;
      dispatchId?: string;
      dispatchKey?: string;
      parentInvoiceId?: string;
      consolidationKey?: string;
      recurrenceKey?: string;
      countryCode?: string | null;
      currencyKey?: string;
      lines: InvoiceLineInput[];
      headerDiscountPct?: number;
      notes?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const totals = computeBillingTotals(data.lines, data.headerDiscountPct ?? 0);
    const row = await this.prisma.escmInvoice.create({
      data: {
        organizationId,
        invoiceKey: data.invoiceKey,
        status: data.status,
        invoiceType: data.invoiceType as never,
        sourceType: data.sourceType as never,
        customerId: data.customerId,
        customerKey: data.customerKey,
        orderId: data.orderId,
        orderKey: data.orderKey,
        dispatchId: data.dispatchId,
        dispatchKey: data.dispatchKey,
        parentInvoiceId: data.parentInvoiceId,
        consolidationKey: data.consolidationKey,
        recurrenceKey: data.recurrenceKey,
        countryCode: data.countryCode,
        currencyKey: data.currencyKey ?? 'COP',
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        withholdingAmount: totals.withholdingAmount,
        roundingAdjustment: totals.roundingAdjustment,
        totalAmount: totals.totalAmount,
        notes: data.notes,
        metadata: (data.metadata ?? {}) as object,
        issuedAt: data.status === 'issued' ? new Date() : undefined,
        createdBy: userId,
        lines: {
          create: data.lines.map((line, idx) => {
            const t = computeBillingLineTotals(line);
            return {
              lineKey: `L${idx + 1}`,
              itemKey: line.itemKey,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discountPct: line.discountPct ?? 0,
              taxKey: line.taxKey,
              taxRate: t.taxRate,
              taxAmount: t.taxAmount,
              withholdingKey: line.withholdingKey,
              withholdingRate: t.withholdingRate,
              withholdingAmount: t.withholdingAmount,
              lineSubtotal: t.lineSubtotal,
              lineTotal: t.lineTotal,
              orderLineKey: line.orderLineKey,
              dispatchLineKey: line.dispatchLineKey,
              sortOrder: idx,
            };
          }),
        },
        taxLines: {
          create: totals.taxBreakdown.map((tb) => ({
            taxType: tb.taxType,
            taxKey: tb.taxKey,
            baseAmount: tb.baseAmount,
            rate: tb.rate,
            amount: tb.amount,
          })),
        },
      },
      include: { lines: true, taxLines: true },
    });
    return row;
  }

  async createDraft(
    organizationId: string,
    userId: string,
    input: {
      customerKey: string;
      lines: InvoiceLineInput[];
      invoiceType?: string;
      notes?: string;
      discountPct?: number;
    },
  ) {
    const customer = await this.prisma.escmCustomer.findFirst({
      where: { organizationId, customerKey: input.customerKey, deletedAt: null },
    });
    if (!customer) throw new NotFoundException(`Cliente ${input.customerKey} no encontrado`);
    if (!input.lines?.length) throw new BadRequestException('Líneas requeridas');

    const resolved = await this.resolveLineTaxes(
      organizationId,
      customer.customerKey,
      customer.countryCode,
      input.lines,
    );
    const invoiceKey = await this.nextKey(organizationId);
    const invoiceType = resolveInvoiceType({
      invoiceType: input.invoiceType,
      countryCode: customer.countryCode,
    });

    const row = await this.persistInvoice(organizationId, userId, {
      invoiceKey,
      status: 'draft',
      invoiceType,
      sourceType: 'manual',
      customerId: customer.id,
      customerKey: customer.customerKey,
      countryCode: customer.countryCode,
      currencyKey: customer.currencyKey ?? 'COP',
      lines: resolved,
      headerDiscountPct: input.discountPct,
      notes: input.notes,
    });

    await this.audit.log(organizationId, 'Invoice', invoiceKey, 'draft_created', userId);
    await this.core.emitUserAction(organizationId, 'EscmInvoice', row.id, EVENT_TYPES.ESCM_INVOICE_CREATED, {
      invoiceKey,
      status: 'draft',
    });
    return row;
  }

  async createProforma(
    organizationId: string,
    userId: string,
    input: { customerKey: string; lines: InvoiceLineInput[]; notes?: string },
  ) {
    const customer = await this.prisma.escmCustomer.findFirst({
      where: { organizationId, customerKey: input.customerKey, deletedAt: null },
    });
    if (!customer) throw new NotFoundException(`Cliente ${input.customerKey} no encontrado`);

    const resolved = await this.resolveLineTaxes(
      organizationId,
      customer.customerKey,
      customer.countryCode,
      input.lines,
    );
    const invoiceKey = await this.nextKey(organizationId);

    const row = await this.persistInvoice(organizationId, userId, {
      invoiceKey,
      status: 'proforma',
      invoiceType: 'proforma',
      sourceType: 'manual',
      customerId: customer.id,
      customerKey: customer.customerKey,
      countryCode: customer.countryCode,
      currencyKey: customer.currencyKey ?? 'COP',
      lines: resolved,
      notes: input.notes,
    });

    await this.audit.log(organizationId, 'Invoice', invoiceKey, 'proforma_created', userId);
    await this.core.emitUserAction(organizationId, 'EscmInvoice', row.id, EVENT_TYPES.ESCM_INVOICE_CREATED, {
      invoiceKey,
      status: 'proforma',
    });
    return row;
  }

  async createFromOrder(
    organizationId: string,
    userId: string,
    orderKey: string,
    input?: {
      lines?: Array<{ orderLineKey: string; quantity: number }>;
      isPartial?: boolean;
      asProforma?: boolean;
    },
  ) {
    const order = await this.prisma.escmSalesOrder.findFirst({
      where: { organizationId, orderKey },
      include: { lines: true, customer: true },
    });
    if (!order) throw new NotFoundException(`Pedido ${orderKey} no encontrado`);
    if (!['approved', 'reserved', 'in_preparation', 'ready_for_dispatch', 'partial', 'shipped', 'delivered'].includes(order.status)) {
      throw new BadRequestException(`Pedido ${orderKey} no facturable (${order.status})`);
    }

    const lineInputs: InvoiceLineInput[] = input?.lines?.length
      ? input.lines.map((li) => {
          const src = order.lines.find((l) => l.lineKey === li.orderLineKey);
          if (!src) throw new NotFoundException(`Línea ${li.orderLineKey} no encontrada`);
          const pending = src.quantity - invoicedQty(src.metadata);
          if (li.quantity > pending) {
            throw new BadRequestException(`Cantidad excede pendiente facturable en ${li.orderLineKey}`);
          }
          return {
            itemKey: src.itemKey,
            description: src.description ?? undefined,
            quantity: li.quantity,
            unitPrice: src.unitPrice,
            discountPct: src.discountPct,
            taxKey: src.taxKey ?? undefined,
            taxRate: src.taxRate,
            orderLineKey: src.lineKey,
          };
        })
      : order.lines
          .filter((l) => l.quantity - invoicedQty(l.metadata) > 0)
          .map((l) => ({
            itemKey: l.itemKey,
            description: l.description ?? undefined,
            quantity: l.quantity - invoicedQty(l.metadata),
            unitPrice: l.unitPrice,
            discountPct: l.discountPct,
            taxKey: l.taxKey ?? undefined,
            taxRate: l.taxRate,
            orderLineKey: l.lineKey,
          }));

    if (!lineInputs.length) throw new BadRequestException('No hay líneas pendientes de facturación');

    const resolved = await this.resolveLineTaxes(
      organizationId,
      order.customerKey,
      order.countryCode ?? order.customer.countryCode,
      lineInputs,
    );
    const invoiceKey = await this.nextKey(organizationId);
    const isPartial = Boolean(input?.isPartial || input?.lines?.length);
    const invoiceType = resolveInvoiceType({
      isPartial,
      countryCode: order.countryCode ?? order.customer.countryCode,
    });

    const row = await this.persistInvoice(organizationId, userId, {
      invoiceKey,
      status: input?.asProforma ? 'proforma' : 'draft',
      invoiceType: input?.asProforma ? 'proforma' : invoiceType,
      sourceType: 'order',
      customerId: order.customerId,
      customerKey: order.customerKey,
      orderId: order.id,
      orderKey: order.orderKey,
      countryCode: order.countryCode ?? order.customer.countryCode,
      currencyKey: order.currencyKey ?? 'COP',
      lines: resolved,
    });

    await this.audit.log(organizationId, 'Invoice', invoiceKey, 'from_order', userId, { orderKey });
    await this.core.emitUserAction(organizationId, 'EscmInvoice', row.id, EVENT_TYPES.ESCM_INVOICE_CREATED, {
      invoiceKey,
      orderKey,
    });
    return row;
  }

  async createFromDispatch(
    organizationId: string,
    userId: string,
    dispatchKey: string,
    input?: { asProforma?: boolean },
  ) {
    const dispatch = await this.prisma.escmDispatch.findFirst({
      where: { organizationId, dispatchKey },
      include: { lines: true, order: { include: { lines: true, customer: true } } },
    });
    if (!dispatch) throw new NotFoundException(`Despacho ${dispatchKey} no encontrado`);
    if (!['shipped', 'in_transit', 'delivered', 'partial'].includes(dispatch.status)) {
      throw new BadRequestException(`Despacho ${dispatchKey} no facturable (${dispatch.status})`);
    }

    const lineInputs: InvoiceLineInput[] = dispatch.lines.map((dl) => {
      const orderLine = dispatch.order.lines.find((l) => l.lineKey === dl.orderLineKey);
      return {
        itemKey: dl.itemKey,
        description: orderLine?.description ?? undefined,
        quantity: dl.quantity,
        unitPrice: orderLine?.unitPrice ?? 0,
        discountPct: orderLine?.discountPct ?? 0,
        taxKey: orderLine?.taxKey ?? undefined,
        taxRate: orderLine?.taxRate ?? 0,
        orderLineKey: dl.orderLineKey,
        dispatchLineKey: dl.lineKey,
      };
    });

    const resolved = await this.resolveLineTaxes(
      organizationId,
      dispatch.customerKey,
      dispatch.order.countryCode,
      lineInputs,
    );
    const invoiceKey = await this.nextKey(organizationId);
    const invoiceType = resolveInvoiceType({
      isPartial: dispatch.dispatchType === 'partial',
      countryCode: dispatch.order.countryCode,
    });

    const row = await this.persistInvoice(organizationId, userId, {
      invoiceKey,
      status: input?.asProforma ? 'proforma' : 'draft',
      invoiceType: input?.asProforma ? 'proforma' : invoiceType,
      sourceType: 'dispatch',
      customerId: dispatch.order.customerId,
      customerKey: dispatch.customerKey,
      orderId: dispatch.orderId,
      orderKey: dispatch.orderKey,
      dispatchId: dispatch.id,
      dispatchKey: dispatch.dispatchKey,
      countryCode: dispatch.order.countryCode,
      currencyKey: dispatch.order.currencyKey ?? 'COP',
      lines: resolved,
    });

    await this.audit.log(organizationId, 'Invoice', invoiceKey, 'from_dispatch', userId, { dispatchKey });
    await this.core.emitUserAction(organizationId, 'EscmInvoice', row.id, EVENT_TYPES.ESCM_INVOICE_CREATED, {
      invoiceKey,
      dispatchKey,
    });
    return row;
  }

  async createConsolidated(
    organizationId: string,
    userId: string,
    orderKeys: string[],
    input?: { consolidationKey?: string; notes?: string },
  ) {
    if (!orderKeys?.length) throw new BadRequestException('Pedidos requeridos');
    const orders = await this.prisma.escmSalesOrder.findMany({
      where: { organizationId, orderKey: { in: orderKeys } },
      include: { lines: true, customer: true },
    });
    if (orders.length !== orderKeys.length) throw new NotFoundException('Uno o más pedidos no encontrados');

    const customerKey = orders[0].customerKey;
    if (!orders.every((o) => o.customerKey === customerKey)) {
      throw new BadRequestException('Consolidación requiere el mismo cliente');
    }

    const lineInputs: InvoiceLineInput[] = [];
    for (const order of orders) {
      for (const l of order.lines) {
        const pending = l.quantity - invoicedQty(l.metadata);
        if (pending <= 0) continue;
        lineInputs.push({
          itemKey: l.itemKey,
          description: `${l.description ?? l.itemKey} (${order.orderKey})`,
          quantity: pending,
          unitPrice: l.unitPrice,
          discountPct: l.discountPct,
          taxKey: l.taxKey ?? undefined,
          taxRate: l.taxRate,
          orderLineKey: l.lineKey,
        });
      }
    }
    if (!lineInputs.length) throw new BadRequestException('No hay líneas para consolidar');

    const consolidationKey = input?.consolidationKey ?? `CON-${Date.now()}`;
    const resolved = await this.resolveLineTaxes(
      organizationId,
      customerKey,
      orders[0].countryCode ?? orders[0].customer.countryCode,
      lineInputs,
    );
    const invoiceKey = await this.nextKey(organizationId);

    const row = await this.persistInvoice(organizationId, userId, {
      invoiceKey,
      status: 'draft',
      invoiceType: 'consolidated',
      sourceType: 'order',
      customerId: orders[0].customerId,
      customerKey,
      consolidationKey,
      countryCode: orders[0].countryCode,
      currencyKey: orders[0].currencyKey ?? 'COP',
      lines: resolved,
      notes: input?.notes,
      metadata: { orderKeys },
    });

    await this.audit.log(organizationId, 'Invoice', invoiceKey, 'consolidated', userId, { orderKeys });
    await this.core.emitUserAction(organizationId, 'EscmInvoice', row.id, EVENT_TYPES.ESCM_INVOICE_CREATED, {
      invoiceKey,
      consolidationKey,
    });
    return row;
  }

  async createRecurring(
    organizationId: string,
    userId: string,
    input: {
      customerKey: string;
      recurrenceKey: string;
      lines: InvoiceLineInput[];
      parentInvoiceKey?: string;
    },
  ) {
    const customer = await this.prisma.escmCustomer.findFirst({
      where: { organizationId, customerKey: input.customerKey, deletedAt: null },
    });
    if (!customer) throw new NotFoundException(`Cliente ${input.customerKey} no encontrado`);

    let parentInvoiceId: string | undefined;
    if (input.parentInvoiceKey) {
      const parent = await this.getOne(organizationId, input.parentInvoiceKey);
      parentInvoiceId = parent.id;
    }

    const resolved = await this.resolveLineTaxes(
      organizationId,
      customer.customerKey,
      customer.countryCode,
      input.lines,
    );
    const invoiceKey = await this.nextKey(organizationId);

    const row = await this.persistInvoice(organizationId, userId, {
      invoiceKey,
      status: 'draft',
      invoiceType: 'recurring',
      sourceType: 'recurring',
      customerId: customer.id,
      customerKey: customer.customerKey,
      parentInvoiceId,
      recurrenceKey: input.recurrenceKey,
      countryCode: customer.countryCode,
      currencyKey: customer.currencyKey ?? 'COP',
      lines: resolved,
    });

    await this.audit.log(organizationId, 'Invoice', invoiceKey, 'recurring_created', userId, {
      recurrenceKey: input.recurrenceKey,
    });
    await this.core.emitUserAction(organizationId, 'EscmInvoice', row.id, EVENT_TYPES.ESCM_INVOICE_CREATED, {
      invoiceKey,
      recurrenceKey: input.recurrenceKey,
    });
    return row;
  }

  private async updateOrderInvoicedQty(organizationId: string, invoiceId: string) {
    const invoice = await this.prisma.escmInvoice.findFirst({
      where: { id: invoiceId },
      include: { lines: true },
    });
    if (!invoice?.orderId) return;

    const order = await this.prisma.escmSalesOrder.findFirst({
      where: { id: invoice.orderId },
      include: { lines: true },
    });
    if (!order) return;

    for (const invLine of invoice.lines) {
      if (!invLine.orderLineKey) continue;
      const orderLine = order.lines.find((l) => l.lineKey === invLine.orderLineKey);
      if (!orderLine) continue;
      const meta = (orderLine.metadata ?? {}) as Record<string, unknown>;
      const current = invoicedQty(meta);
      await this.prisma.escmSalesOrderLine.update({
        where: { id: orderLine.id },
        data: {
          metadata: { ...meta, invoicedQty: current + invLine.quantity } as object,
        },
      });
    }
  }

  async issue(organizationId: string, userId: string, invoiceKey: string) {
    const invoice = await this.getOne(organizationId, invoiceKey);
    if (!canIssueInvoice(invoice.status)) {
      throw new BadRequestException(`Factura ${invoiceKey} no puede emitirse (${invoice.status})`);
    }

    const updated = await this.prisma.escmInvoice.update({
      where: { id: invoice.id },
      data: {
        status: invoice.invoiceType === 'partial' ? 'partial' : 'issued',
        issuedAt: new Date(),
        updatedBy: userId,
      },
      include: { lines: true, taxLines: true },
    });

    await this.updateOrderInvoicedQty(organizationId, invoice.id);
    await this.documents.generateForInvoice(organizationId, userId, invoiceKey);
    await this.receivables.createFromInvoice(organizationId, userId, {
      id: updated.id,
      invoiceKey: updated.invoiceKey,
      customerId: updated.customerId,
      customerKey: updated.customerKey,
      currencyKey: updated.currencyKey,
      totalAmount: updated.totalAmount,
      issuedAt: updated.issuedAt,
    });

    await this.audit.log(organizationId, 'Invoice', invoiceKey, 'issued', userId);
    await this.core.emitUserAction(organizationId, 'EscmInvoice', updated.id, EVENT_TYPES.ESCM_INVOICE_ISSUED, {
      invoiceKey,
      totalAmount: updated.totalAmount,
    });
    return updated;
  }

  async void(organizationId: string, userId: string, invoiceKey: string, reason: string) {
    const invoice = await this.getOne(organizationId, invoiceKey);
    if (!canVoidInvoice(invoice.status)) {
      throw new BadRequestException(`Factura ${invoiceKey} no puede anularse (${invoice.status})`);
    }
    if (!reason?.trim()) throw new BadRequestException('Motivo de anulación requerido');

    const updated = await this.prisma.escmInvoice.update({
      where: { id: invoice.id },
      data: {
        status: 'voided',
        voidedAt: new Date(),
        voidedBy: userId,
        voidReason: reason,
        updatedBy: userId,
      },
    });

    await this.receivables.cancelForVoidedInvoice(organizationId, userId, invoiceKey);

    await this.audit.log(organizationId, 'Invoice', invoiceKey, 'voided', userId, { reason });
    await this.core.emitUserAction(organizationId, 'EscmInvoice', updated.id, EVENT_TYPES.ESCM_INVOICE_VOIDED, {
      invoiceKey,
      reason,
    });
    return updated;
  }

  async history(organizationId: string, filters?: { customerKey?: string; documentKey?: string }) {
    const [invoices, creditNotes, debitNotes, returns, warranties, billingDocs] = await Promise.all([
      this.list(organizationId, { customerKey: filters?.customerKey }),
      this.prisma.escmCreditNote.findMany({
        where: { organizationId, ...(filters?.customerKey ? { customerKey: filters.customerKey } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.escmDebitNote.findMany({
        where: { organizationId, ...(filters?.customerKey ? { customerKey: filters.customerKey } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.escmReturn.findMany({
        where: { organizationId, ...(filters?.customerKey ? { customerKey: filters.customerKey } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prisma.escmWarrantyClaim.findMany({
        where: { organizationId, ...(filters?.customerKey ? { customerKey: filters.customerKey } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.documents.list(organizationId, filters?.documentKey ? { referenceKey: filters.documentKey } : undefined),
    ]);

    return {
      invoices,
      creditNotes,
      debitNotes,
      returns,
      warranties,
      billingDocuments: billingDocs,
    };
  }
}
