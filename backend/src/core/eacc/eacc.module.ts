import { Module } from '@nestjs/common';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { EventsModule } from '@/core/events/events.module';
import { EgsipModule } from '@/core/egsip/egsip.module';
import { FtipModule } from '@/core/ftip/ftip.module';
import { FmdtModule } from '@/core/fmdt/fmdt.module';
import { EatpModule } from '@/core/eatp/eatp.module';
import { EappModule } from '@/core/eapp/eapp.module';
import { EiwpModule } from '@/core/eiwp/eiwp.module';
import { EphpModule } from '@/core/ephp/ephp.module';
import { EatrModule } from '@/core/eatr/eatr.module';
import { EimsModule } from '@/core/eims/eims.module';
import { EscmModule } from '@/core/escm/escm.module';
import { EpscmModule } from '@/core/epscm/epscm.module';
import { EfmModule } from '@/core/efm/efm.module';
import { EintModule } from '@/core/eint/eint.module';
import { EbiapModule } from '@/core/ebiap/ebiap.module';
import { EiampModule } from '@/core/eiamp/eiamp.module';
import { EaccPrismaService } from '@/shared/infrastructure/database/eacc-prisma.service';
import { EaccController } from './presentation/eacc.controller';
import { EaccAuditService } from './application/eacc-audit.service';
import { EaccBridgeService, EaccDashboardService, EaccOfflineService } from './application/eacc-dashboard.service';
import { EaccCertificationService } from './application/eacc-certification.service';
import { EaccComplianceService } from './application/eacc-compliance.service';
import { EaccEngineService } from './application/eacc-engine.service';
import { EaccInspectionService } from './application/eacc-inspection.service';
import { EaccDocumentService, EaccSafetyService, EaccSustainabilityService } from './application/eacc-sustainability.service';

@Module({
  imports: [CoreEngineModule, EventsModule, EgsipModule, FtipModule, FmdtModule, EatpModule, EappModule, EiwpModule, EphpModule, EatrModule, EimsModule, EscmModule, EpscmModule, EfmModule, EintModule, EbiapModule, EiampModule],
  controllers: [EaccController],
  providers: [
    EaccPrismaService, EaccAuditService, EaccCertificationService, EaccComplianceService,
    EaccInspectionService, EaccSustainabilityService, EaccSafetyService, EaccDocumentService,
    EaccBridgeService, EaccDashboardService, EaccOfflineService, EaccEngineService,
  ],
  exports: [EaccEngineService, EaccDashboardService, EaccCertificationService],
})
export class EaccModule {}
