import { Injectable } from '@nestjs/common';
import { EmfgIntelligenceOeeService } from './emfg-intelligence-oee.service';
import { EmfgIntelligenceKpiService } from './emfg-intelligence-kpi.service';
import { EmfgIntelligenceAnalyticsService } from './emfg-intelligence-analytics.service';
import { EmfgIntelligenceIntegrationService } from './emfg-intelligence-integration.service';

@Injectable()
export class EmfgIntelligenceEngineService {
  constructor(
    private readonly oee: EmfgIntelligenceOeeService,
    private readonly kpi: EmfgIntelligenceKpiService,
    private readonly analytics: EmfgIntelligenceAnalyticsService,
    private readonly integration: EmfgIntelligenceIntegrationService,
  ) {}

  async runFullAggregation(organizationId: string, userId: string) {
    const [oeeSnapshots, kpiResult] = await Promise.all([
      this.oee.computeAll(organizationId, userId),
      this.kpi.aggregate(organizationId, userId),
    ]);

    await this.integration.onOeeComputed(organizationId, oeeSnapshots.length);
    await this.integration.onAggregated(organizationId, kpiResult.snapshot.snapshotKey);
    await this.integration.checkAndRaiseAlerts(
      organizationId,
      kpiResult.indicators as Record<string, unknown>,
    );

    const analyticsResult = await this.analytics.analyze(organizationId, userId);

    return {
      oeeCount: oeeSnapshots.length,
      kpiSnapshot: kpiResult.snapshot,
      analytics: analyticsResult.analytics,
      aggregatedAt: new Date().toISOString(),
    };
  }
}
