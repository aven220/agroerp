import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EscmAuditService } from './escm-audit.service';
import {
  classifyRisk,
  computeDaysPastDue,
  computeDueDate,
  DEFAULT_PAYMENT_TERM_DAYS,
  generateReceivableKey,
  resolveReceivableStatus,
} from '../domain/escm-ar.engine';

@Injectable()
export class EscmReceivableService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EscmAuditService,
  ) {}

  list(
    organizationId: string,
    filters?: { status?: string; customerKey?: string; overdue?: boolean },
  ) {
    return this.prisma.escmReceivable.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.customerKey ? { customerKey: filters.customerKey } : {}),
        ...(filters?.overdue ? { status: 'overdue' } : {}),
      },
      include: { invoice: { select: { invoiceKey: true, totalAmount: true, issuedAt: true } } },
      orderBy: { dueDate: 'asc' },
      take: 500,
    });
  }

  async getOne(organizationId: string, receivableKey: string) {
    const row = await this.prisma.escmReceivable.findFirst({
      where: { organizationId, receivableKey },
      include: {
        invoice: true,
        allocations: { include: { payment: true } },
        promises: true,
        escalations: { orderBy: { escalatedAt: 'desc' } },
      },
    });
    if (!row) throw new NotFoundException(`Cartera ${receivableKey} no encontrada`);
    return row;
  }

  async createFromInvoice(
    organizationId: string,
    userId: string,
    invoice: {
      id: string;
      invoiceKey: string;
      customerId: string;
      customerKey: string;
      currencyKey: string;
      totalAmount: number;
      issuedAt: Date | null;
    },
    paymentTermDays = DEFAULT_PAYMENT_TERM_DAYS,
  ) {
    const existing = await this.prisma.escmReceivable.findUnique({
      where: { invoiceId: invoice.id },
    });
    if (existing) return existing;

    const issuedAt = invoice.issuedAt ?? new Date();
    const dueDate = computeDueDate(issuedAt, paymentTermDays);
    const count = await this.prisma.escmReceivable.count({ where: { organizationId } });
    const receivableKey = generateReceivableKey(count + 1);

    const row = await this.prisma.escmReceivable.create({
      data: {
        organizationId,
        receivableKey,
        status: 'open',
        customerId: invoice.customerId,
        customerKey: invoice.customerKey,
        invoiceId: invoice.id,
        invoiceKey: invoice.invoiceKey,
        currencyKey: invoice.currencyKey,
        originalAmount: invoice.totalAmount,
        balanceAmount: invoice.totalAmount,
        paidAmount: 0,
        dueDate,
        issuedAt,
        daysPastDue: 0,
        riskClass: 'low',
      },
    });

    await this.audit.log(organizationId, 'Receivable', receivableKey, 'created', userId, {
      invoiceKey: invoice.invoiceKey,
    });
    await this.core.emitUserAction(organizationId, 'EscmReceivable', row.id, EVENT_TYPES.ESCM_RECEIVABLE_CREATED, {
      receivableKey,
      invoiceKey: invoice.invoiceKey,
    });
    return row;
  }

  async applyCreditNote(
    organizationId: string,
    userId: string,
    invoiceKey: string,
    creditNoteKey: string,
    amount: number,
  ) {
    const receivable = await this.prisma.escmReceivable.findFirst({
      where: { organizationId, invoiceKey },
    });
    if (!receivable) throw new NotFoundException(`Cartera para factura ${invoiceKey} no encontrada`);

    const newBalance = Math.max(0, receivable.balanceAmount - amount);
    const newCredit = receivable.creditNoteApplied + amount;
    const daysPastDue = computeDaysPastDue(receivable.dueDate);
    const status = resolveReceivableStatus(newBalance, daysPastDue);

    const updated = await this.prisma.escmReceivable.update({
      where: { id: receivable.id },
      data: {
        balanceAmount: newBalance,
        creditNoteApplied: newCredit,
        status: status as never,
        riskClass: classifyRisk(daysPastDue, newBalance) as never,
      },
    });

    await this.audit.log(organizationId, 'Receivable', receivable.receivableKey, 'credit_applied', userId, {
      creditNoteKey,
      amount,
    });
    return updated;
  }

  async applyDebitNote(
    organizationId: string,
    userId: string,
    invoiceKey: string,
    debitNoteKey: string,
    amount: number,
  ) {
    const receivable = await this.prisma.escmReceivable.findFirst({
      where: { organizationId, invoiceKey },
    });
    if (!receivable) throw new NotFoundException(`Cartera para factura ${invoiceKey} no encontrada`);

    const newBalance = receivable.balanceAmount + amount;
    const updated = await this.prisma.escmReceivable.update({
      where: { id: receivable.id },
      data: {
        balanceAmount: newBalance,
        debitNoteApplied: receivable.debitNoteApplied + amount,
        status: 'open',
        riskClass: classifyRisk(computeDaysPastDue(receivable.dueDate), newBalance) as never,
      },
    });

    await this.audit.log(organizationId, 'Receivable', receivable.receivableKey, 'debit_applied', userId, {
      debitNoteKey,
      amount,
    });
    return updated;
  }

  async applyPaymentAllocation(
    organizationId: string,
    receivableKey: string,
    amount: number,
  ) {
    const receivable = await this.getOne(organizationId, receivableKey);
    if (receivable.balanceAmount < amount) {
      throw new BadRequestException(`Monto excede saldo en ${receivableKey}`);
    }

    const newPaid = receivable.paidAmount + amount;
    const newBalance = Number((receivable.balanceAmount - amount).toFixed(2));
    const daysPastDue = computeDaysPastDue(receivable.dueDate);
    const status = newBalance <= 0 ? 'paid' : newPaid > 0 ? 'partial' : resolveReceivableStatus(newBalance, daysPastDue);

    return this.prisma.escmReceivable.update({
      where: { id: receivable.id },
      data: {
        paidAmount: newPaid,
        balanceAmount: newBalance,
        status: status as never,
        lastPaymentAt: new Date(),
        daysPastDue,
        riskClass: classifyRisk(daysPastDue, newBalance) as never,
      },
    });
  }

  async reversePaymentAllocation(organizationId: string, receivableKey: string, amount: number) {
    const receivable = await this.getOne(organizationId, receivableKey);
    const newPaid = Math.max(0, receivable.paidAmount - amount);
    const newBalance = Number((receivable.balanceAmount + amount).toFixed(2));
    const daysPastDue = computeDaysPastDue(receivable.dueDate);
    const status = resolveReceivableStatus(newBalance, daysPastDue);

    return this.prisma.escmReceivable.update({
      where: { id: receivable.id },
      data: {
        paidAmount: newPaid,
        balanceAmount: newBalance,
        status: status as never,
        daysPastDue,
        riskClass: classifyRisk(daysPastDue, newBalance) as never,
      },
    });
  }

  async cancelForVoidedInvoice(organizationId: string, userId: string, invoiceKey: string) {
    const receivable = await this.prisma.escmReceivable.findFirst({
      where: { organizationId, invoiceKey },
    });
    if (!receivable) return null;
    if (receivable.paidAmount > 0) {
      throw new BadRequestException(`Cartera ${receivable.receivableKey} tiene pagos aplicados`);
    }

    const updated = await this.prisma.escmReceivable.update({
      where: { id: receivable.id },
      data: { status: 'cancelled', balanceAmount: 0 },
    });

    await this.audit.log(organizationId, 'Receivable', receivable.receivableKey, 'cancelled', userId, {
      invoiceKey,
    });
    return updated;
  }

  async refreshAging(organizationId: string) {
    const open = await this.prisma.escmReceivable.findMany({
      where: {
        organizationId,
        status: { in: ['open', 'partial', 'overdue'] },
      },
    });

    let updated = 0;
    for (const r of open) {
      const daysPastDue = computeDaysPastDue(r.dueDate);
      const status = resolveReceivableStatus(r.balanceAmount, daysPastDue);
      await this.prisma.escmReceivable.update({
        where: { id: r.id },
        data: {
          daysPastDue,
          status: status as never,
          riskClass: classifyRisk(daysPastDue, r.balanceAmount) as never,
        },
      });
      updated += 1;
    }
    return { updated };
  }

  async customerBalance(organizationId: string, customerKey: string) {
    const receivables = await this.prisma.escmReceivable.findMany({
      where: { organizationId, customerKey, status: { notIn: ['cancelled', 'paid'] } },
    });
    const advances = await this.prisma.escmAdvance.findMany({
      where: { organizationId, customerKey, status: 'open' },
    });
    const payments = await this.prisma.escmPayment.findMany({
      where: { organizationId, customerKey, status: 'confirmed' },
      orderBy: { receivedAt: 'desc' },
      take: 20,
    });

    const totalReceivable = receivables.reduce((s, r) => s + r.balanceAmount, 0);
    const overdueAmount = receivables
      .filter((r) => r.status === 'overdue')
      .reduce((s, r) => s + r.balanceAmount, 0);
    const advanceBalance = advances.reduce((s, a) => s + a.balanceAmount, 0);

    return {
      customerKey,
      totalReceivable: Number(totalReceivable.toFixed(2)),
      overdueAmount: Number(overdueAmount.toFixed(2)),
      advanceBalance: Number(advanceBalance.toFixed(2)),
      creditBalance: Number(advanceBalance.toFixed(2)),
      receivableCount: receivables.length,
      receivables,
      advances,
      recentPayments: payments,
    };
  }
}
