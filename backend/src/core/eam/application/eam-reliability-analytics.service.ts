import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  aggregateAssetAnalytics,
  aggregatePlantAvailability,
  computeMaintenanceCompliance,
  generateEamReliabilityKey,
} from '../domain/eam-reliability.engine';
import { EamAuditService } from './eam-audit.service';

@Injectable()
export class EamReliabilityAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EamAuditService,
  ) {}

  async compute(organizationId: string, userId: string) {
    const assets = await this.prisma.eamAsset.findMany({ where: { organizationId } });
    const events = await this.prisma.eamReliabilityEvent.findMany({ where: { organizationId } });
    const costs = await this.prisma.eamWorkOrderCost.findMany({ where: { organizationId } });
    const workOrders = await this.prisma.eamMaintWorkOrder.findMany({ where: { organizationId } });
    const plans = await this.prisma.eamMaintPlan.findMany({ where: { organizationId, isActive: true } });
    const snapshots = await this.prisma.eamReliabilitySnapshot.findMany({
      where: { organizationId, assetKey: { not: null } },
    });

    const rows = assets.map((a) => {
      const assetEvents = events.filter((e) => e.assetKey === a.assetKey);
      const assetCosts = costs.filter((c) => c.assetKey === a.assetKey);
      return {
        assetKey: a.assetKey,
        totalCost: assetCosts.reduce((s, c) => s + c.amount, 0),
        failureCount: assetEvents.length,
        downtimeHours: assetEvents.reduce((s, e) => s + e.downtimeHours, 0),
        familyKey: a.familyKey ?? undefined,
        locationKey: a.locationKey ?? undefined,
      };
    });

    const analytics = aggregateAssetAnalytics(rows);
    const plantAvailability = aggregatePlantAvailability(
      snapshots.map((s) => ({
        plantKey: (s.metadata as { plantKey?: string })?.plantKey ?? s.assetKey ?? 'default',
        availability: ((s.indicators as { availability?: number })?.availability) ?? 100,
      })),
    );
    const completed = workOrders.filter((w) => w.status === 'administratively_closed').length;
    const maintenanceCompliance = computeMaintenanceCompliance(plans.length, completed);

    const result = {
      ...analytics,
      plantAvailability,
      maintenanceCompliance,
      historicalTrend: {
        totalAssets: assets.length,
        totalFailures: events.length,
        totalMaintCost: costs.reduce((s, c) => s + c.amount, 0),
      },
    };

    const snapshot = await this.prisma.eamAnalyticsSnapshot.upsert({
      where: { organizationId_snapshotKey: { organizationId, snapshotKey: 'analytics-summary' } },
      create: { organizationId, snapshotKey: 'analytics-summary', analytics: result as object },
      update: { analytics: result as object, computedAt: new Date() },
    });
    await this.audit.log(organizationId, 'EamAnalyticsSnapshot', snapshot.snapshotKey, 'updated', userId, {});
    return { analytics: result, snapshot };
  }

  async get(organizationId: string) {
    const snap = await this.prisma.eamAnalyticsSnapshot.findFirst({
      where: { organizationId, snapshotKey: 'analytics-summary' },
    });
    if (snap) return snap.analytics;
    return {};
  }
}
