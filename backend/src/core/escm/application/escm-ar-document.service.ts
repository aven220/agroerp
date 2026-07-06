import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EscmAuditService } from './escm-audit.service';
import {
  computeAgingBuckets,
  computeCollectionProjection,
  computeDaysPastDue,
  generateArDocumentKey,
} from '../domain/escm-ar.engine';

@Injectable()
export class EscmArDocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EscmAuditService,
  ) {}

  list(organizationId: string, filters?: { documentType?: string; customerKey?: string }) {
    return this.prisma.escmArDocument.findMany({
      where: {
        organizationId,
        ...(filters?.documentType ? { documentType: filters.documentType } : {}),
        ...(filters?.customerKey ? { customerKey: filters.customerKey } : {}),
      },
      orderBy: { generatedAt: 'desc' },
      take: 300,
    });
  }

  async generateStatement(organizationId: string, userId: string, customerKey: string) {
    const customer = await this.prisma.escmCustomer.findFirst({
      where: { organizationId, customerKey, deletedAt: null },
    });
    if (!customer) throw new NotFoundException(`Cliente ${customerKey} no encontrado`);

    const receivables = await this.prisma.escmReceivable.findMany({
      where: { organizationId, customerKey },
      orderBy: { dueDate: 'asc' },
    });
    const payments = await this.prisma.escmPayment.findMany({
      where: { organizationId, customerKey, status: { in: ['confirmed', 'reconciled'] } },
      include: { allocations: true },
      orderBy: { receivedAt: 'desc' },
      take: 100,
    });
    const advances = await this.prisma.escmAdvance.findMany({
      where: { organizationId, customerKey, status: 'open' },
    });

    const asOf = new Date();
    const snapshots = receivables
      .filter((r) => r.balanceAmount > 0)
      .map((r) => ({
        receivableKey: r.receivableKey,
        invoiceKey: r.invoiceKey,
        balanceAmount: r.balanceAmount,
        dueDate: r.dueDate,
        daysPastDue: computeDaysPastDue(r.dueDate, asOf),
      }));

    const aging = computeAgingBuckets(snapshots, asOf);
    const overdue = receivables.filter((r) => r.status === 'overdue');
    const upcoming = receivables.filter(
      (r) => r.status !== 'paid' && r.status !== 'cancelled' && computeDaysPastDue(r.dueDate, asOf) === 0,
    );

    const promises = await this.prisma.escmPaymentPromise.findMany({
      where: { organizationId, customerKey, status: 'pending' },
    });
    const projection = computeCollectionProjection(
      receivables.filter((r) => r.balanceAmount > 0).map((r) => ({ balanceAmount: r.balanceAmount, dueDate: r.dueDate })),
      promises.map((p) => ({ promisedAmount: p.promisedAmount, promisedDate: p.promisedDate, status: p.status })),
    );

    const content = {
      customerKey,
      customerName: customer.legalName,
      generatedAt: asOf.toISOString(),
      totalBalance: Number(receivables.reduce((s, r) => s + r.balanceAmount, 0).toFixed(2)),
      advanceBalance: Number(advances.reduce((s, a) => s + a.balanceAmount, 0).toFixed(2)),
      receivables,
      payments,
      aging,
      overdueInvoices: overdue,
      upcomingInvoices: upcoming,
      projection,
    };

    const count = await this.prisma.escmArDocument.count({ where: { organizationId } });
    const documentKey = generateArDocumentKey('STM', count + 1);

    const doc = await this.prisma.escmArDocument.create({
      data: {
        organizationId,
        documentKey,
        documentType: 'statement',
        customerKey,
        content,
        generatedBy: userId,
      },
    });

    await this.audit.log(organizationId, 'ArDocument', documentKey, 'generated', userId, {
      customerKey,
      documentType: 'statement',
    });
    return doc;
  }
}
