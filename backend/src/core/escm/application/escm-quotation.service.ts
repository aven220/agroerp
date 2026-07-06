import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EscmAuditService } from './escm-audit.service';
import { EscmPriceListService } from './escm-price-list.service';
import {
  canApproveQuotation,
  canConvertQuotation,
  computeLineTotals,
  computeQuotationTotals,
  generateQuoteGroupKey,
  generateQuotationKey,
  resolveTaxRate,
  type QuotationLineInput,
} from '../domain/escm-quotation.engine';

@Injectable()
export class EscmQuotationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EscmAuditService,
    private readonly pricing: EscmPriceListService,
  ) {}

  list(organizationId: string, filters?: { status?: string; customerKey?: string; currentOnly?: boolean }) {
    return this.prisma.escmQuotation.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.customerKey ? { customerKey: filters.customerKey } : {}),
        ...(filters?.currentOnly !== false ? { isCurrent: true } : {}),
      },
      include: { _count: { select: { lines: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async getOne(organizationId: string, quotationKey: string) {
    const row = await this.prisma.escmQuotation.findFirst({
      where: { organizationId, quotationKey },
      include: { lines: { orderBy: { sortOrder: 'asc' } }, opportunity: true, customer: true },
    });
    if (!row) throw new NotFoundException(`Cotización ${quotationKey} no encontrada`);
    return row;
  }

  async getVersions(organizationId: string, quoteGroupKey: string) {
    return this.prisma.escmQuotation.findMany({
      where: { organizationId, quoteGroupKey },
      include: { lines: true },
      orderBy: { version: 'desc' },
    });
  }

  private async resolveLines(
    organizationId: string,
    customerKey: string,
    lines: QuotationLineInput[],
  ) {
    const resolved: QuotationLineInput[] = [];
    for (const line of lines) {
      let unitPrice = line.unitPrice;
      if (unitPrice == null || unitPrice === undefined) {
        const price = await this.pricing.resolvePrice(organizationId, {
          customerKey,
          itemKey: line.itemKey,
          quantity: line.quantity,
        });
        unitPrice = price.finalPrice ?? price.unitPrice ?? 0;
      }
      resolved.push({
        ...line,
        unitPrice,
        taxRate: resolveTaxRate(line.taxKey, line.taxRate),
      });
    }
    return resolved;
  }

  async create(
    organizationId: string,
    userId: string,
    input: {
      customerKey: string;
      opportunityKey?: string;
      title?: string;
      lines: QuotationLineInput[];
      discountPct?: number;
      validUntil?: string;
      paymentTermKey?: string;
      deliveryMethodKey?: string;
      incotermKey?: string;
      notes?: string;
      scenarioLabel?: string;
    },
  ) {
    const customer = await this.prisma.escmCustomer.findFirst({
      where: { organizationId, customerKey: input.customerKey, deletedAt: null },
    });
    if (!customer) throw new NotFoundException(`Cliente ${input.customerKey} no encontrado`);
    if (!input.lines?.length) throw new BadRequestException('Líneas requeridas');

    const opportunity = input.opportunityKey
      ? await this.prisma.escmOpportunity.findFirst({ where: { organizationId, opportunityKey: input.opportunityKey } })
      : null;

    const groupCount = await this.prisma.escmQuotation.count({ where: { organizationId } });
    const quoteGroupKey = generateQuoteGroupKey(groupCount + 1);
    const version = 1;
    const quotationKey = generateQuotationKey(quoteGroupKey, version);
    const resolvedLines = await this.resolveLines(organizationId, input.customerKey, input.lines);
    const totals = computeQuotationTotals(resolvedLines, input.discountPct ?? 0);

    const row = await this.prisma.escmQuotation.create({
      data: {
        organizationId,
        quotationKey,
        quoteGroupKey,
        version,
        isCurrent: true,
        status: 'draft',
        title: input.title,
        customerId: customer.id,
        customerKey: customer.customerKey,
        opportunityId: opportunity?.id,
        currencyKey: customer.currencyKey ?? 'COP',
        subtotal: totals.subtotal,
        discountPct: input.discountPct ?? 0,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
        paymentTermKey: input.paymentTermKey ?? customer.paymentTermKey,
        deliveryMethodKey: input.deliveryMethodKey ?? customer.deliveryMethodKey,
        incotermKey: input.incotermKey ?? customer.incotermKey,
        notes: input.notes,
        scenarioLabel: input.scenarioLabel,
        createdBy: userId,
        lines: {
          create: resolvedLines.map((line, idx) => {
            const t = computeLineTotals(line);
            return {
              lineKey: `L${idx + 1}`,
              itemKey: line.itemKey,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discountPct: line.discountPct ?? 0,
              taxKey: line.taxKey,
              taxRate: line.taxRate ?? 0,
              taxAmount: t.taxAmount,
              lineSubtotal: t.lineSubtotal,
              lineTotal: t.lineTotal,
              sortOrder: idx,
            };
          }),
        },
      },
      include: { lines: true },
    });

    await this.audit.log(organizationId, 'Quotation', quotationKey, 'created', userId, { version });
    await this.core.emitUserAction(organizationId, 'EscmQuotation', row.id, EVENT_TYPES.ESCM_QUOTATION_CREATED, {
      quotationKey,
      quoteGroupKey,
    });
    return row;
  }

  async newVersion(organizationId: string, userId: string, quotationKey: string, input?: { lines?: QuotationLineInput[]; discountPct?: number; notes?: string }) {
    const current = await this.getOne(organizationId, quotationKey);
    if (!current.isCurrent) throw new BadRequestException('Solo se versiona la cotización vigente');

    await this.prisma.escmQuotation.update({
      where: { id: current.id },
      data: { isCurrent: false, status: current.status === 'draft' ? 'superseded' : current.status },
    });

    const version = current.version + 1;
    const newKey = generateQuotationKey(current.quoteGroupKey, version);
    const lines = input?.lines?.length
      ? await this.resolveLines(organizationId, current.customerKey, input.lines)
      : current.lines.map((l) => ({
          itemKey: l.itemKey,
          description: l.description ?? undefined,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountPct: l.discountPct,
          taxKey: l.taxKey ?? undefined,
          taxRate: l.taxRate,
        }));
    const discountPct = input?.discountPct ?? current.discountPct;
    const totals = computeQuotationTotals(lines, discountPct);

    const row = await this.prisma.escmQuotation.create({
      data: {
        organizationId,
        quotationKey: newKey,
        quoteGroupKey: current.quoteGroupKey,
        version,
        isCurrent: true,
        status: 'draft',
        title: current.title,
        customerId: current.customerId,
        customerKey: current.customerKey,
        opportunityId: current.opportunityId,
        currencyKey: current.currencyKey,
        subtotal: totals.subtotal,
        discountPct,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        validUntil: current.validUntil,
        paymentTermKey: current.paymentTermKey,
        deliveryMethodKey: current.deliveryMethodKey,
        incotermKey: current.incotermKey,
        notes: input?.notes ?? current.notes,
        scenarioLabel: current.scenarioLabel,
        createdBy: userId,
        lines: {
          create: lines.map((line, idx) => {
            const t = computeLineTotals(line);
            return {
              lineKey: `L${idx + 1}`,
              itemKey: line.itemKey,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discountPct: line.discountPct ?? 0,
              taxKey: line.taxKey,
              taxRate: line.taxRate ?? 0,
              taxAmount: t.taxAmount,
              lineSubtotal: t.lineSubtotal,
              lineTotal: t.lineTotal,
              sortOrder: idx,
            };
          }),
        },
      },
      include: { lines: true },
    });

    await this.audit.log(organizationId, 'Quotation', newKey, 'versioned', userId, {
      from: quotationKey,
      version,
    });
    await this.core.emitUserAction(organizationId, 'EscmQuotation', row.id, EVENT_TYPES.ESCM_QUOTATION_VERSIONED, {
      quotationKey: newKey,
      version,
    });
    return row;
  }

  async duplicate(organizationId: string, userId: string, quotationKey: string) {
    const source = await this.getOne(organizationId, quotationKey);
    return this.create(organizationId, userId, {
      customerKey: source.customerKey,
      opportunityKey: source.opportunity?.opportunityKey,
      title: source.title ? `${source.title} (copia)` : undefined,
      lines: source.lines.map((l) => ({
        itemKey: l.itemKey,
        description: l.description ?? undefined,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountPct: l.discountPct,
        taxKey: l.taxKey ?? undefined,
        taxRate: l.taxRate,
      })),
      discountPct: source.discountPct,
      paymentTermKey: source.paymentTermKey ?? undefined,
      deliveryMethodKey: source.deliveryMethodKey ?? undefined,
      incotermKey: source.incotermKey ?? undefined,
      notes: source.notes ?? undefined,
    });
  }

  compareVersions(organizationId: string, quoteGroupKey: string) {
    return this.getVersions(organizationId, quoteGroupKey);
  }

  async simulate(
    organizationId: string,
    input: {
      customerKey: string;
      lines: QuotationLineInput[];
      discountPct?: number;
      scenarioLabel?: string;
    },
  ) {
    const resolved = await this.resolveLines(organizationId, input.customerKey, input.lines);
    const totals = computeQuotationTotals(resolved, input.discountPct ?? 0);
    return {
      scenarioLabel: input.scenarioLabel ?? 'simulation',
      lines: resolved.map((line) => ({ ...line, ...computeLineTotals(line) })),
      totals,
    };
  }

  async approve(organizationId: string, userId: string, quotationKey: string, signatureUrl?: string) {
    const row = await this.getOne(organizationId, quotationKey);
    if (!canApproveQuotation(row.status)) {
      throw new BadRequestException(`Estado ${row.status} no permite aprobación`);
    }
    const updated = await this.prisma.escmQuotation.update({
      where: { id: row.id },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: userId,
        signatureUrl,
        signedAt: signatureUrl ? new Date() : undefined,
        updatedBy: userId,
      },
    });
    await this.audit.log(organizationId, 'Quotation', quotationKey, 'approved', userId);
    await this.core.emitUserAction(organizationId, 'EscmQuotation', row.id, EVENT_TYPES.ESCM_QUOTATION_APPROVED, { quotationKey });
    return updated;
  }

  async reject(organizationId: string, userId: string, quotationKey: string, rejectionReason?: string) {
    const row = await this.getOne(organizationId, quotationKey);
    const updated = await this.prisma.escmQuotation.update({
      where: { id: row.id },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: userId,
        rejectionReason,
        updatedBy: userId,
      },
    });
    await this.audit.log(organizationId, 'Quotation', quotationKey, 'rejected', userId, { rejectionReason });
    await this.core.emitUserAction(organizationId, 'EscmQuotation', row.id, EVENT_TYPES.ESCM_QUOTATION_REJECTED, { quotationKey });
    return updated;
  }

  async send(organizationId: string, userId: string, quotationKey: string) {
    const row = await this.getOne(organizationId, quotationKey);
    if (row.status !== 'draft') throw new BadRequestException('Solo borradores pueden enviarse');
    return this.prisma.escmQuotation.update({
      where: { id: row.id },
      data: { status: 'sent', updatedBy: userId },
    });
  }
}
