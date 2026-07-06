import { Module } from '@nestjs/common';
import { EventsModule } from '@/core/events/events.module';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { HcmController } from './presentation/hcm.controller';
import { HcmRcController } from './presentation/hcm-rc.controller';
import { HcmTaController } from './presentation/hcm-ta.controller';
import { HcmPyController } from './presentation/hcm-py.controller';
import { HcmTdController } from './presentation/hcm-td.controller';
import { HcmSsController } from './presentation/hcm-ss.controller';
import { HcmAuditService } from './application/hcm-audit.service';
import { HcmCenterService } from './application/hcm-center.service';
import { HcmOrgService } from './application/hcm-org.service';
import { HcmEmployeeService } from './application/hcm-employee.service';
import { HcmContractService } from './application/hcm-contract.service';
import { HcmDocumentService } from './application/hcm-document.service';
import { HcmEventBridgeService } from './application/hcm-event-bridge.service';
import { HcmRcCenterService } from './application/hcm-rc-center.service';
import { HcmRcVacancyService } from './application/hcm-rc-vacancy.service';
import { HcmRcRecruitmentService } from './application/hcm-rc-recruitment.service';
import { HcmRcSelectionService } from './application/hcm-rc-selection.service';
import { HcmRcHiringService } from './application/hcm-rc-hiring.service';
import { HcmRcOnboardingService } from './application/hcm-rc-onboarding.service';
import { HcmRcEventBridgeService } from './application/hcm-rc-event-bridge.service';
import { HcmTaCenterService } from './application/hcm-ta-center.service';
import { HcmTaShiftService } from './application/hcm-ta-shift.service';
import { HcmTaScheduleService } from './application/hcm-ta-schedule.service';
import { HcmTaAttendanceService, HcmTaGeofenceService } from './application/hcm-ta-attendance.service';
import { HcmTaNoveltyService } from './application/hcm-ta-novelty.service';
import { HcmTaEventBridgeService } from './application/hcm-ta-event-bridge.service';
import { HcmPyCenterService } from './application/hcm-py-center.service';
import { HcmPyConfigService } from './application/hcm-py-config.service';
import { HcmPyPeriodService } from './application/hcm-py-period.service';
import { HcmPyRunService } from './application/hcm-py-run.service';
import { HcmPyBenefitService } from './application/hcm-py-benefit.service';
import {
  HcmPyGarnishmentService,
  HcmPyProvisionService,
  HcmPySettlementService,
  HcmPyVacationService,
} from './application/hcm-py-settlement.service';
import { HcmPyDocumentService } from './application/hcm-py-document.service';
import { HcmPyEventBridgeService } from './application/hcm-py-event-bridge.service';
import { HcmTdCenterService } from './application/hcm-td-center.service';
import { HcmTdTrainingService } from './application/hcm-td-training.service';
import { HcmTdCompetencyService } from './application/hcm-td-competency.service';
import { HcmTdEvaluationService } from './application/hcm-td-evaluation.service';
import { HcmTdObjectiveService, HcmTdCareerService } from './application/hcm-td-objective.service';
import { HcmTdEventBridgeService } from './application/hcm-td-event-bridge.service';
import { HcmSsCenterService } from './application/hcm-ss-center.service';
import { HcmSsHealthService } from './application/hcm-ss-health.service';
import { HcmSsRiskService } from './application/hcm-ss-risk.service';
import { HcmSsPpeService } from './application/hcm-ss-ppe.service';
import { HcmSsEventBridgeService } from './application/hcm-ss-event-bridge.service';
import { HcmSsIncidentService } from './application/hcm-ss-incident.service';
import { HcmSsWellbeingService } from './application/hcm-ss-wellbeing.service';
import { HcmSsInspectionService } from './application/hcm-ss-inspection.service';
import { HcmSsEmergencyService } from './application/hcm-ss-emergency.service';

@Module({
  imports: [EventsModule, CoreEngineModule],
  controllers: [HcmController, HcmRcController, HcmTaController, HcmPyController, HcmTdController, HcmSsController],
  providers: [
    HcmAuditService,
    HcmCenterService,
    HcmOrgService,
    HcmEmployeeService,
    HcmContractService,
    HcmDocumentService,
    HcmEventBridgeService,
    HcmRcCenterService,
    HcmRcVacancyService,
    HcmRcRecruitmentService,
    HcmRcSelectionService,
    HcmRcHiringService,
    HcmRcOnboardingService,
    HcmRcEventBridgeService,
    HcmTaCenterService,
    HcmTaShiftService,
    HcmTaScheduleService,
    HcmTaGeofenceService,
    HcmTaAttendanceService,
    HcmTaNoveltyService,
    HcmTaEventBridgeService,
    HcmPyCenterService,
    HcmPyConfigService,
    HcmPyPeriodService,
    HcmPyRunService,
    HcmPyBenefitService,
    HcmPyGarnishmentService,
    HcmPySettlementService,
    HcmPyProvisionService,
    HcmPyVacationService,
    HcmPyDocumentService,
    HcmPyEventBridgeService,
    HcmTdCenterService,
    HcmTdTrainingService,
    HcmTdCompetencyService,
    HcmTdEvaluationService,
    HcmTdObjectiveService,
    HcmTdCareerService,
    HcmTdEventBridgeService,
    HcmSsCenterService,
    HcmSsHealthService,
    HcmSsRiskService,
    HcmSsPpeService,
    HcmSsIncidentService,
    HcmSsWellbeingService,
    HcmSsInspectionService,
    HcmSsEmergencyService,
    HcmSsEventBridgeService,
  ],
  exports: [HcmEmployeeService, HcmOrgService, HcmContractService, HcmRcVacancyService, HcmRcHiringService, HcmTaAttendanceService, HcmPyRunService, HcmTdEvaluationService, HcmSsHealthService, HcmSsIncidentService],
})
export class HcmModule {}
