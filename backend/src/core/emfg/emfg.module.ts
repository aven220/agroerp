import { Module, forwardRef } from '@nestjs/common';
import { EventsModule } from '@/core/events/events.module';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { EimsModule } from '@/core/eims/eims.module';
import { WorkflowsModule } from '@/core/workflows/workflows.module';
import { EmfgController } from './presentation/emfg.controller';
import { EmfgMesController } from './presentation/emfg-mes.controller';
import { EmfgQmsController } from './presentation/emfg-qms.controller';
import { EmfgResourcesController } from './presentation/emfg-resources.controller';
import { EmfgCostController } from './presentation/emfg-cost.controller';
import { EmfgIntelligenceController } from './presentation/emfg-intelligence.controller';
import { EmfgAuditService } from './application/emfg-audit.service';
import { EmfgCenterService } from './application/emfg-center.service';
import { EmfgCapacityService } from './application/emfg-capacity.service';
import { EmfgCalendarService } from './application/emfg-calendar.service';
import { EmfgMasterPlanService } from './application/emfg-master-plan.service';
import { EmfgBomService } from './application/emfg-bom.service';
import { EmfgRoutingService } from './application/emfg-routing.service';
import { EmfgOrderService } from './application/emfg-order.service';
import { EmfgSchedulerService } from './application/emfg-scheduler.service';
import { EmfgIntegrationService } from './application/emfg-integration.service';
import { EmfgEventBridgeService } from './application/emfg-event-bridge.service';
import { EmfgMesExecutionService } from './application/emfg-mes-execution.service';
import { EmfgMesConsumptionService } from './application/emfg-mes-consumption.service';
import { EmfgMesProductionService } from './application/emfg-mes-production.service';
import { EmfgMesTraceabilityService } from './application/emfg-mes-traceability.service';
import { EmfgMesOperationService } from './application/emfg-mes-operation.service';
import { EmfgMesMonitorService } from './application/emfg-mes-monitor.service';
import { EmfgMesOfflineService } from './application/emfg-mes-offline.service';
import { EmfgQmsPlanService } from './application/emfg-qms-plan.service';
import { EmfgQmsInspectionService } from './application/emfg-qms-inspection.service';
import { EmfgQmsNcService } from './application/emfg-qms-nc.service';
import { EmfgQmsCapaService } from './application/emfg-qms-capa.service';
import { EmfgQmsReleaseService } from './application/emfg-qms-release.service';
import { EmfgQmsIndicatorsService } from './application/emfg-qms-indicators.service';
import { EmfgQmsIntegrationService } from './application/emfg-qms-integration.service';
import { EmfgQmsOfflineService } from './application/emfg-qms-offline.service';
import { EmfgResourcesCenterService } from './application/emfg-resources-center.service';
import { EmfgResourcesWorkcenterService } from './application/emfg-resources-workcenter.service';
import { EmfgResourcesEquipmentService } from './application/emfg-resources-equipment.service';
import { EmfgResourcesCapacityService } from './application/emfg-resources-capacity.service';
import { EmfgResourcesMaintenanceService } from './application/emfg-resources-maintenance.service';
import { EmfgResourcesIndicatorsService } from './application/emfg-resources-indicators.service';
import { EmfgResourcesIntegrationService } from './application/emfg-resources-integration.service';
import { EmfgResourcesOfflineService } from './application/emfg-resources-offline.service';
import { EmfgCostStandardService } from './application/emfg-cost-standard.service';
import { EmfgCostActualService } from './application/emfg-cost-actual.service';
import { EmfgCostWipService } from './application/emfg-cost-wip.service';
import { EmfgCostVarianceService } from './application/emfg-cost-variance.service';
import { EmfgCostIndicatorsService } from './application/emfg-cost-indicators.service';
import { EmfgCostIntegrationService } from './application/emfg-cost-integration.service';
import { EmfgCostEngineService } from './application/emfg-cost-engine.service';
import { EmfgIntelligenceOeeService } from './application/emfg-intelligence-oee.service';
import { EmfgIntelligenceKpiService } from './application/emfg-intelligence-kpi.service';
import { EmfgIntelligenceAnalyticsService } from './application/emfg-intelligence-analytics.service';
import { EmfgIntelligenceSimulationService } from './application/emfg-intelligence-simulation.service';
import { EmfgIntelligenceIndicatorsService } from './application/emfg-intelligence-indicators.service';
import { EmfgIntelligenceIntegrationService } from './application/emfg-intelligence-integration.service';
import { EmfgIntelligenceAiBridgeService } from './application/emfg-intelligence-ai-bridge.service';
import { EmfgIntelligenceExportService } from './application/emfg-intelligence-export.service';
import { EmfgIntelligenceEngineService } from './application/emfg-intelligence-engine.service';

@Module({
  imports: [EventsModule, CoreEngineModule, EimsModule, forwardRef(() => WorkflowsModule)],
  controllers: [EmfgController, EmfgMesController, EmfgQmsController, EmfgResourcesController, EmfgCostController, EmfgIntelligenceController],
  providers: [
    EmfgAuditService,
    EmfgCapacityService,
    EmfgCalendarService,
    EmfgBomService,
    EmfgRoutingService,
    EmfgIntegrationService,
    EmfgOrderService,
    EmfgSchedulerService,
    EmfgMasterPlanService,
    EmfgCenterService,
    EmfgEventBridgeService,
    EmfgMesExecutionService,
    EmfgMesConsumptionService,
    EmfgMesProductionService,
    EmfgMesTraceabilityService,
    EmfgMesOperationService,
    EmfgMesMonitorService,
    EmfgMesOfflineService,
    EmfgQmsPlanService,
    EmfgQmsInspectionService,
    EmfgQmsNcService,
    EmfgQmsCapaService,
    EmfgQmsReleaseService,
    EmfgQmsIndicatorsService,
    EmfgQmsIntegrationService,
    EmfgQmsOfflineService,
    EmfgResourcesCenterService,
    EmfgResourcesWorkcenterService,
    EmfgResourcesEquipmentService,
    EmfgResourcesCapacityService,
    EmfgResourcesMaintenanceService,
    EmfgResourcesIndicatorsService,
    EmfgResourcesIntegrationService,
    EmfgResourcesOfflineService,
    EmfgCostStandardService,
    EmfgCostActualService,
    EmfgCostWipService,
    EmfgCostVarianceService,
    EmfgCostIndicatorsService,
    EmfgCostIntegrationService,
    EmfgCostEngineService,
    EmfgIntelligenceOeeService,
    EmfgIntelligenceKpiService,
    EmfgIntelligenceAnalyticsService,
    EmfgIntelligenceSimulationService,
    EmfgIntelligenceIndicatorsService,
    EmfgIntelligenceIntegrationService,
    EmfgIntelligenceAiBridgeService,
    EmfgIntelligenceExportService,
    EmfgIntelligenceEngineService,
  ],
  exports: [
    EmfgCenterService,
    EmfgOrderService,
    EmfgBomService,
    EmfgSchedulerService,
    EmfgMasterPlanService,
  ],
})
export class EmfgModule {}
