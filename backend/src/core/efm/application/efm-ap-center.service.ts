import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EfmAuditService } from './efm-audit.service';
import { EfmApSupplierService } from './efm-ap-supplier.service';
import { computeAgingBuckets, computeDaysPastDue } from '../domain/efm-ap.engine';

@Injectable()
export class EfmApCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EfmAuditService,
    private readonly suppliers: EfmApSupplierService,
  ) {}

  async center(organizationId: string) {
    const [
      supplierCount,
      invoiceCount,
      payableCount,
      openPayables,
      overduePayables,
      paymentCount,
      pendingApprovals,
      scheduledCount,
      advanceBalance,
      recentAudit,
    ] = await Promise.all([
      this.prisma.efmApSupplierProfile.count({ where: { organizationId } }),
      this.prisma.efmApInvoice.count({ where: { organizationId } }),
      this.prisma.efmApPayable.count({ where: { organizationId } }),
      this.prisma.efmApPayable.count({ where: { organizationId, status: { in: ['open', 'partial'] } } }),
      this.prisma.efmApPayable.count({ where: { organizationId, status: 'overdue' } }),
      this.prisma.efmApPayment.count({ where: { organizationId, status: 'processed' } }),
      this.prisma.efmApPayment.count({ where: { organizationId, status: 'pending_approval' } }),
      this.prisma.efmApPaymentSchedule.count({ where: { organizationId, status: 'scheduled' } }),
      this.prisma.efmApAdvance.aggregate({
        where: { organizationId, status: { in: ['open', 'partial'] } },
        _sum: { balanceAmount: true },
      }),
      this.audit.findAll(organizationId, 'EfmAp', 20),
    ]);

    const payables = await this.prisma.efmApPayable.findMany({
      where: { organizationId, status: { in: ['open', 'partial', 'overdue'] } },
      select: { balanceAmount: true, dueDate: true, daysPastDue: true },
    });

    const aging = computeAgingBuckets(
      payables.map((p) => ({
        balanceAmount: p.balanceAmount,
        daysPastDue: p.daysPastDue || computeDaysPastDue(p.dueDate),
      })),
    );

    const totalOpen = payables.reduce((s, p) => s + p.balanceAmount, 0);

    return {
      supplierCount,
      invoiceCount,
      payableCount,
      openPayables,
      overduePayables,
      paymentCount,
      pendingApprovals,
      scheduledCount,
      advanceBalance: advanceBalance._sum.balanceAmount ?? 0,
      totalOpenBalance: totalOpen,
      aging,
      recentAudit,
    };
  }

  async seed(organizationId: string, userId: string) {
    const producers = await this.prisma.producer.findMany({
      where: { organizationId, deletedAt: null, lifecycleStatus: 'active' },
      take: 50,
    });
    for (const p of producers) {
      await this.suppliers.getOrCreateFromProducer(organizationId, p.id, userId);
    }
    await this.audit.log(organizationId, 'EfmApConfig', 'seed', 'completed', userId);
    return this.center(organizationId);
  }
}
