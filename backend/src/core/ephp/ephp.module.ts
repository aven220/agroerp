import { Module } from '@nestjs/common';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { EventsModule } from '@/core/events/events.module';
import { EgsipModule } from '@/core/egsip/egsip.module';
import { FtipModule } from '@/core/ftip/ftip.module';
import { FmdtModule } from '@/core/fmdt/fmdt.module';
import { EatpModule } from '@/core/eatp/eatp.module';
import { EappModule } from '@/core/eapp/eapp.module';
import { EiwpModule } from '@/core/eiwp/eiwp.module';
import { EimsModule } from '@/core/eims/eims.module';
import { EscmModule } from '@/core/escm/escm.module';
import { EmfgModule } from '@/core/emfg/emfg.module';
import { EintModule } from '@/core/eint/eint.module';
import { EbiapModule } from '@/core/ebiap/ebiap.module';
import { EiampModule } from '@/core/eiamp/eiamp.module';
import { EfmModule } from '@/core/efm/efm.module';
import { EphpPrismaService } from '@/shared/infrastructure/database/ephp-prisma.service';
import { EphpController } from './presentation/ephp.controller';
import { EphpAuditService } from './application/ephp-audit.service';
import { EphpAlertService } from './application/ephp-alert.service';
import { EphpComplianceService, EphpIntervalService, EphpMrlService } from './application/ephp-compliance.service';
import { EphpBridgeService, EphpDashboardService, EphpOfflineService } from './application/ephp-dashboard.service';
import { EphpDiseaseService } from './application/ephp-disease.service';
import { EphpEngineService } from './application/ephp-engine.service';
import { EphpIpmService } from './application/ephp-ipm.service';
import { EphpMonitoringService } from './application/ephp-monitoring.service';
import { EphpPestService } from './application/ephp-pest.service';
import { EphpApplicationService, EphpTreatmentService } from './application/ephp-treatment.service';

@Module({
  imports: [CoreEngineModule, EventsModule, EgsipModule, FtipModule, FmdtModule, EatpModule, EappModule, EiwpModule, EimsModule, EscmModule, EmfgModule, EintModule, EbiapModule, EiampModule, EfmModule],
  controllers: [EphpController],
  providers: [
    EphpPrismaService, EphpAuditService, EphpPestService, EphpDiseaseService, EphpMonitoringService,
    EphpTreatmentService, EphpApplicationService, EphpIpmService, EphpIntervalService, EphpMrlService,
    EphpComplianceService, EphpAlertService, EphpBridgeService, EphpDashboardService, EphpOfflineService, EphpEngineService,
  ],
  exports: [EphpEngineService, EphpDashboardService, EphpIpmService],
})
export class EphpModule {}
