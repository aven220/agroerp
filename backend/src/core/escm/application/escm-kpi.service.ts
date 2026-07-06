import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  computeAverage,
  computeConversionRate,
  computeDaysBetween,
  groupSumByKey,
  monthRange,
} from '../domain/escm-analytics.engine';
import type { OpsFilters } from './escm-ops-center.service';

@Injectable()
export class EscmKpiService {
  constructor(private readonly prisma: PrismaService) {}

  async computeAll(organizationId: string, filters?: OpsFilters) {
    const month = monthRange();
    const [
      prospects,
      convertedProspects,
      quotations,
      convertedQuotations,
      orders,
      invoices,
      payments,
      customers,
      orderLines,
      wonOpps,
    ] = await Promise.all([
      this.prisma.escmProspect.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.escmProspect.count({
        where: { organizationId, deletedAt: null, status: 'converted' },
      }),
      this.prisma.escmQuotation.count({ where: { organizationId, isCurrent: true } }),
      this.prisma.escmQuotation.count({
        where: { organizationId, isCurrent: true, status: 'converted' },
      }),
      this.prisma.escmSalesOrder.findMany({
        where: {
          organizationId,
          status: { notIn: ['cancelled', 'rejected'] },
          createdAt: { gte: month.start, lte: month.end },
        },
        select: {
          totalAmount: true,
          createdAt: true,
          updatedAt: true,
          customerId: true,
          createdBy: true,
        },
      }),
      this.prisma.escmInvoice.findMany({
        where: {
          organizationId,
          status: { in: ['issued', 'partial'] },
          issuedAt: { gte: month.start, lte: month.end },
        },
        select: { totalAmount: true, customerId: true, issuedAt: true, createdAt: true },
      }),
      this.prisma.escmPayment.findMany({
        where: {
          organizationId,
          status: 'confirmed',
          receivedAt: { gte: month.start, lte: month.end },
        },
        select: { amount: true, receivedAt: true, createdAt: true, customerId: true },
      }),
      this.prisma.escmCustomer.findMany({
        where: { organizationId, deletedAt: null },
        select: { id: true, customerKey: true, regionKey: true, assignedUserId: true },
      }),
      this.prisma.escmSalesOrderLine.findMany({
        where: {
          order: { organizationId, status: { notIn: ['cancelled', 'rejected'] } },
        },
        select: { itemKey: true, lineTotal: true, quantity: true },
      }),
      this.prisma.escmOpportunity.findMany({
        where: { organizationId, deletedAt: null, status: 'won' },
        select: { createdAt: true, closedAt: true },
      }),
    ]);

    const customerMap = new Map(customers.map((c) => [c.id, c]));
    const orderAmounts = orders.map((o) => o.totalAmount);
    const avgSaleValue = computeAverage(orderAmounts);

    const salesBySeller = groupSumByKey(
      orders,
      (o) => customerMap.get(o.customerId)?.assignedUserId ?? o.createdBy ?? '_unknown',
      (o) => o.totalAmount,
    );
    const salesByRegion = groupSumByKey(
      orders,
      (o) => customerMap.get(o.customerId)?.regionKey ?? '_unknown',
      (o) => o.totalAmount,
    );
    const salesByCustomer = groupSumByKey(
      orders,
      (o) => customerMap.get(o.customerId)?.customerKey ?? o.customerId,
      (o) => o.totalAmount,
    );
    const salesByProduct = groupSumByKey(orderLines, (l) => l.itemKey, (l) => l.lineTotal);

    const invoiceTotal = invoices.reduce((s, i) => s + i.totalAmount, 0);
    const paymentTotal = payments.reduce((s, p) => s + p.amount, 0);
    const profitability = invoiceTotal > 0 ? Number(((paymentTotal / invoiceTotal) * 100).toFixed(2)) : 0;

    const closeTimes = wonOpps
      .filter((o) => o.closedAt)
      .map((o) => computeDaysBetween(o.createdAt, o.closedAt!));
    const avgCloseTime = computeAverage(closeTimes);

    const collectionTimes = await this.computeCollectionTimes(organizationId);
    const customerRotation = await this.computeCustomerRotation(organizationId);

    return {
      prospectConversion: computeConversionRate(convertedProspects, prospects),
      quotationConversion: computeConversionRate(convertedQuotations, quotations),
      averageSaleValue: avgSaleValue,
      salesBySeller,
      salesByRegion,
      salesByCustomer: salesByCustomer.slice(0, 50),
      salesByProduct: salesByProduct.slice(0, 50),
      profitability,
      averageCloseTimeDays: avgCloseTime,
      averageCollectionTimeDays: collectionTimes,
      customerRotation,
      filters: filters ?? {},
      period: month.label,
    };
  }

  private async computeCollectionTimes(organizationId: string) {
    const receivables = await this.prisma.escmReceivable.findMany({
      where: { organizationId, status: 'paid' },
      select: { dueDate: true, updatedAt: true },
      take: 500,
    });
    if (!receivables.length) return 0;
    const days = receivables.map((r) => computeDaysBetween(r.dueDate, r.updatedAt));
    return computeAverage(days);
  }

  private async computeCustomerRotation(organizationId: string) {
    const month = monthRange();
    const prevStart = new Date(month.start);
    prevStart.setMonth(prevStart.getMonth() - 1);
    const prevEnd = new Date(month.start.getTime() - 1);
    const [current, previous] = await Promise.all([
      this.prisma.escmSalesOrder.groupBy({
        by: ['customerId'],
        where: { organizationId, createdAt: { gte: month.start, lte: month.end } },
      }),
      this.prisma.escmSalesOrder.groupBy({
        by: ['customerId'],
        where: { organizationId, createdAt: { gte: prevStart, lte: prevEnd } },
      }),
    ]);
    const prevSet = new Set(previous.map((p) => p.customerId));
    const retained = current.filter((c) => prevSet.has(c.customerId)).length;
    return previous.length > 0 ? computeConversionRate(retained, previous.length) : 0;
  }
}
