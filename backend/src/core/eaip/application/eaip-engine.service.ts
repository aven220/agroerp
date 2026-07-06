import { Injectable } from '@nestjs/common';
import {
  EAIP_PREDICTION_SERVICES, EAIP_RECOMMENDATION_CATEGORIES, EAIP_SIMULATION_TYPES, EAIP_TWIN_ENTITY_TYPES,
} from '../domain/eaip.engine';
import { EaipAnalyticsService, EaipTwinService } from './eaip-twin.service';
import { EaipAssistantService } from './eaip-assistant.service';
import { EaipAuditService } from './eaip-audit.service';
import { EaipBridgeService, EaipDashboardService } from './eaip-dashboard.service';
import { EaipModelService } from './eaip-model.service';
import { EaipPredictionService } from './eaip-prediction.service';
import { EaipRecommendationService } from './eaip-recommendation.service';
import { EaipSimulationService } from './eaip-simulation.service';

@Injectable()
export class EaipEngineService {
  constructor(
    private readonly dashboard: EaipDashboardService,
    private readonly models: EaipModelService,
    private readonly prediction: EaipPredictionService,
    private readonly recommendation: EaipRecommendationService,
    private readonly simulation: EaipSimulationService,
    private readonly twin: EaipTwinService,
    private readonly assistant: EaipAssistantService,
    private readonly analytics: EaipAnalyticsService,
    private readonly bridge: EaipBridgeService,
    private readonly audit: EaipAuditService,
  ) {}

  async center(organizationId: string, userId: string) {
    const [dash, models, recommendations, predictions] = await Promise.all([
      this.dashboard.dashboard(organizationId),
      this.models.list(organizationId),
      this.recommendation.list(organizationId),
      this.prediction.list(organizationId),
    ]);
    return {
      dashboard: dash,
      models,
      recommendations: recommendations.slice(0, 10),
      recentPredictions: predictions.slice(0, 10),
      moduleSlots: this.bridge.moduleSlots(),
      catalogs: {
        predictionServices: EAIP_PREDICTION_SERVICES,
        simulationTypes: EAIP_SIMULATION_TYPES,
        twinEntityTypes: EAIP_TWIN_ENTITY_TYPES,
        recommendationCategories: EAIP_RECOMMENDATION_CATEGORIES,
      },
    };
  }

  async bootstrap(organizationId: string, userId: string) {
    for (const serviceType of EAIP_PREDICTION_SERVICES) {
      const existing = await this.models.list(organizationId, serviceType);
      if (existing.length === 0) {
        await this.models.register(organizationId, userId, {
          name: `Modelo ${serviceType}`, serviceType, providerRef: 'eaidsp', costLimit: 100,
        });
        const model = await this.models.list(organizationId, serviceType);
        if (model[0]) await this.models.activate(organizationId, userId, model[0].modelKey);
      }
    }
    await this.analytics.productivityIndicators(organizationId);
    await this.audit.log(organizationId, 'EaipPlatform', organizationId, 'bootstrap', userId);
    return this.center(organizationId, userId);
  }
}
