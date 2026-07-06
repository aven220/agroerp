import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { computeAverage, monthRange, previousPeriod } from '../domain/escm-analytics.engine';

@Injectable()
export class EscmAiInsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async insights(organizationId: string) {
    const [salesForecast, collectionForecast, churnRisk, recommendations, anomalies, priorityOpps] =
      await Promise.all([
        this.forecastSales(organizationId),
        this.forecastCollection(organizationId),
        this.predictChurn(organizationId),
        this.commercialRecommendations(organizationId),
        this.detectAnomalies(organizationId),
        this.prioritizeOpportunities(organizationId),
      ]);

    return {
      salesForecast,
      collectionForecast,
      churnRisk,
      recommendations,
      anomalies,
      priorityOpportunities: priorityOpps,
      modelVersion: 'escm-ai-v1',
      generatedAt: new Date().toISOString(),
    };
  }

  private async forecastSales(organizationId: string) {
    const month = monthRange();
    const prev = previousPeriod(month);
    const [cur, previous] = await Promise.all([
      this.prisma.escmSalesOrder.aggregate({
        where: { organizationId, createdAt: { gte: month.start, lte: month.end }, status: { notIn: ['cancelled', 'rejected'] } },
        _sum: { totalAmount: true },
      }),
      this.prisma.escmSalesOrder.aggregate({
        where: { organizationId, createdAt: { gte: prev.start, lte: prev.end }, status: { notIn: ['cancelled', 'rejected'] } },
        _sum: { totalAmount: true },
      }),
    ]);
    const current = cur._sum.totalAmount ?? 0;
    const prevVal = previous._sum.totalAmount ?? 0;
    const growth = prevVal > 0 ? (current - prevVal) / prevVal : 0;
    const daysInMonth = month.end.getDate();
    const dayOfMonth = new Date().getDate();
    const runRate = dayOfMonth > 0 ? current / dayOfMonth : 0;
    const projected = Number((runRate * daysInMonth * (1 + growth * 0.5)).toFixed(2));
    return {
      currentMonthToDate: current,
      projectedMonthEnd: projected,
      confidence: 0.72,
      method: 'run_rate_with_growth',
    };
  }

  private async forecastCollection(organizationId: string) {
    const month = monthRange();
    const openAr = await this.prisma.escmReceivable.aggregate({
      where: { organizationId, status: { in: ['open', 'partial', 'overdue'] } },
      _sum: { balanceAmount: true },
    });
    const collected = await this.prisma.escmPayment.aggregate({
      where: { organizationId, status: 'confirmed', receivedAt: { gte: month.start, lte: month.end } },
      _sum: { amount: true },
    });
    const open = openAr._sum.balanceAmount ?? 0;
    const mtd = collected._sum.amount ?? 0;
    const projected = Number((mtd + open * 0.35).toFixed(2));
    return {
      collectedMonthToDate: mtd,
      openReceivables: open,
      projectedMonthEnd: projected,
      confidence: 0.68,
      method: 'mtd_plus_ar_recovery',
    };
  }

  private async predictChurn(organizationId: string) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3);
    const customers = await this.prisma.escmCustomer.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true, customerKey: true, legalName: true },
    });
    const recentOrders = await this.prisma.escmSalesOrder.groupBy({
      by: ['customerId'],
      where: { organizationId, createdAt: { gte: cutoff } },
      _count: { _all: true },
    });
    const activeSet = new Set(recentOrders.map((o) => o.customerId));
    const atRisk = customers
      .filter((c) => !activeSet.has(c.id))
      .slice(0, 30)
      .map((c) => ({
        customerKey: c.customerKey,
        legalName: c.legalName,
        churnProbability: 0.75,
        reason: 'sin_actividad_90d',
      }));
    return atRisk;
  }

  private async commercialRecommendations(organizationId: string) {
    const recs: Array<{ type: string; message: string; priority: number }> = [];
    const overdue = await this.prisma.escmReceivable.count({ where: { organizationId, status: 'overdue' } });
    if (overdue > 0) {
      recs.push({ type: 'collection', message: `Priorizar cobro de ${overdue} documentos vencidos`, priority: 1 });
    }
    const pendingQuotes = await this.prisma.escmQuotation.count({
      where: { organizationId, isCurrent: true, status: 'approved' },
    });
    if (pendingQuotes > 0) {
      recs.push({ type: 'conversion', message: `Convertir ${pendingQuotes} cotizaciones aprobadas a pedido`, priority: 2 });
    }
    const openOpps = await this.prisma.escmOpportunity.findMany({
      where: { organizationId, status: 'open' },
      orderBy: { weightedValue: 'desc' },
      take: 5,
    });
    for (const o of openOpps) {
      recs.push({
        type: 'opportunity',
        message: `Dar seguimiento a oportunidad ${o.opportunityKey} (${o.weightedValue})`,
        priority: 3,
      });
    }
    return recs.sort((a, b) => a.priority - b.priority);
  }

  private async detectAnomalies(organizationId: string) {
    const month = monthRange();
    const daily: number[] = [];
    for (let d = 1; d <= Math.min(28, month.end.getDate()); d += 1) {
      const start = new Date(month.start.getFullYear(), month.start.getMonth(), d);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      const agg = await this.prisma.escmSalesOrder.aggregate({
        where: { organizationId, createdAt: { gte: start, lte: end }, status: { notIn: ['cancelled', 'rejected'] } },
        _sum: { totalAmount: true },
      });
      daily.push(agg._sum.totalAmount ?? 0);
    }
    const avg = computeAverage(daily);
    const today = daily[daily.length - 1] ?? 0;
    const flagged = Math.abs(today - avg) > avg * 0.4;
    return flagged
      ? [{ metric: 'daily_sales', value: today, expected: avg, severity: 'warning' }]
      : [];
  }

  private async prioritizeOpportunities(organizationId: string) {
    const opps = await this.prisma.escmOpportunity.findMany({
      where: { organizationId, deletedAt: null, status: 'open' },
      orderBy: [{ weightedValue: 'desc' }, { expectedCloseDate: 'asc' }],
      take: 20,
    });
    return opps.map((o, i) => ({
      opportunityKey: o.opportunityKey,
      title: o.title,
      weightedValue: o.weightedValue,
      priorityScore: Number((100 - i * 3 + o.probability * 0.5).toFixed(2)),
      expectedCloseDate: o.expectedCloseDate?.toISOString() ?? null,
    }));
  }
}
