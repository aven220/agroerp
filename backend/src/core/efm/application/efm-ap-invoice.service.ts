import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EfmAuditService } from './efm-audit.service';
import { EfmApSupplierService } from './efm-ap-supplier.service';
import { EfmAccountingEngineService } from './efm-accounting-engine.service';
import { EfmParameterService } from './efm-parameter.service';
import {
  computeDueDate,
  computeDaysPastDue,
  generateApKey,
  resolveInvoiceStatus,
  resolvePayableStatus,
  validateInvoiceThreeWay,
  DEFAULT_AP_TOLERANCES,
  type ApToleranceConfig,
} from '../domain/efm-ap.engine';

@Injectable()
export class EfmApInvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EfmAuditService,
    private readonly suppliers: EfmApSupplierService,
    private readonly engine: EfmAccountingEngineService,
    private readonly parameters: EfmParameterService,
  ) {}

  list(organizationId: string, filters?: {
    status?: string; supplierKey?: string; overdue?: boolean;
  }) {
    return this.prisma.efmApInvoice.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.supplierKey ? { supplierKey: filters.supplierKey } : {}),
        ...(filters?.overdue ? { dueDate: { lt: new Date() }, balanceAmount: { gt: 0 } } : {}),
      },
      include: { lines: { orderBy: { lineNumber: 'asc' } } },
      orderBy: { issueDate: 'desc' },
      take: 500,
    });
  }

  getOne(organizationId: string, invoiceKey: string) {
    return this.prisma.efmApInvoice.findFirst({
      where: { organizationId, invoiceKey },
      include: {
        lines: { orderBy: { lineNumber: 'asc' } },
        validations: true,
        payables: true,
      },
    });
  }

  async register(
    organizationId: string,
    userId: string,
    input: {
      supplierKey: string;
      producerId?: string;
      supplierInvoiceNumber?: string;
      purchaseOrderKey?: string;
      receiptKey?: string;
      sourceModule?: string;
      sourceDocumentKey?: string;
      invoiceType?: string;
      relatedInvoiceKey?: string;
      currencyKey?: string;
      issueDate: string;
      paymentTermsDays?: number;
      lines: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        discountAmount?: number;
        taxAmount?: number;
        itemKey?: string;
        purchaseOrderLineKey?: string;
        receiptLineKey?: string;
      }>;
      poQuantity?: number;
      receiptQuantity?: number;
      poUnitPrice?: number;
      poTaxAmount?: number;
      poDiscountAmount?: number;
      withholdingAmount?: number;
      observations?: string;
      autoValidate?: boolean;
      autoPost?: boolean;
    },
  ) {
    if (input.producerId) {
      await this.suppliers.getOrCreateFromProducer(organizationId, input.producerId, userId);
    }

    const supplier = await this.prisma.efmApSupplierProfile.findFirst({
      where: { organizationId, supplierKey: input.supplierKey },
    });
    if (!supplier) throw new NotFoundException(`Proveedor ${input.supplierKey} no encontrado`);

    if (input.sourceModule && input.sourceDocumentKey) {
      const dup = await this.prisma.efmApInvoice.findFirst({
        where: { organizationId, sourceModule: input.sourceModule, sourceDocumentKey: input.sourceDocumentKey },
      });
      if (dup) return this.getOne(organizationId, dup.invoiceKey);
    }

    const subtotal = input.lines.reduce((s, l) => s + l.quantity * l.unitPrice - (l.discountAmount ?? 0), 0);
    const taxAmount = input.lines.reduce((s, l) => s + (l.taxAmount ?? 0), 0);
    const discountAmount = input.lines.reduce((s, l) => s + (l.discountAmount ?? 0), 0);
    const withholding = input.withholdingAmount ?? 0;
    const totalAmount = subtotal + taxAmount - withholding;
    const invoiceQty = input.lines.reduce((s, l) => s + l.quantity, 0);
    const avgPrice = invoiceQty > 0 ? subtotal / invoiceQty : 0;

    const count = await this.prisma.efmApInvoice.count({ where: { organizationId } });
    const invoiceKey = generateApKey('APINV', count + 1);
    const issueDate = new Date(input.issueDate);
    const terms = input.paymentTermsDays ?? supplier.paymentTermsDays;
    const dueDate = computeDueDate(issueDate, terms);

    const invoice = await this.prisma.efmApInvoice.create({
      data: {
        organizationId,
        invoiceKey,
        supplierKey: input.supplierKey,
        invoiceType: (input.invoiceType ?? 'standard') as never,
        supplierInvoiceNumber: input.supplierInvoiceNumber,
        purchaseOrderKey: input.purchaseOrderKey,
        receiptKey: input.receiptKey,
        sourceModule: input.sourceModule ?? 'manual',
        sourceDocumentKey: input.sourceDocumentKey ?? invoiceKey,
        relatedInvoiceKey: input.relatedInvoiceKey,
        currencyKey: input.currencyKey ?? supplier.currencyKey,
        subtotal,
        taxAmount,
        discountAmount,
        withholdingAmount: withholding,
        totalAmount,
        balanceAmount: totalAmount,
        issueDate,
        dueDate,
        receivedAt: new Date(),
        status: 'draft',
        observations: input.observations,
        createdBy: userId,
        lines: {
          create: input.lines.map((l, i) => ({
            lineNumber: i + 1,
            itemKey: l.itemKey,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountAmount: l.discountAmount ?? 0,
            taxAmount: l.taxAmount ?? 0,
            lineTotal: l.quantity * l.unitPrice - (l.discountAmount ?? 0) + (l.taxAmount ?? 0),
            purchaseOrderLineKey: l.purchaseOrderLineKey,
            receiptLineKey: l.receiptLineKey,
          })),
        },
      },
      include: { lines: true },
    });

    await this.audit.log(organizationId, 'EfmApInvoice', invoiceKey, 'registered', userId);
    await this.core.emitUserAction(organizationId, 'EfmApInvoice', invoice.id, EVENT_TYPES.EFM_AP_INVOICE_REGISTERED, {
      invoiceKey,
      supplierKey: input.supplierKey,
      totalAmount,
    });

    if (input.autoValidate !== false) {
      return this.validate(organizationId, invoiceKey, userId, {
        poQuantity: input.poQuantity,
        receiptQuantity: input.receiptQuantity,
        poUnitPrice: input.poUnitPrice ?? avgPrice,
        poTaxAmount: input.poTaxAmount ?? taxAmount,
        poDiscountAmount: input.poDiscountAmount ?? discountAmount,
        autoPost: input.autoPost,
      });
    }
    return invoice;
  }

  async validate(
    organizationId: string,
    invoiceKey: string,
    userId: string,
    ctx?: {
      poQuantity?: number;
      receiptQuantity?: number;
      poUnitPrice?: number;
      poTaxAmount?: number;
      poDiscountAmount?: number;
      autoPost?: boolean;
    },
  ) {
    const invoice = await this.getOne(organizationId, invoiceKey);
    if (!invoice) throw new NotFoundException(`Factura ${invoiceKey} no encontrada`);

    const tolerances = await this.getTolerances(organizationId);
    const invoiceQty = invoice.lines.reduce((s, l) => s + l.quantity, 0);
    const avgPrice = invoiceQty > 0 ? invoice.subtotal / invoiceQty : 0;

    const results = validateInvoiceThreeWay({
      purchaseOrderKey: invoice.purchaseOrderKey ?? undefined,
      receiptKey: invoice.receiptKey ?? undefined,
      poQuantity: ctx?.poQuantity,
      receiptQuantity: ctx?.receiptQuantity,
      invoiceQuantity: invoiceQty,
      poUnitPrice: ctx?.poUnitPrice ?? avgPrice,
      invoiceUnitPrice: avgPrice,
      poTaxAmount: ctx?.poTaxAmount ?? invoice.taxAmount,
      invoiceTaxAmount: invoice.taxAmount,
      poDiscountAmount: ctx?.poDiscountAmount ?? invoice.discountAmount,
      invoiceDiscountAmount: invoice.discountAmount,
    }, tolerances);

    await this.prisma.efmApInvoiceValidation.deleteMany({ where: { invoiceId: invoice.id } });

    let seq = await this.prisma.efmApInvoiceValidation.count({ where: { organizationId } });
    for (const r of results) {
      seq += 1;
      await this.prisma.efmApInvoiceValidation.create({
        data: {
          organizationId,
          validationKey: generateApKey('APVAL', seq),
          invoiceId: invoice.id,
          invoiceKey,
          validationType: r.validationType,
          expectedValue: r.expectedValue,
          actualValue: r.actualValue,
          tolerancePercent: r.tolerancePercent,
          passed: r.passed,
        },
      });
    }

    const allPassed = results.every((r) => r.passed);
    const status = allPassed ? 'approved' : 'validation_exception';
    const updated = await this.prisma.efmApInvoice.update({
      where: { id: invoice.id },
      data: {
        status: allPassed ? 'approved' : 'validation_exception',
        validationStatus: allPassed ? 'passed' : 'failed',
        validationErrors: results.filter((r) => !r.passed).map((r) => r.message),
        validatedAt: new Date(),
        approvedAt: allPassed ? new Date() : undefined,
        approvedBy: allPassed ? userId : undefined,
      },
      include: { lines: true, validations: true },
    });

    await this.audit.log(organizationId, 'EfmApInvoice', invoiceKey, 'validated', userId, { allPassed });

    if (allPassed && ctx?.autoPost !== false) {
      return this.post(organizationId, invoiceKey, userId);
    }
    return updated;
  }

  async approveException(organizationId: string, invoiceKey: string, userId: string, justification: string) {
    const invoice = await this.getOne(organizationId, invoiceKey);
    if (!invoice) throw new NotFoundException(`Factura ${invoiceKey} no encontrada`);
    if (invoice.status !== 'validation_exception') {
      throw new BadRequestException('Factura no requiere excepción');
    }

    await this.prisma.efmApInvoiceValidation.updateMany({
      where: { invoiceId: invoice.id, passed: false },
      data: { exceptionApproved: true, approvedBy: userId, approvedAt: new Date(), justification },
    });

    const updated = await this.prisma.efmApInvoice.update({
      where: { id: invoice.id },
      data: {
        status: 'approved',
        validationStatus: 'exception_approved',
        approvedAt: new Date(),
        approvedBy: userId,
        toleranceExceptions: [{ approvedBy: userId, justification, at: new Date().toISOString() }],
      },
      include: { lines: true, validations: true },
    });

    await this.audit.log(organizationId, 'EfmApInvoice', invoiceKey, 'exception_approved', userId, { justification });
    return this.post(organizationId, invoiceKey, userId);
  }

  async post(organizationId: string, invoiceKey: string, userId: string) {
    const invoice = await this.getOne(organizationId, invoiceKey);
    if (!invoice) throw new NotFoundException(`Factura ${invoiceKey} no encontrada`);
    if (!['approved', 'posted'].includes(invoice.status)) {
      throw new BadRequestException(`Factura ${invoiceKey} debe estar aprobada para contabilizar`);
    }
    if (invoice.status === 'posted' && invoice.accountingRef) return invoice;

    const supplier = await this.prisma.efmApSupplierProfile.findFirst({
      where: { organizationId, supplierKey: invoice.supplierKey },
    });
    if (supplier?.paymentBlocked) throw new BadRequestException('Proveedor con pagos bloqueados');

    let accountingRef = invoice.accountingRef;
    if (!accountingRef) {
      try {
        const entry = await this.engine.generateFromEvent(organizationId, EVENT_TYPES.EFM_AP_INVOICE_POSTED, {
          invoiceKey,
          supplierKey: invoice.supplierKey,
          amount: invoice.totalAmount,
          sourceModule: 'purchase',
          settlementKey: invoice.sourceDocumentKey,
        }, userId);
        if (entry && typeof entry === 'object' && 'entryKey' in entry) {
          accountingRef = String(entry.entryKey);
        }
      } catch {
        const entry = await this.engine.createEntry(organizationId, userId, {
          sourceModule: 'purchase',
          sourceDocumentType: 'ap_invoice',
          sourceDocumentKey: invoiceKey,
          description: `CxP ${invoice.supplierInvoiceNumber ?? invoiceKey}`,
          entryDate: invoice.issueDate.toISOString().slice(0, 10),
          lines: [
            { accountKey: 'ACC-1435', debit: invoice.subtotal, credit: 0 },
            { accountKey: 'ACC-2408', debit: invoice.taxAmount, credit: 0 },
            { accountKey: 'ACC-2205', debit: 0, credit: invoice.totalAmount },
          ],
          autoPost: true,
        });
        accountingRef = entry.entryKey;
      }
    }

    const payableCount = await this.prisma.efmApPayable.count({ where: { organizationId } });
    const payableKey = generateApKey('APPAY', payableCount + 1);
    const daysPastDue = computeDaysPastDue(invoice.dueDate);

    await this.prisma.efmApPayable.upsert({
      where: { organizationId_invoiceId: { organizationId, invoiceId: invoice.id } },
      update: {
        originalAmount: invoice.totalAmount,
        balanceAmount: invoice.balanceAmount,
        dueDate: invoice.dueDate,
        daysPastDue,
        status: resolvePayableStatus(invoice.balanceAmount, invoice.totalAmount, daysPastDue, false) as never,
        accountingRef,
      },
      create: {
        organizationId,
        payableKey,
        supplierKey: invoice.supplierKey,
        invoiceId: invoice.id,
        invoiceKey,
        currencyKey: invoice.currencyKey,
        originalAmount: invoice.totalAmount,
        balanceAmount: invoice.balanceAmount,
        dueDate: invoice.dueDate,
        daysPastDue,
        status: resolvePayableStatus(invoice.balanceAmount, invoice.totalAmount, daysPastDue, false) as never,
        accountingRef,
      },
    });

    const updated = await this.prisma.efmApInvoice.update({
      where: { id: invoice.id },
      data: {
        status: 'posted',
        postedAt: new Date(),
        accountingRef,
      },
      include: { lines: true, payables: true, validations: true },
    });

    await this.audit.log(organizationId, 'EfmApInvoice', invoiceKey, 'posted', userId, { accountingRef });
    await this.core.emitUserAction(organizationId, 'EfmApInvoice', updated.id, EVENT_TYPES.EFM_AP_INVOICE_POSTED, {
      invoiceKey,
      accountingRef,
    });
    return updated;
  }

  async registerCreditNote(
    organizationId: string,
    userId: string,
    input: { relatedInvoiceKey: string; amount: number; reason: string; supplierKey: string },
  ) {
    const related = await this.getOne(organizationId, input.relatedInvoiceKey);
    if (!related) throw new NotFoundException(`Factura origen ${input.relatedInvoiceKey} no encontrada`);

    const inv = await this.register(organizationId, userId, {
      supplierKey: input.supplierKey,
      invoiceType: 'credit_note',
      relatedInvoiceKey: input.relatedInvoiceKey,
      issueDate: new Date().toISOString().slice(0, 10),
      lines: [{ description: input.reason, quantity: 1, unitPrice: -Math.abs(input.amount), taxAmount: 0 }],
      autoValidate: true,
      autoPost: false,
    }) as { id: string; invoiceKey: string };

    await this.prisma.efmApInvoice.update({
      where: { id: inv.id },
      data: {
        totalAmount: -Math.abs(input.amount),
        balanceAmount: 0,
        creditNoteApplied: Math.abs(input.amount),
        status: 'posted',
      },
    });

    await this.prisma.efmApInvoice.update({
      where: { organizationId_invoiceKey: { organizationId, invoiceKey: input.relatedInvoiceKey } },
      data: {
        creditNoteApplied: { increment: Math.abs(input.amount) },
        balanceAmount: { decrement: Math.abs(input.amount) },
      },
    });

    const payable = await this.prisma.efmApPayable.findFirst({
      where: { organizationId, invoiceKey: input.relatedInvoiceKey },
    });
    if (payable) {
      await this.prisma.efmApPayable.update({
        where: { id: payable.id },
        data: {
          balanceAmount: { decrement: Math.abs(input.amount) },
          status: payable.balanceAmount - Math.abs(input.amount) <= 0.01 ? 'paid' : 'partial',
        },
      });
    }

    await this.audit.log(organizationId, 'EfmApInvoice', input.relatedInvoiceKey, 'credit_note_applied', userId, {
      amount: input.amount,
    });
    return inv;
  }

  async registerDebitNote(
    organizationId: string,
    userId: string,
    input: { relatedInvoiceKey: string; amount: number; reason: string; supplierKey: string },
  ) {
    const related = await this.getOne(organizationId, input.relatedInvoiceKey);
    if (!related) throw new NotFoundException(`Factura origen ${input.relatedInvoiceKey} no encontrada`);

    const inv = await this.register(organizationId, userId, {
      supplierKey: input.supplierKey,
      invoiceType: 'debit_note',
      relatedInvoiceKey: input.relatedInvoiceKey,
      issueDate: new Date().toISOString().slice(0, 10),
      lines: [{ description: input.reason, quantity: 1, unitPrice: Math.abs(input.amount), taxAmount: 0 }],
      autoValidate: true,
    });

    await this.prisma.efmApInvoice.update({
      where: { organizationId_invoiceKey: { organizationId, invoiceKey: input.relatedInvoiceKey } },
      data: {
        debitNoteApplied: { increment: Math.abs(input.amount) },
        balanceAmount: { increment: Math.abs(input.amount) },
        totalAmount: { increment: Math.abs(input.amount) },
      },
    });

    const payable = await this.prisma.efmApPayable.findFirst({
      where: { organizationId, invoiceKey: input.relatedInvoiceKey },
    });
    if (payable) {
      await this.prisma.efmApPayable.update({
        where: { id: payable.id },
        data: {
          balanceAmount: { increment: Math.abs(input.amount) },
          originalAmount: { increment: Math.abs(input.amount) },
          status: 'open',
        },
      });
    }

    await this.audit.log(organizationId, 'EfmApInvoice', input.relatedInvoiceKey, 'debit_note_applied', userId, {
      amount: input.amount,
    });
    return inv;
  }

  private async getTolerances(organizationId: string): Promise<ApToleranceConfig> {
    const param = await this.parameters.get(organizationId, 'ap_validation_tolerances');
    if (param?.value && typeof param.value === 'object') {
      return { ...DEFAULT_AP_TOLERANCES, ...(param.value as ApToleranceConfig) };
    }
    return DEFAULT_AP_TOLERANCES;
  }
}
