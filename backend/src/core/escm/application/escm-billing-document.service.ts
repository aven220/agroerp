import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EscmAuditService } from './escm-audit.service';
import { generateBillingDocumentKey } from '../domain/escm-billing.engine';

@Injectable()
export class EscmBillingDocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EscmAuditService,
  ) {}

  list(organizationId: string, filters?: { documentType?: string; referenceKey?: string }) {
    return this.prisma.escmBillingDocument.findMany({
      where: {
        organizationId,
        ...(filters?.documentType ? { documentType: filters.documentType } : {}),
        ...(filters?.referenceKey ? { referenceKey: filters.referenceKey } : {}),
      },
      orderBy: { generatedAt: 'desc' },
      take: 300,
    });
  }

  async generateForInvoice(organizationId: string, userId: string, invoiceKey: string) {
    const invoice = await this.prisma.escmInvoice.findFirst({
      where: { organizationId, invoiceKey },
      include: { lines: true, taxLines: true, customer: true },
    });
    if (!invoice) throw new NotFoundException(`Factura ${invoiceKey} no encontrada`);

    const count = await this.prisma.escmBillingDocument.count({ where: { organizationId } });
    const documentKey = generateBillingDocumentKey('INV', count + 1);
    const content = {
      invoiceKey,
      status: invoice.status,
      invoiceType: invoice.invoiceType,
      customerKey: invoice.customerKey,
      customerName: invoice.customer.legalName,
      currencyKey: invoice.currencyKey,
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      withholdingAmount: invoice.withholdingAmount,
      totalAmount: invoice.totalAmount,
      lines: invoice.lines,
      taxLines: invoice.taxLines,
      issuedAt: invoice.issuedAt?.toISOString(),
      accountingRef: invoice.accountingRef,
      eInvoiceRef: invoice.eInvoiceRef,
    };

    const doc = await this.prisma.escmBillingDocument.create({
      data: {
        organizationId,
        documentKey,
        documentType: 'invoice',
        referenceKey: invoiceKey,
        customerKey: invoice.customerKey,
        content,
        accountingRef: invoice.accountingRef,
        eInvoiceRef: invoice.eInvoiceRef,
        generatedBy: userId,
      },
    });

    await this.prisma.escmInvoice.update({
      where: { id: invoice.id },
      data: { documentKey },
    });

    await this.audit.log(organizationId, 'BillingDocument', documentKey, 'generated', userId, {
      invoiceKey,
      documentType: 'invoice',
    });
    return doc;
  }

  async generateForCreditNote(organizationId: string, userId: string, creditNoteKey: string) {
    const note = await this.prisma.escmCreditNote.findFirst({
      where: { organizationId, creditNoteKey },
      include: { lines: true },
    });
    if (!note) throw new NotFoundException(`Nota crédito ${creditNoteKey} no encontrada`);

    const count = await this.prisma.escmBillingDocument.count({ where: { organizationId } });
    const documentKey = generateBillingDocumentKey('CN', count + 1);
    const doc = await this.prisma.escmBillingDocument.create({
      data: {
        organizationId,
        documentKey,
        documentType: 'credit_note',
        referenceKey: creditNoteKey,
        customerKey: note.customerKey,
        content: { ...note, creditNoteKey },
        accountingRef: note.accountingRef,
        eInvoiceRef: note.eInvoiceRef,
        generatedBy: userId,
      },
    });

    await this.prisma.escmCreditNote.update({
      where: { id: note.id },
      data: { documentKey },
    });

    await this.audit.log(organizationId, 'BillingDocument', documentKey, 'generated', userId, {
      creditNoteKey,
      documentType: 'credit_note',
    });
    return doc;
  }

  async generateForDebitNote(organizationId: string, userId: string, debitNoteKey: string) {
    const note = await this.prisma.escmDebitNote.findFirst({
      where: { organizationId, debitNoteKey },
      include: { lines: true },
    });
    if (!note) throw new NotFoundException(`Nota débito ${debitNoteKey} no encontrada`);

    const count = await this.prisma.escmBillingDocument.count({ where: { organizationId } });
    const documentKey = generateBillingDocumentKey('DN', count + 1);
    const doc = await this.prisma.escmBillingDocument.create({
      data: {
        organizationId,
        documentKey,
        documentType: 'debit_note',
        referenceKey: debitNoteKey,
        customerKey: note.customerKey,
        content: { ...note, debitNoteKey },
        accountingRef: note.accountingRef,
        eInvoiceRef: note.eInvoiceRef,
        generatedBy: userId,
      },
    });

    await this.prisma.escmDebitNote.update({
      where: { id: note.id },
      data: { documentKey },
    });

    await this.audit.log(organizationId, 'BillingDocument', documentKey, 'generated', userId, {
      debitNoteKey,
      documentType: 'debit_note',
    });
    return doc;
  }
}
