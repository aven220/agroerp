import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  computeGoalCompliance,
  dayRange,
  generateSalesTargetKey,
  monthRange,
  periodKeyFromDate,
} from '../domain/escm-analytics.engine';

export type OpsFilters = {
  regionKey?: string;
  sellerId?: string;
  customerKey?: string;
  dateFrom?: string;
  dateTo?: string;
};

@Injectable()
export class EscmOpsCenterService {
  constructor(private readonly prisma: PrismaService) {}

  private customerWhere(organizationId: string, filters?: OpsFilters) {
    const where: Record<string, unknown> = { organizationId, deletedAt: null };
    if (filters?.regionKey) where.regionKey = filters.regionKey;
    if (filters?.sellerId) where.assignedUserId = filters.sellerId;
    if (filters?.customerKey) where.customerKey = filters.customerKey;
    return where;
  }

  async dashboard(organizationId: string, filters?: OpsFilters) {
    const day = dayRange();
    const month = monthRange();
    const periodKey = periodKeyFromDate(new Date());
    const customerWhere = this.customerWhere(organizationId, filters);

    const customerIds = filters?.regionKey || filters?.sellerId || filters?.customerKey
      ? (await this.prisma.escmCustomer.findMany({ where: customerWhere, select: { id: true } })).map((c) => c.id)
      : undefined;

    const orderWhere: Record<string, unknown> = { organizationId };
    const invoiceWhere: Record<string, unknown> = { organizationId };
    const receivableWhere: Record<string, unknown> = { organizationId };
    const paymentWhere: Record<string, unknown> = { organizationId };
    if (customerIds) {
      orderWhere.customerId = { in: customerIds };
      invoiceWhere.customerId = { in: customerIds };
      receivableWhere.customerId = { in: customerIds };
      paymentWhere.customerId = { in: customerIds };
    }

    const [
      activeProspects,
      openOpportunities,
      pipelineAgg,
      pendingQuotations,
      pendingOrders,
      dispatchedOrders,
      billingDay,
      billingMonth,
      pendingReceivables,
      collectionDay,
      collectionMonth,
      targets,
      openAlerts,
    ] = await Promise.all([
      this.prisma.escmProspect.count({
        where: {
          organizationId,
          deletedAt: null,
          status: { in: ['new', 'contacted', 'qualified'] },
        },
      }),
      this.prisma.escmOpportunity.count({
        where: { organizationId, deletedAt: null, status: 'open' },
      }),
      this.prisma.escmOpportunity.aggregate({
        where: { organizationId, deletedAt: null, status: 'open' },
        _sum: { estimatedValue: true, weightedValue: true },
      }),
      this.prisma.escmQuotation.count({
        where: { organizationId, isCurrent: true, status: { in: ['draft', 'sent', 'approved'] } },
      }),
      this.prisma.escmSalesOrder.count({
        where: {
          ...orderWhere,
          status: { in: ['draft', 'pending_approval', 'approved', 'reserved', 'in_preparation', 'ready_for_dispatch'] },
        },
      }),
      this.prisma.escmSalesOrder.count({
        where: { ...orderWhere, status: 'dispatched' },
      }),
      this.prisma.escmInvoice.aggregate({
        where: {
          ...invoiceWhere,
          status: { in: ['issued', 'partial'] },
          issuedAt: { gte: day.start, lte: day.end },
        },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      this.prisma.escmInvoice.aggregate({
        where: {
          ...invoiceWhere,
          status: { in: ['issued', 'partial'] },
          issuedAt: { gte: month.start, lte: month.end },
        },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      this.prisma.escmReceivable.aggregate({
        where: { ...receivableWhere, status: { in: ['open', 'partial', 'overdue'] } },
        _sum: { balanceAmount: true },
        _count: { _all: true },
      }),
      this.prisma.escmPayment.aggregate({
        where: {
          ...paymentWhere,
          status: 'confirmed',
          receivedAt: { gte: day.start, lte: day.end },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.escmPayment.aggregate({
        where: {
          ...paymentWhere,
          status: 'confirmed',
          receivedAt: { gte: month.start, lte: month.end },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.escmSalesTarget.findMany({
        where: { organizationId, periodKey },
      }),
      this.prisma.escmOpsAlert.count({
        where: { organizationId, status: 'open' },
      }),
    ]);

    const targetTotal = targets.reduce((s, t) => s + t.targetAmount, 0);
    const actualTotal = targets.reduce((s, t) => s + t.actualAmount, 0);
    const goalCompliance = computeGoalCompliance(actualTotal, targetTotal);

    return {
      activeProspects,
      openOpportunities,
      pipelineValue: pipelineAgg._sum.estimatedValue ?? 0,
      weightedPipeline: pipelineAgg._sum.weightedValue ?? 0,
      pendingQuotations,
      pendingOrders,
      dispatchedOrders,
      billingToday: billingDay._sum.totalAmount ?? 0,
      billingTodayCount: billingDay._count._all,
      billingMonth: billingMonth._sum.totalAmount ?? 0,
      billingMonthCount: billingMonth._count._all,
      pendingReceivables: pendingReceivables._sum.balanceAmount ?? 0,
      pendingReceivablesCount: pendingReceivables._count._all,
      collectionToday: collectionDay._sum.amount ?? 0,
      collectionTodayCount: collectionDay._count._all,
      collectionMonth: collectionMonth._sum.amount ?? 0,
      collectionMonthCount: collectionMonth._count._all,
      goalCompliance,
      targets,
      openAlerts,
      filters: filters ?? {},
      generatedAt: new Date().toISOString(),
    };
  }

  async executiveDashboard(organizationId: string, filters?: OpsFilters) {
    const ops = await this.dashboard(organizationId, filters);
    const regionMap = await this.regionMap(organizationId);
    return { ...ops, regionMap, view: 'executive' };
  }

  async commercialDashboard(organizationId: string, filters?: OpsFilters) {
    const ops = await this.dashboard(organizationId, filters);
    const [recentOrders, recentQuotations, recentOpportunities] = await Promise.all([
      this.prisma.escmSalesOrder.findMany({
        where: { organizationId },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: { customer: { select: { legalName: true, customerKey: true } } },
      }),
      this.prisma.escmQuotation.findMany({
        where: { organizationId, isCurrent: true },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
      this.prisma.escmOpportunity.findMany({
        where: { organizationId, deletedAt: null, status: 'open' },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
    ]);
    return {
      ...ops,
      recentOrders,
      recentQuotations,
      recentOpportunities,
      view: 'commercial',
    };
  }

  async regionMap(organizationId: string) {
    const customers = await this.prisma.escmCustomer.findMany({
      where: { organizationId, deletedAt: null },
      select: { regionKey: true, id: true },
    });
    const orders = await this.prisma.escmSalesOrder.findMany({
      where: { organizationId, status: { notIn: ['cancelled', 'rejected'] } },
      select: { customerId: true, totalAmount: true },
    });
    const customerRegion = new Map(customers.map((c) => [c.id, c.regionKey ?? '_unknown']));
    const map = new Map<string, { regionKey: string; sales: number; customers: number }>();
    for (const c of customers) {
      const key = c.regionKey ?? '_unknown';
      const entry = map.get(key) ?? { regionKey: key, sales: 0, customers: 0 };
      entry.customers += 1;
      map.set(key, entry);
    }
    for (const o of orders) {
      const key = customerRegion.get(o.customerId) ?? '_unknown';
      const entry = map.get(key) ?? { regionKey: key, sales: 0, customers: 0 };
      entry.sales += o.totalAmount;
      map.set(key, entry);
    }
    return [...map.values()].sort((a, b) => b.sales - a.sales);
  }

  async upsertTarget(
    organizationId: string,
    input: {
      periodKey: string;
      dimension: string;
      metricKey: string;
      targetAmount: number;
      dimensionKey?: string;
      actualAmount?: number;
    },
  ) {
    const existing = await this.prisma.escmSalesTarget.findFirst({
      where: {
        organizationId,
        periodKey: input.periodKey,
        dimension: input.dimension,
        dimensionKey: input.dimensionKey ?? null,
        metricKey: input.metricKey,
      },
    });
    if (existing) {
      return this.prisma.escmSalesTarget.update({
        where: { id: existing.id },
        data: {
          targetAmount: input.targetAmount,
          actualAmount: input.actualAmount ?? existing.actualAmount,
        },
      });
    }
    const count = await this.prisma.escmSalesTarget.count({ where: { organizationId } });
    return this.prisma.escmSalesTarget.create({
      data: {
        organizationId,
        targetKey: generateSalesTargetKey(count + 1),
        periodKey: input.periodKey,
        dimension: input.dimension,
        dimensionKey: input.dimensionKey,
        metricKey: input.metricKey,
        targetAmount: input.targetAmount,
        actualAmount: input.actualAmount ?? 0,
      },
    });
  }

  listTargets(organizationId: string, periodKey?: string) {
    return this.prisma.escmSalesTarget.findMany({
      where: { organizationId, ...(periodKey ? { periodKey } : {}) },
      orderBy: { periodKey: 'desc' },
    });
  }

  async syncTargetActuals(organizationId: string, periodKey?: string) {
    const pk = periodKey ?? periodKeyFromDate(new Date());
    const month = monthRange();
    const targets = await this.prisma.escmSalesTarget.findMany({
      where: { organizationId, periodKey: pk },
    });
    const billing = await this.prisma.escmInvoice.aggregate({
      where: {
        organizationId,
        status: { in: ['issued', 'partial'] },
        issuedAt: { gte: month.start, lte: month.end },
      },
      _sum: { totalAmount: true },
    });
    const actual = billing._sum.totalAmount ?? 0;
    for (const t of targets) {
      if (t.metricKey === 'sales' || t.metricKey === 'billing') {
        await this.prisma.escmSalesTarget.update({
          where: { id: t.id },
          data: { actualAmount: actual },
        });
      }
    }
    return { periodKey: pk, synced: targets.length, actualAmount: actual };
  }
}
