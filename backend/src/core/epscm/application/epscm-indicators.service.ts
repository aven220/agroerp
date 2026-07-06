import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { aggregateScmIndicators } from '../domain/epscm-planning.engine';
import { EpscmInventoryOptService } from './epscm-inventory-opt.service';

@Injectable()
export class EpscmIndicatorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryOpt: EpscmInventoryOptService,
  ) {}

  async dashboard(organizationId: string) {
    const [
      forecastCount, proposalCount, alertCount,
      criticalItems, obsoleteItems, classifications,
    ] = await Promise.all([
      this.prisma.epscmDemandForecastVersion.count({ where: { organizationId, isActive: true } }),
      this.prisma.epscmReplenishmentProposal.count({ where: { organizationId, status: 'proposed' } }),
      this.prisma.epscmAlert.count({ where: { organizationId, isRead: false } }),
      this.prisma.epscmInventoryClassification.count({ where: { organizationId, isCritical: true } }),
      this.prisma.epscmInventoryClassification.count({ where: { organizationId, isObsolete: true } }),
      this.prisma.epscmInventoryClassification.findMany({ where: { organizationId }, take: 500 }),
    ]);

    const avgCoverage = classifications.length
      ? classifications.reduce((s, c) => s + c.coverageDays, 0) / classifications.length
      : 0;

    const activePlan = await this.prisma.epscmSupplyPlan.findFirst({
      where: { organizationId, status: 'active' },
      include: { lines: true },
    });
    const planCompliancePct = activePlan?.lines.length ? 100 : 0;

    const inventoryIndicators = await this.inventoryOpt.latestIndicators(organizationId);

    const indicators = aggregateScmIndicators({
      forecasts: forecastCount,
      proposals: proposalCount,
      openAlerts: alertCount,
      criticalItems,
      obsoleteItems,
      avgCoverageDays: avgCoverage,
      planCompliancePct,
    });

    return {
      indicators,
      inventoryIndicators,
      recentAlerts: await this.prisma.epscmAlert.findMany({
        where: { organizationId },
        orderBy: { raisedAt: 'desc' },
        take: 10,
      }),
      recentProposals: await this.prisma.epscmReplenishmentProposal.findMany({
        where: { organizationId, status: 'proposed' },
        orderBy: { proposedAt: 'desc' },
        take: 10,
      }),
      generatedAt: new Date().toISOString(),
    };
  }

  demandPanel(organizationId: string) {
    return Promise.all([
      this.prisma.epscmDemandForecastVersion.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.epscmDemandComparison.findMany({
        where: { organizationId },
        orderBy: { computedAt: 'desc' },
        take: 50,
      }),
    ]).then(([versions, comparisons]) => ({ versions, comparisons }));
  }
}
