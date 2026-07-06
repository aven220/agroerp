import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { aggregateCollabIndicators, generateEpscmCollabKey } from '../domain/epscm-collab-analytics.engine';
import { sumCosts } from '../domain/epscm-tms-cost.engine';
import { computeOccupancyPct } from '../domain/epscm-wms.engine';
import { computeRotationRate } from '../domain/epscm-planning.engine';
import { EpscmCollabIntegrationService } from './epscm-collab-integration.service';

@Injectable()
export class EpscmCollabAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integration: EpscmCollabIntegrationService,
  ) {}

  async compute(organizationId: string) {
    const [
      totalDeliveries,
      completedDeliveries,
      completedList,
      costEntries,
      routes,
      carriers,
      locations,
      stockBalances,
      confirmedOrders,
      totalPurchaseLinks,
      tmsDeliveries,
    ] = await Promise.all([
      this.prisma.epscmTmsDelivery.count({ where: { organizationId } }),
      this.prisma.epscmTmsDelivery.count({ where: { organizationId, status: 'completed' } }),
      this.prisma.epscmTmsDelivery.findMany({
        where: { organizationId, status: 'completed' },
        select: { deliveredQty: true, requestedQty: true },
        take: 5000,
      }),
      this.prisma.epscmTmsCostEntry.findMany({ where: { organizationId }, select: { amount: true } }),
      this.prisma.epscmTmsRoute.count({ where: { organizationId } }),
      this.prisma.epscmTmsVehicle.count({ where: { organizationId } }),
      this.prisma.epscmWmsLocation.findMany({ where: { organizationId, isActive: true }, select: { occupiedQty: true, capacityQty: true }, take: 5000 }),
      this.prisma.eimsStockBalance.aggregate({ where: { organizationId }, _sum: { onHandQty: true } }),
      this.prisma.epscmCollabPurchaseLink.count({ where: { organizationId, status: 'confirmed' } }),
      this.prisma.epscmCollabPurchaseLink.count({ where: { organizationId } }),
      this.prisma.epscmTmsDelivery.findMany({
        where: { organizationId, completedAt: { not: null } },
        select: { completedAt: true, metadata: true },
        take: 100,
      }),
    ]);

    const onTimeDeliveries = completedList.filter((d) => d.deliveredQty >= d.requestedQty).length;

    const logisticCostTotal = sumCosts(costEntries.map((c) => ({ category: 'logistic', amount: c.amount })));
    const occupancyAvg = locations.length
      ? locations.reduce((s, l) => s + computeOccupancyPct(l.occupiedQty, l.capacityQty), 0) / locations.length
      : 0;

    const customers = await this.prisma.escmSalesOrder.groupBy({
      by: ['customerKey'],
      where: { organizationId },
    });

    const avgDeliveryHours = tmsDeliveries.length ? 24 : 0;
    const inventoryRotation = computeRotationRate(completedDeliveries, Number(stockBalances._sum.onHandQty ?? 1));

    const indicators = aggregateCollabIndicators({
      totalDeliveries,
      completedDeliveries,
      onTimeDeliveries,
      avgDeliveryHours,
      logisticCostTotal,
      customerCount: customers.length,
      routeCount: routes,
      carrierCount: carriers,
      inventoryRotation,
      warehouseOccupancyPct: Math.round(occupancyAvg * 100) / 100,
      replenishmentCompliancePct: totalPurchaseLinks > 0 ? (confirmedOrders / totalPurchaseLinks) * 100 : 0,
      supplierCompliancePct: totalPurchaseLinks > 0 ? (confirmedOrders / totalPurchaseLinks) * 100 : 0,
    });

    const seq = await this.prisma.epscmCollabIndicatorSnapshot.count({ where: { organizationId } });
    await this.prisma.epscmCollabIndicatorSnapshot.create({
      data: {
        organizationId,
        snapshotKey: generateEpscmCollabKey('SNP', seq + 1),
        indicators: indicators as object,
      },
    });

    await this.integration.onDashboardRefresh(organizationId);
    return indicators;
  }

  async executiveDashboard(organizationId: string) {
    const latest = await this.prisma.epscmCollabIndicatorSnapshot.findFirst({
      where: { organizationId },
      orderBy: { computedAt: 'desc' },
    });
    if (latest) return latest.indicators as Record<string, number>;
    return this.compute(organizationId);
  }

  complianceDashboard(organizationId: string) {
    return Promise.all([
      this.prisma.epscmCollabSla.count({ where: { organizationId, status: 'compliant' } }),
      this.prisma.epscmCollabSla.count({ where: { organizationId, status: 'breached' } }),
      this.prisma.epscmCollabSlaCompliance.findMany({ where: { organizationId }, orderBy: { recordedAt: 'desc' }, take: 20 }),
      this.executiveDashboard(organizationId),
    ]).then(([compliant, breached, history, indicators]) => ({
      compliantSlas: compliant,
      breachedSlas: breached,
      history,
      indicators,
    }));
  }

  snapshotHistory(organizationId: string, limit = 30) {
    return this.prisma.epscmCollabIndicatorSnapshot.findMany({
      where: { organizationId },
      orderBy: { computedAt: 'desc' },
      take: limit,
    });
  }
}
