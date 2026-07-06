import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  bucketByDate,
  dayRange,
  monthRange,
  previousPeriod,
  weekRange,
  yearRange,
} from '../domain/escm-analytics.engine';
import type { OpsFilters } from './escm-ops-center.service';

@Injectable()
export class EscmAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async trends(organizationId: string, granularity: 'day' | 'week' | 'month' = 'day', filters?: OpsFilters) {
    const range = monthRange();
    const orders = await this.prisma.escmSalesOrder.findMany({
      where: {
        organizationId,
        status: { notIn: ['cancelled', 'rejected'] },
        createdAt: { gte: range.start, lte: range.end },
      },
      select: { createdAt: true, totalAmount: true },
    });
    const points = bucketByDate(
      orders.map((o) => ({ date: o.createdAt, value: o.totalAmount })),
      granularity,
    );
    return { granularity, points, filters: filters ?? {} };
  }

  async compare(
    organizationId: string,
    period: 'day' | 'week' | 'month' | 'year',
    filters?: OpsFilters,
  ) {
    const range =
      period === 'day' ? dayRange()
      : period === 'week' ? weekRange()
      : period === 'year' ? yearRange()
      : monthRange();
    const prev = previousPeriod(range);

    const [current, previous] = await Promise.all([
      this.sumSales(organizationId, range.start, range.end),
      this.sumSales(organizationId, prev.start, prev.end),
    ]);

    const delta = current - previous;
    const deltaPct = previous > 0 ? Number(((delta / previous) * 100).toFixed(2)) : current > 0 ? 100 : 0;

    return {
      period,
      current: { label: range.label, value: current },
      previous: { label: prev.label, value: previous },
      delta,
      deltaPct,
      filters: filters ?? {},
    };
  }

  private async sumSales(organizationId: string, start: Date, end: Date) {
    const agg = await this.prisma.escmSalesOrder.aggregate({
      where: {
        organizationId,
        status: { notIn: ['cancelled', 'rejected'] },
        createdAt: { gte: start, lte: end },
      },
      _sum: { totalAmount: true },
    });
    return agg._sum.totalAmount ?? 0;
  }

  async topProducts(organizationId: string, limit = 20) {
    const lines = await this.prisma.escmSalesOrderLine.findMany({
      where: { order: { organizationId, status: { notIn: ['cancelled', 'rejected'] } } },
      select: { itemKey: true, lineTotal: true, quantity: true },
    });
    const map = new Map<string, { itemKey: string; revenue: number; qty: number }>();
    for (const l of lines) {
      const e = map.get(l.itemKey) ?? { itemKey: l.itemKey, revenue: 0, qty: 0 };
      e.revenue += l.lineTotal;
      e.qty += l.quantity;
      map.set(l.itemKey, e);
    }
    const sorted = [...map.values()].sort((a, b) => b.revenue - a.revenue);
    return {
      top: sorted.slice(0, limit),
      bottom: [...sorted].reverse().slice(0, limit),
    };
  }

  async customerInsights(organizationId: string) {
    const customers = await this.prisma.escmCustomer.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true, customerKey: true, legalName: true, regionKey: true },
    });
    const [orders, receivables, payments] = await Promise.all([
      this.prisma.escmSalesOrder.groupBy({
        by: ['customerId'],
        where: { organizationId, status: { notIn: ['cancelled', 'rejected'] } },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      this.prisma.escmReceivable.groupBy({
        by: ['customerId'],
        where: { organizationId, status: { in: ['open', 'partial', 'overdue'] } },
        _sum: { balanceAmount: true },
        _count: { _all: true },
      }),
      this.prisma.escmPayment.groupBy({
        by: ['customerId'],
        where: { organizationId, status: 'confirmed' },
        _sum: { amount: true },
      }),
    ]);

    const orderMap = new Map(orders.map((o) => [o.customerId, o]));
    const arMap = new Map(receivables.map((r) => [r.customerId, r]));
    const payMap = new Map(payments.map((p) => [p.customerId, p]));

    const scored = customers.map((c) => {
      const sales = orderMap.get(c.id)?._sum.totalAmount ?? 0;
      const paid = payMap.get(c.id)?._sum.amount ?? 0;
      const ar = arMap.get(c.id)?._sum.balanceAmount ?? 0;
      const orderCount = orderMap.get(c.id)?._count._all ?? 0;
      const score = sales - ar + paid * 0.1;
      const riskScore = ar > sales * 0.5 ? 80 : ar > 0 ? 40 : 10;
      return {
        customerKey: c.customerKey,
        legalName: c.legalName,
        regionKey: c.regionKey,
        sales,
        paid,
        receivables: ar,
        orderCount,
        profitabilityScore: Number(score.toFixed(2)),
        riskScore,
      };
    });

    const profitable = [...scored].sort((a, b) => b.profitabilityScore - a.profitabilityScore).slice(0, 20);
    const atRisk = [...scored]
      .filter((s) => s.riskScore >= 40 || (s.receivables > 0 && s.orderCount === 0))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 20);

    return { profitable, atRisk };
  }

  async sellerEffectiveness(organizationId: string) {
    const customers = await this.prisma.escmCustomer.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true, assignedUserId: true },
    });
    const custSeller = new Map(customers.map((c) => [c.id, c.assignedUserId ?? '_unassigned']));
    const orders = await this.prisma.escmSalesOrder.findMany({
      where: { organizationId, status: { notIn: ['cancelled', 'rejected'] } },
      select: { customerId: true, totalAmount: true, createdBy: true },
    });
    const opps = await this.prisma.escmOpportunity.groupBy({
      by: ['assignedUserId', 'status'],
      where: { organizationId, deletedAt: null },
      _count: { _all: true },
    });

    const sellerMap = new Map<string, { sellerId: string; sales: number; orders: number; won: number; lost: number; open: number }>();
    for (const o of orders) {
      const seller = custSeller.get(o.customerId) ?? o.createdBy ?? '_unassigned';
      const e = sellerMap.get(seller) ?? { sellerId: seller, sales: 0, orders: 0, won: 0, lost: 0, open: 0 };
      e.sales += o.totalAmount;
      e.orders += 1;
      sellerMap.set(seller, e);
    }
    for (const o of opps) {
      const seller = o.assignedUserId ?? '_unassigned';
      const e = sellerMap.get(seller) ?? { sellerId: seller, sales: 0, orders: 0, won: 0, lost: 0, open: 0 };
      if (o.status === 'won') e.won += o._count._all;
      else if (o.status === 'lost') e.lost += o._count._all;
      else if (o.status === 'open') e.open += o._count._all;
      sellerMap.set(seller, e);
    }

    return [...sellerMap.values()]
      .map((s) => ({
        ...s,
        winRate: s.won + s.lost > 0 ? Number(((s.won / (s.won + s.lost)) * 100).toFixed(2)) : 0,
        avgOrderValue: s.orders > 0 ? Number((s.sales / s.orders).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.sales - a.sales);
  }

  async fullAnalysis(organizationId: string, filters?: OpsFilters) {
    const [trendsDay, compareDay, compareWeek, compareMonth, compareYear, products, customers, sellers] =
      await Promise.all([
        this.trends(organizationId, 'day', filters),
        this.compare(organizationId, 'day', filters),
        this.compare(organizationId, 'week', filters),
        this.compare(organizationId, 'month', filters),
        this.compare(organizationId, 'year', filters),
        this.topProducts(organizationId),
        this.customerInsights(organizationId),
        this.sellerEffectiveness(organizationId),
      ]);
    return {
      trends: trendsDay,
      comparisons: { day: compareDay, week: compareWeek, month: compareMonth, year: compareYear },
      products,
      customers,
      sellers,
      filters: filters ?? {},
    };
  }
}
