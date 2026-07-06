import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EfmAuditService } from './efm-audit.service';
import { EfmApPaymentService } from './efm-ap-payment.service';
import { generateApKey } from '../domain/efm-ap.engine';

@Injectable()
export class EfmApScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EfmAuditService,
    private readonly payments: EfmApPaymentService,
  ) {}

  listCalendar(organizationId: string, filters?: { dateFrom?: string; dateTo?: string; status?: string }) {
    return this.prisma.efmApPaymentSchedule.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.dateFrom || filters?.dateTo ? {
          scheduledDate: {
            ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
            ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
          },
        } : {}),
      },
      orderBy: [{ scheduledDate: 'asc' }, { priority: 'asc' }],
      take: 1000,
    });
  }

  async schedule(
    organizationId: string,
    userId: string,
    input: {
      supplierKey: string;
      payableKey?: string;
      scheduledDate: string;
      amount: number;
      priority?: number;
      earlyDiscountPercent?: number;
      observations?: string;
    },
  ) {
    const supplier = await this.prisma.efmApSupplierProfile.findFirst({
      where: { organizationId, supplierKey: input.supplierKey },
    });
    if (!supplier) throw new NotFoundException(`Proveedor ${input.supplierKey} no encontrado`);
    if (supplier.paymentBlocked) throw new BadRequestException('Proveedor con pagos bloqueados');

    let payableId: string | undefined;
    if (input.payableKey) {
      const payable = await this.prisma.efmApPayable.findFirst({
        where: { organizationId, payableKey: input.payableKey },
      });
      if (!payable) throw new NotFoundException(`Obligación ${input.payableKey} no encontrada`);
      if (payable.onHold) throw new BadRequestException('Obligación en retención');
      payableId = payable.id;
    }

    const count = await this.prisma.efmApPaymentSchedule.count({ where: { organizationId } });
    const scheduleKey = generateApKey('APSCH', count + 1);
    const earlyDiscountAmount = input.earlyDiscountPercent
      ? (input.amount * input.earlyDiscountPercent) / 100
      : 0;

    const row = await this.prisma.efmApPaymentSchedule.create({
      data: {
        organizationId,
        scheduleKey,
        supplierKey: input.supplierKey,
        payableId,
        payableKey: input.payableKey,
        scheduledDate: new Date(input.scheduledDate),
        priority: input.priority ?? 50,
        amount: input.amount,
        earlyDiscountPercent: input.earlyDiscountPercent ?? 0,
        earlyDiscountAmount,
        status: 'scheduled',
        observations: input.observations,
        createdBy: userId,
      },
    });

    await this.audit.log(organizationId, 'EfmApSchedule', scheduleKey, 'scheduled', userId);
    return row;
  }

  async createBatch(
    organizationId: string,
    userId: string,
    input: { scheduledDate: string; scheduleKeys: string[]; observations?: string },
  ) {
    const schedules = await this.prisma.efmApPaymentSchedule.findMany({
      where: {
        organizationId,
        scheduleKey: { in: input.scheduleKeys },
        status: 'scheduled',
      },
    });
    if (!schedules.length) throw new BadRequestException('No hay programaciones válidas');

    const batchCount = await this.prisma.efmApPaymentBatch.count({ where: { organizationId } });
    const batchKey = generateApKey('APBAT', batchCount + 1);
    const totalAmount = schedules.reduce((s, r) => s + r.amount, 0);

    const batch = await this.prisma.efmApPaymentBatch.create({
      data: {
        organizationId,
        batchKey,
        scheduledDate: new Date(input.scheduledDate),
        totalAmount,
        paymentCount: schedules.length,
        status: 'scheduled',
        observations: input.observations,
        createdBy: userId,
      },
    });

    const payments = [];
    for (const sch of schedules) {
      const payment = await this.payments.create(organizationId, userId, {
        supplierKey: sch.supplierKey,
        amount: sch.amount,
        scheduledDate: input.scheduledDate,
        earlyDiscountPercent: sch.earlyDiscountPercent,
        allocations: sch.payableKey ? [{ payableKey: sch.payableKey, amount: sch.amount }] : undefined,
        submitForApproval: true,
      });

      await this.prisma.efmApPayment.update({
        where: { id: payment.id },
        data: { batchId: batch.id, batchKey: batch.batchKey },
      });

      await this.prisma.efmApPaymentSchedule.update({
        where: { id: sch.id },
        data: { status: 'paid', paymentKey: payment.paymentKey },
      });
      payments.push(payment);
    }

    await this.audit.log(organizationId, 'EfmApBatch', batchKey, 'created', userId, {
      paymentCount: payments.length,
      totalAmount,
    });
    return { batch, payments };
  }

  async holdPayable(organizationId: string, payableKey: string, userId: string, reason: string) {
    const payable = await this.prisma.efmApPayable.findFirst({ where: { organizationId, payableKey } });
    if (!payable) throw new NotFoundException(`Obligación ${payableKey} no encontrada`);

    const updated = await this.prisma.efmApPayable.update({
      where: { id: payable.id },
      data: { onHold: true, holdReason: reason, status: 'on_hold' },
    });
    await this.audit.log(organizationId, 'EfmApPayable', payableKey, 'on_hold', userId, { reason });
    return updated;
  }

  listPayables(organizationId: string, filters?: { status?: string; supplierKey?: string; overdue?: boolean }) {
    return this.prisma.efmApPayable.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.supplierKey ? { supplierKey: filters.supplierKey } : {}),
        ...(filters?.overdue ? { status: 'overdue' } : {}),
      },
      include: { invoice: { select: { invoiceKey: true, supplierInvoiceNumber: true, issueDate: true } } },
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      take: 500,
    });
  }
}
