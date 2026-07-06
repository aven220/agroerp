import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EfmAuditService } from './efm-audit.service';
import { EfmAccountingEngineService } from './efm-accounting-engine.service';
import { EfmApApprovalService } from './efm-ap-approval.service';
import { EfmBgValidationService } from './efm-bg-validation.service';
import { buildPeriodKey } from '../domain/efm-budget.engine';
import {
  applyPartialPayment,
  computeDaysPastDue,
  computeEarlyDiscount,
  generateApKey,
  resolveInvoiceStatus,
  resolvePayableStatus,
} from '../domain/efm-ap.engine';

@Injectable()
export class EfmApPaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EfmAuditService,
    private readonly engine: EfmAccountingEngineService,
    private readonly approvals: EfmApApprovalService,
    private readonly budgetValidation: EfmBgValidationService,
  ) {}

  list(organizationId: string, filters?: { status?: string; supplierKey?: string; batchKey?: string }) {
    return this.prisma.efmApPayment.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.supplierKey ? { supplierKey: filters.supplierKey } : {}),
        ...(filters?.batchKey ? { batchKey: filters.batchKey } : {}),
      },
      include: { allocations: true, approvals: { orderBy: { approvalLevel: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  getOne(organizationId: string, paymentKey: string) {
    return this.prisma.efmApPayment.findFirst({
      where: { organizationId, paymentKey },
      include: {
        allocations: { include: { payable: true } },
        approvals: { orderBy: { approvalLevel: 'asc' } },
        batch: true,
      },
    });
  }

  async create(
    organizationId: string,
    userId: string,
    input: {
      supplierKey: string;
      amount: number;
      paymentMethod?: string;
      scheduledDate?: string;
      referenceNumber?: string;
      observations?: string;
      allocations?: Array<{ payableKey?: string; invoiceKey?: string; amount: number }>;
      submitForApproval?: boolean;
      earlyDiscountPercent?: number;
    },
  ) {
    const supplier = await this.prisma.efmApSupplierProfile.findFirst({
      where: { organizationId, supplierKey: input.supplierKey },
    });
    if (!supplier) throw new NotFoundException(`Proveedor ${input.supplierKey} no encontrado`);
    if (supplier.paymentBlocked) throw new BadRequestException('Proveedor con pagos bloqueados');

    const count = await this.prisma.efmApPayment.count({ where: { organizationId } });
    const paymentKey = generateApKey('APPYM', count + 1);

    await this.budgetValidation.checkAndReserve(organizationId, {
      periodKey: buildPeriodKey(new Date().getFullYear(), new Date().getMonth() + 1),
      accountKey: 'ACC-2205',
      costCenterKey: 'CC-OPS',
      amount: input.amount,
      sourceModule: 'payment',
      sourceDocumentKey: paymentKey,
      userId,
      description: `Pago proveedor ${input.supplierKey}`,
    });

    let earlyDiscount = 0;
    if (input.earlyDiscountPercent && input.allocations?.length) {
      for (const alloc of input.allocations) {
        if (alloc.payableKey) {
          const payable = await this.prisma.efmApPayable.findFirst({
            where: { organizationId, payableKey: alloc.payableKey },
          });
          if (payable) {
            const daysBefore = Math.ceil((payable.dueDate.getTime() - Date.now()) / 86400000);
            earlyDiscount += computeEarlyDiscount(alloc.amount, input.earlyDiscountPercent, daysBefore);
          }
        }
      }
    }

    const payment = await this.prisma.efmApPayment.create({
      data: {
        organizationId,
        paymentKey,
        supplierKey: input.supplierKey,
        paymentMethod: input.paymentMethod ?? 'transfer',
        amount: input.amount,
        unappliedAmount: input.amount,
        scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : undefined,
        referenceNumber: input.referenceNumber,
        observations: input.observations,
        earlyPaymentDiscount: earlyDiscount,
        status: input.submitForApproval !== false ? 'pending_approval' : 'draft',
        createdBy: userId,
        allocations: input.allocations?.length ? {
          create: await Promise.all(input.allocations.map(async (a) => {
            const payable = a.payableKey
              ? await this.prisma.efmApPayable.findFirst({ where: { organizationId, payableKey: a.payableKey } })
              : a.invoiceKey
                ? await this.prisma.efmApPayable.findFirst({ where: { organizationId, invoiceKey: a.invoiceKey } })
                : null;
            return {
              payableId: payable?.id,
              invoiceKey: a.invoiceKey ?? payable?.invoiceKey,
              amount: a.amount,
              allocationType: 'payment',
            };
          })),
        } : undefined,
      },
      include: { allocations: true },
    });

    if (input.submitForApproval !== false) {
      await this.approvals.initPaymentApprovals(organizationId, payment.id, paymentKey, input.amount);
    }

    await this.audit.log(organizationId, 'EfmApPayment', paymentKey, 'created', userId, { amount: input.amount });
    await this.core.emitUserAction(organizationId, 'EfmApPayment', paymentKey, EVENT_TYPES.EFM_AP_PAYMENT_CREATED, {
      amount: input.amount,
    });
    return payment;
  }

  async process(organizationId: string, paymentKey: string, userId: string) {
    const payment = await this.getOne(organizationId, paymentKey);
    if (!payment) throw new NotFoundException(`Pago ${paymentKey} no encontrado`);
    if (!['approved', 'scheduled', 'draft'].includes(payment.status)) {
      throw new BadRequestException(`Pago ${paymentKey} no puede procesarse (estado: ${payment.status})`);
    }
    if (payment.paymentBlocked) throw new BadRequestException('Pago bloqueado');

    const supplier = await this.prisma.efmApSupplierProfile.findFirst({
      where: { organizationId, supplierKey: payment.supplierKey },
    });
    if (supplier?.paymentBlocked) throw new BadRequestException('Proveedor con pagos bloqueados');

    let remaining = payment.amount - payment.earlyPaymentDiscount;
    const allocations = payment.allocations.length
      ? payment.allocations
      : await this.autoAllocate(organizationId, payment.supplierKey, remaining);

    for (const alloc of allocations) {
      if (!alloc.payableId) continue;
      const payable = await this.prisma.efmApPayable.findFirst({ where: { id: alloc.payableId } });
      if (!payable || payable.onHold) continue;

      const { applied, remainingBalance } = applyPartialPayment(payable.balanceAmount, alloc.amount);
      const paidAmount = payable.paidAmount + applied;
      const daysPastDue = computeDaysPastDue(payable.dueDate);

      await this.prisma.efmApPayable.update({
        where: { id: payable.id },
        data: {
          balanceAmount: remainingBalance,
          paidAmount,
          daysPastDue,
          status: resolvePayableStatus(remainingBalance, payable.originalAmount, daysPastDue, payable.onHold) as never,
        },
      });

      const invoice = await this.prisma.efmApInvoice.findFirst({ where: { id: payable.invoiceId } });
      if (invoice) {
        const invPaid = invoice.paidAmount + applied;
        const invBalance = Math.max(0, invoice.balanceAmount - applied);
        await this.prisma.efmApInvoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: invPaid,
            balanceAmount: invBalance,
            status: resolveInvoiceStatus(invBalance, invoice.totalAmount, invPaid, true) as never,
          },
        });
      }
      remaining -= applied;
    }

    let accountingRef = payment.accountingRef;
    if (!accountingRef) {
      try {
        const entry = await this.engine.generateFromEvent(organizationId, EVENT_TYPES.EFM_AP_PAYMENT_PROCESSED, {
          paymentKey,
          supplierKey: payment.supplierKey,
          amount: payment.amount,
          sourceModule: 'payment',
        }, userId);
        if (entry && typeof entry === 'object' && 'entryKey' in entry) {
          accountingRef = String(entry.entryKey);
        }
      } catch {
        const entry = await this.engine.createEntry(organizationId, userId, {
          sourceModule: 'payment',
          sourceDocumentType: 'ap_payment',
          sourceDocumentKey: paymentKey,
          description: `Pago proveedor ${payment.supplierKey}`,
          entryDate: new Date().toISOString().slice(0, 10),
          lines: [
            { accountKey: 'ACC-2205', debit: payment.amount, credit: 0 },
            { accountKey: 'ACC-1110', debit: 0, credit: payment.amount },
          ],
          autoPost: true,
        });
        accountingRef = entry.entryKey;
      }
    }

    const updated = await this.prisma.efmApPayment.update({
      where: { id: payment.id },
      data: {
        status: 'processed',
        processedAt: new Date(),
        unappliedAmount: Math.max(0, remaining),
        accountingRef,
        treasuryRef: `FMTP-PENDING-${paymentKey}`,
      },
      include: { allocations: true, approvals: true },
    });

    await this.audit.log(organizationId, 'EfmApPayment', paymentKey, 'processed', userId, { accountingRef });
    await this.core.emitUserAction(organizationId, 'EfmApPayment', paymentKey, EVENT_TYPES.EFM_AP_PAYMENT_PROCESSED, {
      accountingRef,
    });
    return updated;
  }

  async registerAdvance(
    organizationId: string,
    userId: string,
    input: { supplierKey: string; amount: number; notes?: string; paymentMethod?: string },
  ) {
    const count = await this.prisma.efmApAdvance.count({ where: { organizationId } });
    const advanceKey = generateApKey('APADV', count + 1);

    const payment = await this.create(organizationId, userId, {
      supplierKey: input.supplierKey,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      observations: `Anticipo: ${input.notes ?? ''}`,
      submitForApproval: true,
    });

    const advance = await this.prisma.efmApAdvance.create({
      data: {
        organizationId,
        advanceKey,
        supplierKey: input.supplierKey,
        amount: input.amount,
        balanceAmount: input.amount,
        paymentKey: payment.paymentKey,
        notes: input.notes,
        createdBy: userId,
      },
    });

    await this.audit.log(organizationId, 'EfmApAdvance', advanceKey, 'created', userId);
    return { advance, payment };
  }

  async voidPayment(organizationId: string, paymentKey: string, userId: string, reason: string) {
    const payment = await this.getOne(organizationId, paymentKey);
    if (!payment) throw new NotFoundException(`Pago ${paymentKey} no encontrado`);
    if (payment.status === 'voided') throw new BadRequestException('Pago ya anulado');

    const updated = await this.prisma.efmApPayment.update({
      where: { id: payment.id },
      data: { status: 'voided', voidReason: reason },
    });

    await this.audit.log(organizationId, 'EfmApPayment', paymentKey, 'voided', userId, { reason });
    return updated;
  }

  private async autoAllocate(organizationId: string, supplierKey: string, amount: number) {
    const payables = await this.prisma.efmApPayable.findMany({
      where: {
        organizationId,
        supplierKey,
        status: { in: ['open', 'partial', 'overdue'] },
        onHold: false,
      },
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
    });

    let remaining = amount;
    const allocs: Array<{ payableId: string; amount: number }> = [];
    for (const p of payables) {
      if (remaining <= 0) break;
      const alloc = Math.min(p.balanceAmount, remaining);
      allocs.push({ payableId: p.id, amount: alloc });
      remaining -= alloc;
    }
    return allocs.map((a) => ({
      id: '',
      paymentId: '',
      payableId: a.payableId,
      invoiceKey: null,
      allocationType: 'payment',
      amount: a.amount,
      metadata: {},
    }));
  }
}
