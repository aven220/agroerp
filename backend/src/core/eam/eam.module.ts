import { Module } from '@nestjs/common';
import { EventsModule } from '@/core/events/events.module';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { EamController } from './presentation/eam.controller';
import { EamCmmsController } from './presentation/eam-cmms.controller';
import { EamReliabilityController } from './presentation/eam-reliability.controller';
import { EamAuditService } from './application/eam-audit.service';
import { EamCatalogService, EamLocationService } from './application/eam-catalog.service';
import { EamAssetService } from './application/eam-asset.service';
import { EamIndicatorsService } from './application/eam-indicators.service';
import { EamIntegrationService } from './application/eam-integration.service';
import { EamEngineService, EamOfflineService } from './application/eam-engine.service';
import { EamCmmsIntegrationService } from './application/eam-cmms-integration.service';
import { EamMaintPlanService } from './application/eam-maint-plan.service';
import { EamMaintWorkOrderService } from './application/eam-maint-work-order.service';
import { EamTechnicianService } from './application/eam-technician.service';
import { EamSparePartService } from './application/eam-spare-part.service';
import { EamMaintCostService } from './application/eam-maint-cost.service';
import { EamIncidentService } from './application/eam-incident.service';
import { EamMaintSlaService } from './application/eam-maint-sla.service';
import { EamCalendarService } from './application/eam-calendar.service';
import { EamCmmsIndicatorsService } from './application/eam-cmms-indicators.service';
import { EamCmmsEngineService, EamCmmsOfflineService } from './application/eam-cmms-engine.service';
import { EamConditionService } from './application/eam-condition.service';
import { EamIotService } from './application/eam-iot.service';
import { EamPredictiveService } from './application/eam-predictive.service';
import { EamReliabilityMetricsService } from './application/eam-reliability-metrics.service';
import { EamEnergyService } from './application/eam-energy.service';
import { EamReliabilityAnalyticsService } from './application/eam-reliability-analytics.service';
import { EamReliabilitySimulationService } from './application/eam-reliability-simulation.service';
import { EamDigitalTwinService } from './application/eam-digital-twin.service';
import { EamReliabilityIndicatorsService } from './application/eam-reliability-indicators.service';
import { EamReliabilityIntegrationService } from './application/eam-reliability-integration.service';
import { EamReliabilityEngineService, EamReliabilityOfflineService } from './application/eam-reliability-engine.service';

@Module({
  imports: [EventsModule, CoreEngineModule],
  controllers: [EamController, EamCmmsController, EamReliabilityController],
  providers: [
    EamAuditService,
    EamCatalogService,
    EamLocationService,
    EamAssetService,
    EamIndicatorsService,
    EamIntegrationService,
    EamOfflineService,
    EamEngineService,
    EamCmmsIntegrationService,
    EamMaintPlanService,
    EamMaintWorkOrderService,
    EamTechnicianService,
    EamSparePartService,
    EamMaintCostService,
    EamIncidentService,
    EamMaintSlaService,
    EamCalendarService,
    EamCmmsIndicatorsService,
    EamCmmsOfflineService,
    EamCmmsEngineService,
    EamReliabilityIntegrationService,
    EamConditionService,
    EamIotService,
    EamPredictiveService,
    EamReliabilityMetricsService,
    EamEnergyService,
    EamReliabilityAnalyticsService,
    EamReliabilitySimulationService,
    EamDigitalTwinService,
    EamReliabilityIndicatorsService,
    EamReliabilityOfflineService,
    EamReliabilityEngineService,
  ],
  exports: [EamEngineService, EamAssetService, EamCmmsEngineService, EamReliabilityEngineService],
})
export class EamModule {}
