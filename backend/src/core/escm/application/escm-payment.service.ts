import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EscmAuditService } from './escm-audit.service';
import { EscmReceivableService } from './escm-receivable.service';
import {
  autoAllocatePayment,
  canConfirmPayment,
  canVoidPayment,
  generateAdvanceKey,
  generatePaymentKey,
} from '../domain/escm-ar.engine';

type AllocationInput = {
  receivableKey?: string;
  invoiceKey?: string;
  amount: number;
  allocationType?: string;
};

@Injectable()
export class EscmPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EscmAuditService,
    private readonly receivables: EscmReceivableService,
  ) {}

  list(organizationId: string, filters?: { status?: string; customerKey?: string; paymentMethod?: string }) {
    return this.prisma.escmPayment.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.customerKey ? { customerKey: filters.customerKey } : {}),
        ...(filters?.paymentMethod ? { paymentMethod: filters.paymentMethod as never } : {}),
      },
      include: { _count: { select: { allocations: true } } },
      orderBy: { receivedAt: 'desc' },
      take: 500,
    });
  }

  async getOne(organizationId: string, paymentKey: string) {
    const row = await this.prisma.escmPayment.findFirst({
      where: { organizationId, paymentKey },
      include: { allocations: true, customer: true, advance: true },
    });
    if (!row) throw new NotFoundException(`Pago ${paymentKey} no encontrado`);
    return row;
  }

  async register(
    organizationId: string,
    userId: string,
    input: {
      customerKey: string;
      paymentMethod: string;
      amount: number;
      referenceNumber?: string;
      bankRef?: string;
      receivedAt?: string;
      notes?: string;
      supportUrls?: string[];
      asAdvance?: boolean;
      autoApply?: boolean;
      allocations?: AllocationInput[];
    },
  ) {
    if (!input.amount || input.amount <= 0) throw new BadRequestException('Monto inválido');

    const customer = await this.prisma.escmCustomer.findFirst({
      where: { organizationId, customerKey: input.customerKey, deletedAt: null },
    });
    if (!customer) throw new NotFoundException(`Cliente ${input.customerKey} no encontrado`);

    const count = await this.prisma.escmPayment.count({ where: { organizationId } });
    const paymentKey = generatePaymentKey(count + 1);

    const payment = await this.prisma.escmPayment.create({
      data: {
        organizationId,
        paymentKey,
        status: 'draft',
        paymentMethod: input.paymentMethod as never,
        customerId: customer.id,
        customerKey: customer.customerKey,
        amount: input.amount,
        unappliedAmount: input.amount,
        referenceNumber: input.referenceNumber,
        bankRef: input.bankRef,
        receivedAt: input.receivedAt ? new Date(input.receivedAt) : new Date(),
        notes: input.notes,
        supportUrls: (input.supportUrls ?? []) as object,
        createdBy: userId,
      },
    });

    if (input.asAdvance) {
      const advCount = await this.prisma.escmAdvance.count({ where: { organizationId } });
      await this.prisma.escmAdvance.create({
        data: {
          organizationId,
          advanceKey: generateAdvanceKey(advCount + 1),
          customerId: customer.id,
          customerKey: customer.customerKey,
          paymentId: payment.id,
          amount: input.amount,
          balanceAmount: input.amount,
          createdBy: userId,
        },
      });
    }

    await this.audit.log(organizationId, 'Payment', paymentKey, 'registered', userId, {
      amount: input.amount,
      paymentMethod: input.paymentMethod,
    });
    await this.core.emitUserAction(organizationId, 'EscmPayment', payment.id, EVENT_TYPES.ESCM_PAYMENT_REGISTERED, {
      paymentKey,
    });

    if (input.autoApply !== false && !input.asAdvance) {
      return this.confirm(organizationId, userId, paymentKey, { autoApply: true, allocations: input.allocations });
    }

    return this.getOne(organizationId, paymentKey);
  }

  async confirm(
    organizationId: string,
    userId: string,
    paymentKey: string,
    input?: { autoApply?: boolean; allocations?: AllocationInput[] },
  ) {
    const payment = await this.getOne(organizationId, paymentKey);
    if (!canConfirmPayment(payment.status)) {
      throw new BadRequestException(`Pago ${paymentKey} no puede confirmarse (${payment.status})`);
    }

    let allocations = input?.allocations ?? [];
    if (!allocations.length && input?.autoApply !== false) {
      const openReceivables = await this.prisma.escmReceivable.findMany({
        where: {
          organizationId,
          customerKey: payment.customerKey,
          status: { in: ['open', 'partial', 'overdue'] },
        },
        orderBy: { dueDate: 'asc' },
      });
      allocations = autoAllocatePayment(
        payment.amount,
        openReceivables.map((r) => ({
          receivableKey: r.receivableKey,
          invoiceKey: r.invoiceKey,
          balanceAmount: r.balanceAmount,
          dueDate: r.dueDate,
          daysPastDue: r.daysPastDue,
        })),
      ).map((a) => ({ ...a, allocationType: 'invoice' }));
    }

    let appliedTotal = 0;
    for (const alloc of allocations) {
      let receivableKey = alloc.receivableKey;
      if (!receivableKey && alloc.invoiceKey) {
        const r = await this.prisma.escmReceivable.findFirst({
          where: { organizationId, invoiceKey: alloc.invoiceKey },
        });
        receivableKey = r?.receivableKey;
      }
      if (!receivableKey) continue;

      const receivable = await this.receivables.getOne(organizationId, receivableKey);
      await this.receivables.applyPaymentAllocation(organizationId, receivableKey, alloc.amount);

      await this.prisma.escmPaymentAllocation.create({
        data: {
          paymentId: payment.id,
          receivableId: receivable.id,
          invoiceKey: receivable.invoiceKey,
          allocationType: alloc.allocationType ?? 'invoice',
          amount: alloc.amount,
        },
      });
      appliedTotal += alloc.amount;
    }

    const unapplied = Number((payment.amount - appliedTotal).toFixed(2));
    if (unapplied > 0 && !payment.advance) {
      const advCount = await this.prisma.escmAdvance.count({ where: { organizationId } });
      await this.prisma.escmAdvance.create({
        data: {
          organizationId,
          advanceKey: generateAdvanceKey(advCount + 1),
          customerId: payment.customerId,
          customerKey: payment.customerKey,
          paymentId: payment.id,
          amount: unapplied,
          balanceAmount: unapplied,
          notes: `Saldo a favor de pago ${paymentKey}`,
          createdBy: userId,
        },
      });
    }

    const updated = await this.prisma.escmPayment.update({
      where: { id: payment.id },
      data: {
        status: 'confirmed',
        unappliedAmount: unapplied,
      },
      include: { allocations: true },
    });

    await this.audit.log(organizationId, 'Payment', paymentKey, 'confirmed', userId, {
      appliedTotal,
      unapplied,
    });
    await this.core.emitUserAction(organizationId, 'EscmPayment', updated.id, EVENT_TYPES.ESCM_PAYMENT_CONFIRMED, {
      paymentKey,
      amount: payment.amount,
    });
    return updated;
  }

  async void(organizationId: string, userId: string, paymentKey: string, reason: string) {
    const payment = await this.getOne(organizationId, paymentKey);
    if (!canVoidPayment(payment.status)) {
      throw new BadRequestException(`Pago ${paymentKey} no puede anularse`);
    }
    if (!reason?.trim()) throw new BadRequestException('Motivo requerido');

    for (const alloc of payment.allocations) {
      if (alloc.receivableId) {
        const r = await this.prisma.escmReceivable.findUnique({ where: { id: alloc.receivableId } });
        if (r) await this.receivables.reversePaymentAllocation(organizationId, r.receivableKey, alloc.amount);
      }
    }

    if (payment.advance) {
      await this.prisma.escmAdvance.update({
        where: { id: payment.advance.id },
        data: { status: 'refunded', balanceAmount: 0 },
      });
    }

    const updated = await this.prisma.escmPayment.update({
      where: { id: payment.id },
      data: { status: 'voided', voidedAt: new Date(), voidReason: reason },
    });

    await this.audit.log(organizationId, 'Payment', paymentKey, 'voided', userId, { reason });
    await this.core.emitUserAction(organizationId, 'EscmPayment', updated.id, EVENT_TYPES.ESCM_PAYMENT_VOIDED, {
      paymentKey,
      reason,
    });
    return updated;
  }

  async reconcile(organizationId: string, userId: string, paymentKey: string, bankRef?: string) {
    const payment = await this.getOne(organizationId, paymentKey);
    if (payment.status !== 'confirmed') {
      throw new BadRequestException('Solo pagos confirmados pueden conciliarse');
    }

    const updated = await this.prisma.escmPayment.update({
      where: { id: payment.id },
      data: {
        status: 'reconciled',
        reconciledAt: new Date(),
        bankRef: bankRef ?? payment.bankRef,
      },
    });

    await this.audit.log(organizationId, 'Payment', paymentKey, 'reconciled', userId, { bankRef });
    await this.core.emitUserAction(organizationId, 'EscmPayment', updated.id, EVENT_TYPES.ESCM_PAYMENT_RECONCILED, {
      paymentKey,
    });
    return updated;
  }

  async applyAdvanceToReceivable(
    organizationId: string,
    userId: string,
    advanceKey: string,
    receivableKey: string,
    amount?: number,
  ) {
    const advance = await this.prisma.escmAdvance.findFirst({
      where: { organizationId, advanceKey, status: 'open' },
    });
    if (!advance) throw new NotFoundException(`Anticipo ${advanceKey} no encontrado`);

    const receivable = await this.receivables.getOne(organizationId, receivableKey);
    const applyAmount = amount ?? Math.min(advance.balanceAmount, receivable.balanceAmount);
    if (applyAmount <= 0) throw new BadRequestException('Monto de aplicación inválido');

    await this.receivables.applyPaymentAllocation(organizationId, receivableKey, applyAmount);

    const newBalance = Number((advance.balanceAmount - applyAmount).toFixed(2));
    await this.prisma.escmAdvance.update({
      where: { id: advance.id },
      data: {
        appliedAmount: advance.appliedAmount + applyAmount,
        balanceAmount: newBalance,
        status: newBalance <= 0 ? 'applied' : 'open',
      },
    });

    await this.audit.log(organizationId, 'Advance', advanceKey, 'applied', userId, {
      receivableKey,
      amount: applyAmount,
    });
    return { advanceKey, receivableKey, appliedAmount: applyAmount };
  }
}
