import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { computeAgingBuckets, computeDaysPastDue } from '../domain/escm-ar.engine';

@Injectable()
export class EscmArCenterService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(organizationId: string) {
    const receivableStatuses = ['open', 'partial', 'paid', 'overdue', 'written_off', 'cancelled'] as const;
    const paymentStatuses = ['draft', 'confirmed', 'voided', 'reconciled'] as const;

    const [
      receivableCounts,
      paymentCounts,
      totalOpen,
      totalOverdue,
      advanceTotal,
      pendingPromises,
      activeAgreements,
      activeCampaigns,
      recentPayments,
      recentReceivables,
    ] = await Promise.all([
      Promise.all(
        receivableStatuses.map((s) =>
          this.prisma.escmReceivable.count({ where: { organizationId, status: s } }),
        ),
      ),
      Promise.all(
        paymentStatuses.map((s) =>
          this.prisma.escmPayment.count({ where: { organizationId, status: s } }),
        ),
      ),
      this.prisma.escmReceivable.aggregate({
        where: { organizationId, status: { in: ['open', 'partial', 'overdue'] } },
        _sum: { balanceAmount: true },
      }),
      this.prisma.escmReceivable.aggregate({
        where: { organizationId, status: 'overdue' },
        _sum: { balanceAmount: true },
      }),
      this.prisma.escmAdvance.aggregate({
        where: { organizationId, status: 'open' },
        _sum: { balanceAmount: true },
      }),
      this.prisma.escmPaymentPromise.count({ where: { organizationId, status: 'pending' } }),
      this.prisma.escmPaymentAgreement.count({ where: { organizationId, status: 'active' } }),
      this.prisma.escmCollectionCampaign.count({ where: { organizationId, status: 'active' } }),
      this.prisma.escmPayment.findMany({
        where: { organizationId },
        orderBy: { receivedAt: 'desc' },
        take: 10,
      }),
      this.prisma.escmReceivable.findMany({
        where: { organizationId, status: { in: ['open', 'partial', 'overdue'] } },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
    ]);

    const openReceivables = await this.prisma.escmReceivable.findMany({
      where: { organizationId, status: { in: ['open', 'partial', 'overdue'] } },
      select: { balanceAmount: true, dueDate: true, receivableKey: true, invoiceKey: true },
    });

    const aging = computeAgingBuckets(
      openReceivables.map((r) => ({
        receivableKey: r.receivableKey,
        invoiceKey: r.invoiceKey,
        balanceAmount: r.balanceAmount,
        dueDate: r.dueDate,
        daysPastDue: computeDaysPastDue(r.dueDate),
      })),
    );

    const riskBreakdown = await this.prisma.escmReceivable.groupBy({
      by: ['riskClass'],
      where: { organizationId, status: { in: ['open', 'partial', 'overdue'] } },
      _count: { _all: true },
      _sum: { balanceAmount: true },
    });

    return {
      receivablesByStatus: Object.fromEntries(receivableStatuses.map((s, i) => [s, receivableCounts[i]])),
      paymentsByStatus: Object.fromEntries(paymentStatuses.map((s, i) => [s, paymentCounts[i]])),
      totalOpenBalance: totalOpen._sum.balanceAmount ?? 0,
      totalOverdueBalance: totalOverdue._sum.balanceAmount ?? 0,
      totalAdvanceBalance: advanceTotal._sum.balanceAmount ?? 0,
      pendingPromises,
      activeAgreements,
      activeCampaigns,
      aging,
      riskBreakdown: Object.fromEntries(
        riskBreakdown.map((r) => [r.riskClass, { count: r._count._all, amount: r._sum.balanceAmount ?? 0 }]),
      ),
      recentPayments,
      recentReceivables,
    };
  }
}
