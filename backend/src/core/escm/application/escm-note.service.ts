import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EscmAuditService } from './escm-audit.service';
import { EscmBillingDocumentService } from './escm-billing-document.service';
import { EscmReceivableService } from './escm-receivable.service';
import {
  generateCreditNoteKey,
  generateDebitNoteKey,
} from '../domain/escm-billing.engine';

type NoteLineInput = {
  itemKey: string;
  quantity: number;
  unitPrice: number;
  taxAmount?: number;
};

@Injectable()
export class EscmNoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EscmAuditService,
    private readonly documents: EscmBillingDocumentService,
    private readonly receivables: EscmReceivableService,
  ) {}

  listCreditNotes(organizationId: string, filters?: { status?: string; customerKey?: string }) {
    return this.prisma.escmCreditNote.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.customerKey ? { customerKey: filters.customerKey } : {}),
      },
      include: { _count: { select: { lines: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  listDebitNotes(organizationId: string, filters?: { status?: string; customerKey?: string }) {
    return this.prisma.escmDebitNote.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.customerKey ? { customerKey: filters.customerKey } : {}),
      },
      include: { _count: { select: { lines: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async getCreditNote(organizationId: string, creditNoteKey: string) {
    const row = await this.prisma.escmCreditNote.findFirst({
      where: { organizationId, creditNoteKey },
      include: { lines: true, invoice: true, return: true },
    });
    if (!row) throw new NotFoundException(`Nota crédito ${creditNoteKey} no encontrada`);
    return row;
  }

  async getDebitNote(organizationId: string, debitNoteKey: string) {
    const row = await this.prisma.escmDebitNote.findFirst({
      where: { organizationId, debitNoteKey },
      include: { lines: true, invoice: true },
    });
    if (!row) throw new NotFoundException(`Nota débito ${debitNoteKey} no encontrada`);
    return row;
  }

  private computeNoteTotals(lines: NoteLineInput[]) {
    let subtotal = 0;
    let taxAmount = 0;
    for (const line of lines) {
      const gross = line.quantity * line.unitPrice;
      const tax = line.taxAmount ?? 0;
      subtotal += gross;
      taxAmount += tax;
    }
    return {
      subtotal: Number(subtotal.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      totalAmount: Number((subtotal + taxAmount).toFixed(2)),
    };
  }

  async createCreditNote(
    organizationId: string,
    userId: string,
    input: {
      customerKey: string;
      invoiceKey?: string;
      returnKey?: string;
      reason: string;
      lines: NoteLineInput[];
    },
  ) {
    if (!input.lines?.length) throw new BadRequestException('Líneas requeridas');
    if (!input.reason?.trim()) throw new BadRequestException('Motivo requerido');

    let invoiceId: string | undefined;
    let invoiceKey: string | undefined;
    let returnId: string | undefined;

    if (input.invoiceKey) {
      const inv = await this.prisma.escmInvoice.findFirst({
        where: { organizationId, invoiceKey: input.invoiceKey },
      });
      if (!inv) throw new NotFoundException(`Factura ${input.invoiceKey} no encontrada`);
      invoiceId = inv.id;
      invoiceKey = inv.invoiceKey;
    }
    if (input.returnKey) {
      const ret = await this.prisma.escmReturn.findFirst({
        where: { organizationId, returnKey: input.returnKey },
      });
      if (!ret) throw new NotFoundException(`Devolución ${input.returnKey} no encontrada`);
      returnId = ret.id;
    }

    const totals = this.computeNoteTotals(input.lines);
    const count = await this.prisma.escmCreditNote.count({ where: { organizationId } });
    const creditNoteKey = generateCreditNoteKey(count + 1);

    const row = await this.prisma.escmCreditNote.create({
      data: {
        organizationId,
        creditNoteKey,
        status: 'draft',
        invoiceId,
        invoiceKey,
        returnId,
        customerKey: input.customerKey,
        reason: input.reason,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        createdBy: userId,
        lines: {
          create: input.lines.map((l) => ({
            itemKey: l.itemKey,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            taxAmount: l.taxAmount ?? 0,
            lineTotal: Number((l.quantity * l.unitPrice + (l.taxAmount ?? 0)).toFixed(2)),
          })),
        },
      },
      include: { lines: true },
    });

    await this.audit.log(organizationId, 'CreditNote', creditNoteKey, 'created', userId);
    await this.core.emitUserAction(organizationId, 'EscmCreditNote', row.id, EVENT_TYPES.ESCM_CREDIT_NOTE_CREATED, {
      creditNoteKey,
    });
    return row;
  }

  async createFromReturn(organizationId: string, userId: string, returnKey: string) {
    const ret = await this.prisma.escmReturn.findFirst({
      where: { organizationId, returnKey },
      include: { lines: true, invoice: { include: { lines: true } } },
    });
    if (!ret) throw new NotFoundException(`Devolución ${returnKey} no encontrada`);

    const noteLines: NoteLineInput[] = ret.lines.map((rl) => {
      const invLine = ret.invoice?.lines.find((il) => il.itemKey === rl.itemKey);
      const unitPrice = invLine ? invLine.lineSubtotal / invLine.quantity : 0;
      const taxAmount = invLine ? (invLine.taxAmount / invLine.quantity) * rl.quantity : 0;
      return {
        itemKey: rl.itemKey,
        quantity: rl.quantity,
        unitPrice,
        taxAmount,
      };
    });

    return this.createCreditNote(organizationId, userId, {
      customerKey: ret.customerKey,
      invoiceKey: ret.invoiceKey ?? undefined,
      returnKey,
      reason: `Nota crédito por devolución ${returnKey}: ${ret.reason}`,
      lines: noteLines,
    });
  }

  async issueCreditNote(organizationId: string, userId: string, creditNoteKey: string) {
    const note = await this.getCreditNote(organizationId, creditNoteKey);
    if (note.status !== 'draft') throw new BadRequestException('Nota crédito ya emitida');

    const updated = await this.prisma.escmCreditNote.update({
      where: { id: note.id },
      data: { status: 'issued', issuedAt: new Date() },
      include: { lines: true },
    });

    await this.documents.generateForCreditNote(organizationId, userId, creditNoteKey);

    if (note.invoiceKey) {
      await this.receivables.applyCreditNote(organizationId, userId, note.invoiceKey, creditNoteKey, updated.totalAmount);
    }

    await this.audit.log(organizationId, 'CreditNote', creditNoteKey, 'issued', userId);
    await this.core.emitUserAction(organizationId, 'EscmCreditNote', updated.id, EVENT_TYPES.ESCM_CREDIT_NOTE_ISSUED, {
      creditNoteKey,
      totalAmount: updated.totalAmount,
    });
    return updated;
  }

  async createDebitNote(
    organizationId: string,
    userId: string,
    input: {
      customerKey: string;
      invoiceKey?: string;
      reason: string;
      lines: NoteLineInput[];
    },
  ) {
    if (!input.lines?.length) throw new BadRequestException('Líneas requeridas');

    let invoiceId: string | undefined;
    let invoiceKey: string | undefined;
    if (input.invoiceKey) {
      const inv = await this.prisma.escmInvoice.findFirst({
        where: { organizationId, invoiceKey: input.invoiceKey },
      });
      if (!inv) throw new NotFoundException(`Factura ${input.invoiceKey} no encontrada`);
      invoiceId = inv.id;
      invoiceKey = inv.invoiceKey;
    }

    const totals = this.computeNoteTotals(input.lines);
    const count = await this.prisma.escmDebitNote.count({ where: { organizationId } });
    const debitNoteKey = generateDebitNoteKey(count + 1);

    const row = await this.prisma.escmDebitNote.create({
      data: {
        organizationId,
        debitNoteKey,
        status: 'draft',
        invoiceId,
        customerKey: input.customerKey,
        reason: input.reason,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        createdBy: userId,
        lines: {
          create: input.lines.map((l) => ({
            itemKey: l.itemKey,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            taxAmount: l.taxAmount ?? 0,
            lineTotal: Number((l.quantity * l.unitPrice + (l.taxAmount ?? 0)).toFixed(2)),
          })),
        },
      },
      include: { lines: true },
    });

    await this.audit.log(organizationId, 'DebitNote', debitNoteKey, 'created', userId);
    await this.core.emitUserAction(organizationId, 'EscmDebitNote', row.id, EVENT_TYPES.ESCM_DEBIT_NOTE_CREATED, {
      debitNoteKey,
    });
    return row;
  }

  async issueDebitNote(organizationId: string, userId: string, debitNoteKey: string) {
    const note = await this.getDebitNote(organizationId, debitNoteKey);
    if (note.status !== 'draft') throw new BadRequestException('Nota débito ya emitida');

    const updated = await this.prisma.escmDebitNote.update({
      where: { id: note.id },
      data: { status: 'issued', issuedAt: new Date() },
      include: { lines: true },
    });

    await this.documents.generateForDebitNote(organizationId, userId, debitNoteKey);

    if (note.invoice?.invoiceKey) {
      await this.receivables.applyDebitNote(organizationId, userId, note.invoice.invoiceKey, debitNoteKey, updated.totalAmount);
    }

    await this.audit.log(organizationId, 'DebitNote', debitNoteKey, 'issued', userId);
    await this.core.emitUserAction(organizationId, 'EscmDebitNote', updated.id, EVENT_TYPES.ESCM_DEBIT_NOTE_ISSUED, {
      debitNoteKey,
      totalAmount: updated.totalAmount,
    });
    return updated;
  }
}
