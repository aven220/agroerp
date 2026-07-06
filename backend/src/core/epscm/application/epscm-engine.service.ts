import { Injectable } from '@nestjs/common';
import { EpscmDemandService } from './epscm-demand.service';
import { EpscmReplenishmentService } from './epscm-replenishment.service';
import { EpscmInventoryOptService } from './epscm-inventory-opt.service';
import { EpscmAlertsService } from './epscm-alerts.service';
import { EpscmIntegrationService } from './epscm-integration.service';

@Injectable()
export class EpscmEngineService {
  constructor(
    private readonly demand: EpscmDemandService,
    private readonly replenishment: EpscmReplenishmentService,
    private readonly inventoryOpt: EpscmInventoryOptService,
    private readonly alerts: EpscmAlertsService,
    private readonly integration: EpscmIntegrationService,
  ) {}

  async runFullPlanningCycle(organizationId: string, userId: string, versionKey: string) {
    const forecastLines = await this.demand.computeAutomaticForecast(organizationId, userId, versionKey);
    await this.integration.onForecastComputed(organizationId, versionKey);

    const comparisons = await this.demand.compareActualVsProjected(organizationId, userId, versionKey);
    const classifications = await this.inventoryOpt.computeClassifications(organizationId, userId);
    await this.integration.onClassificationComputed(organizationId);

    const proposals = await this.replenishment.runAutomaticReplenishment(organizationId, userId);
    for (const p of proposals) {
      await this.integration.onReplenishmentProposed(organizationId, p.proposalKey, p.proposalType);
    }

    const alertList = await this.alerts.evaluateAll(organizationId, userId);

    return {
      forecastLines: forecastLines.length,
      comparisons: comparisons.length,
      classifications: classifications.length,
      proposals: proposals.length,
      alerts: alertList.length,
      completedAt: new Date().toISOString(),
    };
  }
}
