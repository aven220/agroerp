import { Module } from '@nestjs/common';
import { EventsModule } from '@/core/events/events.module';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { EimsModule } from '@/core/eims/eims.module';
import { EpscmController } from './presentation/epscm.controller';
import { EpscmWmsController } from './presentation/epscm-wms.controller';
import { EpscmTmsController } from './presentation/epscm-tms.controller';
import { EpscmCollabController } from './presentation/epscm-collab.controller';
import { EpscmAuditService } from './application/epscm-audit.service';
import { EpscmCenterService } from './application/epscm-center.service';
import { EpscmDemandService } from './application/epscm-demand.service';
import { EpscmReplenishmentService } from './application/epscm-replenishment.service';
import { EpscmSupplyPlanService } from './application/epscm-supply-plan.service';
import { EpscmInventoryOptService } from './application/epscm-inventory-opt.service';
import { EpscmAlertsService } from './application/epscm-alerts.service';
import { EpscmIndicatorsService } from './application/epscm-indicators.service';
import { EpscmIntegrationService } from './application/epscm-integration.service';
import { EpscmEngineService } from './application/epscm-engine.service';
import { EpscmWmsWarehouseService, EpscmWmsLocationService } from './application/epscm-wms-warehouse.service';
import { EpscmWmsTransferService } from './application/epscm-wms-transfer.service';
import { EpscmWmsPickingService } from './application/epscm-wms-picking.service';
import { EpscmWmsPackingService } from './application/epscm-wms-packing.service';
import { EpscmWmsDispatchService } from './application/epscm-wms-dispatch.service';
import { EpscmWmsReceivingService } from './application/epscm-wms-receiving.service';
import { EpscmWmsCrossDockService } from './application/epscm-wms-crossdock.service';
import { EpscmWmsIntegrationService } from './application/epscm-wms-integration.service';
import { EpscmWmsIndicatorsService } from './application/epscm-wms-indicators.service';
import { EpscmWmsOfflineService } from './application/epscm-wms-offline.service';
import { EpscmWmsEngineService } from './application/epscm-wms-engine.service';
import { EpscmTmsFleetService } from './application/epscm-tms-fleet.service';
import { EpscmTmsDriverService } from './application/epscm-tms-driver.service';
import { EpscmTmsRouteService } from './application/epscm-tms-route.service';
import { EpscmTmsTripService } from './application/epscm-tms-trip.service';
import { EpscmTmsDeliveryService } from './application/epscm-tms-delivery.service';
import { EpscmTmsPodService } from './application/epscm-tms-pod.service';
import { EpscmTmsCostService } from './application/epscm-tms-cost.service';
import { EpscmTmsTelemetryService } from './application/epscm-tms-telemetry.service';
import { EpscmTmsIntegrationService } from './application/epscm-tms-integration.service';
import { EpscmTmsIndicatorsService } from './application/epscm-tms-indicators.service';
import { EpscmTmsOfflineService } from './application/epscm-tms-offline.service';
import { EpscmTmsEngineService } from './application/epscm-tms-engine.service';
import { EpscmCollabPartnerService } from './application/epscm-collab-partner.service';
import { EpscmCollabSupplierPortalService } from './application/epscm-collab-supplier-portal.service';
import { EpscmCollabOperatorPortalService } from './application/epscm-collab-operator-portal.service';
import { EpscmCollabSlaService } from './application/epscm-collab-sla.service';
import { EpscmCollabCollaborationService } from './application/epscm-collab-collaboration.service';
import { EpscmCollabAnalyticsService } from './application/epscm-collab-analytics.service';
import { EpscmCollabSimulationService } from './application/epscm-collab-simulation.service';
import { EpscmCollabAiService } from './application/epscm-collab-ai.service';
import { EpscmCollabIntegrationService } from './application/epscm-collab-integration.service';
import { EpscmCollabOfflineService } from './application/epscm-collab-offline.service';
import { EpscmCollabEngineService } from './application/epscm-collab-engine.service';

@Module({
  imports: [EventsModule, CoreEngineModule, EimsModule],
  controllers: [EpscmController, EpscmWmsController, EpscmTmsController, EpscmCollabController],
  providers: [
    EpscmAuditService,
    EpscmCenterService,
    EpscmDemandService,
    EpscmReplenishmentService,
    EpscmSupplyPlanService,
    EpscmInventoryOptService,
    EpscmAlertsService,
    EpscmIndicatorsService,
    EpscmIntegrationService,
    EpscmEngineService,
    EpscmWmsWarehouseService,
    EpscmWmsLocationService,
    EpscmWmsTransferService,
    EpscmWmsPickingService,
    EpscmWmsPackingService,
    EpscmWmsDispatchService,
    EpscmWmsReceivingService,
    EpscmWmsCrossDockService,
    EpscmWmsIntegrationService,
    EpscmWmsIndicatorsService,
    EpscmWmsOfflineService,
    EpscmWmsEngineService,
    EpscmTmsFleetService,
    EpscmTmsDriverService,
    EpscmTmsRouteService,
    EpscmTmsTripService,
    EpscmTmsDeliveryService,
    EpscmTmsPodService,
    EpscmTmsCostService,
    EpscmTmsTelemetryService,
    EpscmTmsIntegrationService,
    EpscmTmsIndicatorsService,
    EpscmTmsOfflineService,
    EpscmTmsEngineService,
    EpscmCollabPartnerService,
    EpscmCollabSupplierPortalService,
    EpscmCollabOperatorPortalService,
    EpscmCollabSlaService,
    EpscmCollabCollaborationService,
    EpscmCollabAnalyticsService,
    EpscmCollabSimulationService,
    EpscmCollabAiService,
    EpscmCollabIntegrationService,
    EpscmCollabOfflineService,
    EpscmCollabEngineService,
  ],
  exports: [EpscmCenterService, EpscmEngineService, EpscmWmsEngineService, EpscmTmsEngineService, EpscmCollabEngineService],
})
export class EpscmModule {}
