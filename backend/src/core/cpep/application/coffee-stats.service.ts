import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoffeeOpsService } from './coffee-ops.service';
import {
  avg,
  comparePeriods,
  dayKey,
  groupCount,
  groupSum,
  monthKey,
  percent,
  periodRange,
  startOfDay,
  sum,
  weekKey,
  yearKey,
} from '../domain/analytics.engine';

@Injectable()
export class CoffeeStatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ops: CoffeeOpsService,
  ) {}

  async purchasesToday(organizationId: string) {
    const start = startOfDay();
    return this.prisma.cpepReceptionTicket.findMany({
      where: { organizationId, createdAt: { gte: start } },
      include: { quality: true, settlement: true, queueTurn: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async kpis(organizationId: string, days = 30, userId?: string) {
    const since = new Date(Date.now() - days * 86_400_000);
    const [tickets, settlements, quality] = await Promise.all([
      this.prisma.cpepReceptionTicket.findMany({
        where: { organizationId, createdAt: { gte: since } },
        select: {
          status: true,
          netWeightKg: true,
          createdAt: true,
          createdBy: true,
          purchaseCenterId: true,
          producerId: true,
          producerName: true,
          farmId: true,
          farmName: true,
          lotCode: true,
        },
      }),
      this.prisma.cpepSettlement.findMany({
        where: { organizationId, createdAt: { gte: since }, voided: false },
        select: {
          totalAmount: true,
          paidAmount: true,
          paymentStatus: true,
          basePricePerKg: true,
          appliedPricePerKg: true,
          bonusesTotal: true,
          penaltiesTotal: true,
          netWeightKg: true,
          settledBy: true,
        },
      }),
      this.prisma.cpepQualityAssessment.findMany({
        where: { organizationId, assessedAt: { gte: since } },
        select: { grade: true, humidityPct: true, factor: true, decision: true },
      }),
    ]);

    const inventory = await this.prisma.cpepInventoryMovement.aggregate({
      where: { organizationId, postedAt: { gte: since } },
      _sum: { quantityKg: true, totalCost: true },
      _count: { id: true },
    });

    const kg = sum(tickets.map((t) => t.netWeightKg ?? 0));
    const amount = sum(settlements.map((r) => r.totalAmount));
    const paid = sum(settlements.map((r) => r.paidAmount));
    const rejects = quality.filter((q) => q.decision === 'rejected' || q.grade === 'reject').length;
    const humidity = quality.map((q) => q.humidityPct).filter((v): v is number => v != null);
    const factor = quality.map((q) => q.factor).filter((v): v is number => v != null);
    const prices = settlements.map((s) => s.appliedPricePerKg ?? s.basePricePerKg);

    const byOperator = groupSum(
      settlements.filter((s) => s.settledBy),
      (s) => s.settledBy!,
      (s) => s.totalAmount,
    );
    const byCenter = groupSum(
      tickets.filter((t) => t.purchaseCenterId),
      (t) => t.purchaseCenterId!,
      (t) => t.netWeightKg ?? 0,
    );
    const byProducer = groupSum(
      tickets.filter((t) => t.producerName || t.producerId),
      (t) => t.producerName ?? t.producerId!,
      (t) => t.netWeightKg ?? 0,
    );
    const byFarm = groupSum(
      tickets.filter((t) => t.farmName || t.farmId),
      (t) => t.farmName ?? t.farmId!,
      (t) => t.netWeightKg ?? 0,
    );

    const result = {
      periodDays: days,
      tickets: tickets.length,
      kgTotal: kg,
      amountTotal: amount,
      paidTotal: paid,
      pendingPayment: amount - paid,
      avgPricePerKg: avg(prices),
      avgHumidity: avg(humidity),
      avgFactor: avg(factor),
      rejectRate: percent(rejects, quality.length || 1),
      rejects,
      bonusesTotal: sum(settlements.map((s) => s.bonusesTotal)),
      penaltiesTotal: sum(settlements.map((s) => s.penaltiesTotal)),
      byStatus: groupCount(tickets, (t) => t.status),
      byGrade: groupCount(quality, (q) => q.grade),
      byOperator,
      byCenter,
      byProducer,
      byFarm,
      byMunicipality: byFarm,
      inventoryKg: inventory._sum.quantityKg ?? 0,
      inventoryCost: inventory._sum.totalCost ?? 0,
      inventoryMovements: inventory._count.id,
    };

    if (userId) {
      await this.ops.logAnalytics(organizationId, userId, 'query', 'kpis', { days });
    }
    return result;
  }

  async statistics(organizationId: string, userId?: string) {
    const [today, week, month, year] = await Promise.all([
      this.kpis(organizationId, 1),
      this.kpis(organizationId, 7),
      this.kpis(organizationId, 30),
      this.kpis(organizationId, 365),
    ]);
    if (userId) {
      await this.ops.logAnalytics(organizationId, userId, 'query', 'statistics', {});
    }
    return { today, week, month, year };
  }

  async analytics(organizationId: string, userId?: string) {
    const sinceYear = new Date(Date.now() - 365 * 86_400_000);
    const tickets = await this.prisma.cpepReceptionTicket.findMany({
      where: { organizationId, createdAt: { gte: sinceYear } },
      include: { quality: true, settlement: true },
      orderBy: { createdAt: 'asc' },
    });
    const settlements = tickets.map((t) => t.settlement).filter(Boolean);

    const daily = groupSum(tickets, (t) => dayKey(t.createdAt), (t) => t.netWeightKg ?? 0);
    const weekly = groupSum(tickets, (t) => weekKey(t.createdAt), (t) => t.netWeightKg ?? 0);
    const monthly = groupSum(tickets, (t) => monthKey(t.createdAt), (t) => t.netWeightKg ?? 0);
    const yearly = groupSum(tickets, (t) => yearKey(t.createdAt), (t) => t.netWeightKg ?? 0);

    const amountDaily = groupSum(
      settlements as Array<{ createdAt: Date; totalAmount: number }>,
      (s) => dayKey(s.createdAt),
      (s) => s.totalAmount,
    );
    const priceDaily = Object.entries(
      (settlements as Array<{ createdAt: Date; basePricePerKg: number; appliedPricePerKg: number | null }>).reduce<
        Record<string, number[]>
      >((acc, s) => {
        const key = dayKey(s.createdAt);
        acc[key] = acc[key] ?? [];
        acc[key].push(s.appliedPricePerKg ?? s.basePricePerKg);
        return acc;
      }, {}),
    ).map(([day, values]) => ({ day, avgPrice: avg(values) }));

    const producerActivity = groupCount(
      tickets.filter((t) => t.producerName || t.producerId),
      (t) => t.producerName ?? t.producerId!,
    );
    const frequentProducers = Object.entries(producerActivity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ name, count }));

    const activeProducerKeys = new Set(Object.keys(producerActivity));
    const allProducers = await this.prisma.producer.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true, legalName: true, commercialName: true },
      take: 500,
    });
    const inactiveProducers = allProducers
      .filter(
        (p) =>
          !activeProducerKeys.has(p.legalName) &&
          !activeProducerKeys.has(p.commercialName ?? '') &&
          !activeProducerKeys.has(p.id),
      )
      .slice(0, 50)
      .map((p) => ({ id: p.id, name: p.commercialName ?? p.legalName }));

    const centersVolume = groupSum(
      tickets.filter((t) => t.purchaseCenterId),
      (t) => t.purchaseCenterId!,
      (t) => t.netWeightKg ?? 0,
    );
    const topCenters = Object.entries(centersVolume)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([centerId, kg]) => ({ centerId, kg }));

    const qualityByZone = groupSum(
      tickets.filter((t) => t.farmName && t.quality?.qualityScore != null),
      (t) => t.farmName!,
      (t) => t.quality!.qualityScore!,
    );
    const qualityZoneAvg = Object.entries(
      tickets
        .filter((t) => t.farmName && t.quality?.qualityScore != null)
        .reduce<Record<string, number[]>>((acc, t) => {
          const key = t.farmName!;
          acc[key] = acc[key] ?? [];
          acc[key].push(t.quality!.qualityScore!);
          return acc;
        }, {}),
    ).map(([zone, scores]) => ({ zone, avgScore: avg(scores), samples: scores.length }));

    const currentMonth = await this.kpis(organizationId, 30);
    const previousMonth = await this.kpis(organizationId, 60);
    const previousOnly = {
      kgTotal: Math.max(0, previousMonth.kgTotal - currentMonth.kgTotal),
      amountTotal: Math.max(0, previousMonth.amountTotal - currentMonth.amountTotal),
      tickets: Math.max(0, previousMonth.tickets - currentMonth.tickets),
      avgPricePerKg: previousMonth.avgPricePerKg,
      rejectRate: previousMonth.rejectRate,
    };

    if (userId) {
      await this.ops.logAnalytics(organizationId, userId, 'query', 'analytics', {});
    }

    return {
      trends: {
        daily: Object.entries(daily).map(([day, kg]) => ({ day, kg, amount: amountDaily[day] ?? 0 })),
        weekly: Object.entries(weekly).map(([week, kg]) => ({ week, kg })),
        monthly: Object.entries(monthly).map(([month, kg]) => ({ month, kg })),
        yearly: Object.entries(yearly).map(([year, kg]) => ({ year, kg })),
        prices: priceDaily,
      },
      comparatives: comparePeriods(
        {
          kgTotal: currentMonth.kgTotal,
          amountTotal: currentMonth.amountTotal,
          tickets: currentMonth.tickets,
          avgPricePerKg: currentMonth.avgPricePerKg,
          rejectRate: currentMonth.rejectRate,
        },
        previousOnly,
      ),
      frequentProducers,
      inactiveProducers,
      topCenters,
      qualityByZone: qualityZoneAvg,
      heatMap: Object.entries(daily).map(([day, kg]) => ({
        day,
        hourBuckets: groupCount(
          tickets.filter((t) => dayKey(t.createdAt) === day),
          (t) => String(t.createdAt.getHours()),
        ),
        kg,
      })),
    };
  }

  async comparePeriods(
    organizationId: string,
    currentDays = 30,
    previousDays = 30,
    userId?: string,
  ) {
    const current = await this.kpis(organizationId, currentDays);
    const previousWindow = await this.kpis(organizationId, currentDays + previousDays);
    const previous = {
      kgTotal: Math.max(0, previousWindow.kgTotal - current.kgTotal),
      amountTotal: Math.max(0, previousWindow.amountTotal - current.amountTotal),
      tickets: Math.max(0, previousWindow.tickets - current.tickets),
      avgPricePerKg: previousWindow.avgPricePerKg,
      avgHumidity: previousWindow.avgHumidity,
      avgFactor: previousWindow.avgFactor,
      rejectRate: previousWindow.rejectRate,
      bonusesTotal: Math.max(0, previousWindow.bonusesTotal - current.bonusesTotal),
      penaltiesTotal: Math.max(0, previousWindow.penaltiesTotal - current.penaltiesTotal),
    };
    if (userId) {
      await this.ops.logAnalytics(organizationId, userId, 'query', 'compare_periods', {
        currentDays,
        previousDays,
      });
    }
    return {
      current,
      previous,
      delta: comparePeriods(
        {
          kgTotal: current.kgTotal,
          amountTotal: current.amountTotal,
          tickets: current.tickets,
          avgPricePerKg: current.avgPricePerKg,
          avgHumidity: current.avgHumidity,
          avgFactor: current.avgFactor,
          rejectRate: current.rejectRate,
          bonusesTotal: current.bonusesTotal,
          penaltiesTotal: current.penaltiesTotal,
        },
        previous,
      ),
    };
  }

  periodBounds(period: 'day' | 'week' | 'month' | 'year', days?: number) {
    return periodRange(period, days);
  }
}
