import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EfmAuditService } from './efm-audit.service';
import { generateApKey } from '../domain/efm-ap.engine';

@Injectable()
export class EfmApSupplierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EfmAuditService,
  ) {}

  list(organizationId: string) {
    return this.prisma.efmApSupplierProfile.findMany({
      where: { organizationId },
      orderBy: { legalName: 'asc' },
    });
  }

  async getOrCreateFromProducer(organizationId: string, producerId: string, userId?: string) {
    const producer = await this.prisma.producer.findFirst({
      where: { id: producerId, organizationId, deletedAt: null },
    });
    if (!producer) throw new NotFoundException(`Productor ${producerId} no encontrado`);

    const supplierKey = `SUP-${producer.producerNumber}`;
    const existing = await this.prisma.efmApSupplierProfile.findFirst({
      where: { organizationId, supplierKey },
    });
    if (existing) return existing;

    const row = await this.prisma.efmApSupplierProfile.create({
      data: {
        organizationId,
        supplierKey,
        producerId: producer.id,
        legalName: producer.legalName,
        taxId: producer.taxId ?? producer.documentNumber,
        paymentTermsDays: 30,
      },
    });
    await this.audit.log(organizationId, 'EfmApSupplier', supplierKey, 'created', userId);
    return row;
  }

  async getStatement(organizationId: string, supplierKey: string) {
    const supplier = await this.prisma.efmApSupplierProfile.findFirst({
      where: { organizationId, supplierKey },
    });
    if (!supplier) throw new NotFoundException(`Proveedor ${supplierKey} no encontrado`);

    const [invoices, payables, payments, advances] = await Promise.all([
      this.prisma.efmApInvoice.findMany({
        where: { organizationId, supplierKey },
        orderBy: { issueDate: 'desc' },
        take: 200,
      }),
      this.prisma.efmApPayable.findMany({
        where: { organizationId, supplierKey },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.efmApPayment.findMany({
        where: { organizationId, supplierKey, status: 'processed' },
        include: { allocations: true },
        orderBy: { processedAt: 'desc' },
        take: 100,
      }),
      this.prisma.efmApAdvance.findMany({
        where: { organizationId, supplierKey, status: { in: ['open', 'partial'] } },
      }),
    ]);

    const openBalance = payables
      .filter((p) => ['open', 'partial', 'overdue'].includes(p.status))
      .reduce((s, p) => s + p.balanceAmount, 0);
    const advanceBalance = advances.reduce((s, a) => s + a.balanceAmount, 0);

    return {
      supplier,
      summary: {
        openBalance,
        advanceBalance,
        netPayable: openBalance - advanceBalance,
        invoiceCount: invoices.length,
        pendingCount: payables.filter((p) => p.status !== 'paid').length,
        paidCount: payables.filter((p) => p.status === 'paid').length,
        overdueCount: payables.filter((p) => p.status === 'overdue').length,
      },
      invoices,
      payables,
      payments,
      advances,
    };
  }

  async upsert(
    organizationId: string,
    userId: string,
    input: {
      supplierKey: string;
      legalName: string;
      taxId?: string;
      producerId?: string;
      paymentTermsDays?: number;
      creditLimit?: number;
      countryCode?: string;
      currencyKey?: string;
    },
  ) {
    const row = await this.prisma.efmApSupplierProfile.upsert({
      where: { organizationId_supplierKey: { organizationId, supplierKey: input.supplierKey } },
      update: {
        legalName: input.legalName,
        taxId: input.taxId,
        producerId: input.producerId,
        paymentTermsDays: input.paymentTermsDays ?? 30,
        creditLimit: input.creditLimit ?? 0,
        countryCode: input.countryCode,
        currencyKey: input.currencyKey ?? 'COP',
      },
      create: {
        organizationId,
        supplierKey: input.supplierKey,
        legalName: input.legalName,
        taxId: input.taxId,
        producerId: input.producerId,
        paymentTermsDays: input.paymentTermsDays ?? 30,
        creditLimit: input.creditLimit ?? 0,
        countryCode: input.countryCode,
        currencyKey: input.currencyKey ?? 'COP',
      },
    });
    await this.audit.log(organizationId, 'EfmApSupplier', input.supplierKey, 'upserted', userId);
    return row;
  }

  async setPaymentBlock(organizationId: string, supplierKey: string, blocked: boolean, reason: string | undefined, userId: string) {
    const row = await this.prisma.efmApSupplierProfile.update({
      where: { organizationId_supplierKey: { organizationId, supplierKey } },
      data: { paymentBlocked: blocked, blockReason: reason ?? null },
    });
    await this.audit.log(organizationId, 'EfmApSupplier', supplierKey, blocked ? 'payment_blocked' : 'payment_unblocked', userId, { reason });
    return row;
  }
}
