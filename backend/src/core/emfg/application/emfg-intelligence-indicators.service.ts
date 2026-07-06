import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { aggregateIntelligenceIndicators, aggregateProductionKpis } from '../domain/emfg-intelligence.engine';
import { EmfgIntelligenceKpiService } from './emfg-intelligence-kpi.service';
import { EmfgIntelligenceOeeService } from './emfg-intelligence-oee.service';
import { EmfgIntelligenceAnalyticsService } from './emfg-intelligence-analytics.service';

@Injectable()
export class EmfgIntelligenceIndicatorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kpi: EmfgIntelligenceKpiService,
    private readonly oee: EmfgIntelligenceOeeService,
    private readonly analytics: EmfgIntelligenceAnalyticsService,
  ) {}

  async executiveDashboard(organizationId: string) {
    const [kpiData, oeeSnapshots, alertCount, recentOee] = await Promise.all([
      this.kpi.current(organizationId),
      this.oee.list(organizationId, undefined, undefined, 100),
      this.prisma.emfgIntelligenceAlert.count({ where: { organizationId, isRead: false } }),
      this.oee.list(organizationId, undefined, undefined, 20),
    ]);

    const kpis = kpiData as ReturnType<typeof aggregateProductionKpis>;
    const indicators = aggregateIntelligenceIndicators({
      oeeSnapshots,
      kpis,
      alertCount,
    });

    return {
      indicators,
      kpis: kpiData,
      oeeRecent: recentOee,
      alertCount,
      generatedAt: new Date().toISOString(),
    };
  }

  async dashboard(organizationId: string) {
    const [executive, analyticsResult, simulations] = await Promise.all([
      this.executiveDashboard(organizationId),
      this.analytics.analyze(organizationId),
      this.prisma.emfgIntelligenceSimulation.findMany({
        where: { organizationId, status: 'completed' },
        orderBy: { computedAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      ...executive,
      analytics: analyticsResult.analytics,
      recentSimulations: simulations,
    };
  }

  oeeDashboard(organizationId: string, scope?: string) {
    return this.oee.list(
      organizationId,
      scope as Parameters<EmfgIntelligenceOeeService['list']>[1],
      undefined,
      200,
    );
  }

  queryHistory(organizationId: string, limit = 100) {
    return this.prisma.emfgIntelligenceQueryLog.findMany({
      where: { organizationId },
      orderBy: { queriedAt: 'desc' },
      take: limit,
    });
  }

  exportHistory(organizationId: string, limit = 100) {
    return this.prisma.emfgIntelligenceExportLog.findMany({
      where: { organizationId },
      orderBy: { exportedAt: 'desc' },
      take: limit,
    });
  }

  alerts(organizationId: string, unreadOnly = false) {
    return this.prisma.emfgIntelligenceAlert.findMany({
      where: { organizationId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { raisedAt: 'desc' },
      take: 100,
    });
  }
}
