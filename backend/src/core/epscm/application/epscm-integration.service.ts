import { Injectable, Logger } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';

@Injectable()
export class EpscmIntegrationService {
  private readonly logger = new Logger(EpscmIntegrationService.name);

  constructor(private readonly core: CoreEngineService) {}

  async onForecastComputed(organizationId: string, versionKey: string) {
    await this.core.emitUserAction(organizationId, 'EpscmDemandForecastVersion', versionKey, EVENT_TYPES.EPSCM_FORECAST_COMPUTED, {
      integration: 'dashboard',
    });
    await this.core.emitUserAction(organizationId, 'EpscmDemandForecastVersion', versionKey, EVENT_TYPES.EMFG_DASHBOARD_REFRESH, {
      integration: 'bi',
      module: 'epscm',
    });
    this.logger.log(`Forecast computed: ${versionKey}`);
  }

  async onReplenishmentProposed(organizationId: string, proposalKey: string, proposalType: string) {
    await this.core.emitUserAction(organizationId, 'EpscmReplenishmentProposal', proposalKey, EVENT_TYPES.EPSCM_REPLENISHMENT_PROPOSED, {
      proposalType,
      integration: 'eims',
    });
    if (proposalType === 'purchase') {
      await this.core.emitUserAction(organizationId, 'EpscmReplenishmentProposal', proposalKey, EVENT_TYPES.EMFG_INVENTORY_ISSUE_REQUESTED, {
        integration: 'efm',
        procurement: true,
      });
    }
    if (proposalType === 'production') {
      await this.core.emitUserAction(organizationId, 'EpscmReplenishmentProposal', proposalKey, EVENT_TYPES.EMFG_ORDER_CREATED, {
        integration: 'emfg',
        replenishment: true,
      });
    }
  }

  async onSupplyPlanActivated(organizationId: string, planKey: string) {
    await this.core.emitUserAction(organizationId, 'EpscmSupplyPlan', planKey, EVENT_TYPES.EPSCM_SUPPLY_PLAN_ACTIVATED, {
      integration: 'dashboard',
    });
  }

  async onAlertRaised(organizationId: string, alertKey: string, alertType: string) {
    await this.core.emitUserAction(organizationId, 'EpscmAlert', alertKey, EVENT_TYPES.EPSCM_ALERT_RAISED, {
      alertType,
      integration: 'dashboard',
    });
  }

  async onClassificationComputed(organizationId: string) {
    await this.core.emitUserAction(organizationId, 'EpscmInventoryClassification', 'batch', EVENT_TYPES.EPSCM_INVENTORY_CLASSIFIED, {
      integration: 'bi',
    });
    await this.core.emitUserAction(organizationId, 'EpscmInventoryClassification', 'batch', EVENT_TYPES.EPSCM_DASHBOARD_REFRESH, {
      integration: 'dashboard',
    });
  }
}
