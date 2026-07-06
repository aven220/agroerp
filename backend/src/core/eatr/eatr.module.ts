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
import { EimsModule } from '@/core/eims/eims.module';
import { EscmModule } from '@/core/escm/escm.module';
import { EpscmModule } from '@/core/epscm/epscm.module';
import { EfmModule } from '@/core/efm/efm.module';
import { EintModule } from '@/core/eint/eint.module';
import { EbiapModule } from '@/core/ebiap/ebiap.module';
import { EiampModule } from '@/core/eiamp/eiamp.module';
import { EatrPrismaService } from '@/shared/infrastructure/database/eatr-prisma.service';
import { EatrController } from './presentation/eatr.controller';
import { EatrAuditService } from './application/eatr-audit.service';
import { EatrBridgeService, EatrDashboardService, EatrOfflineService } from './application/eatr-dashboard.service';
import { EatrCustodyService } from './application/eatr-custody.service';
import { EatrEngineService } from './application/eatr-engine.service';
import { EatrHarvestService } from './application/eatr-harvest.service';
import { EatrExportService, EatrPackagingService, EatrPostharvestService, EatrQualityService } from './application/eatr-postharvest.service';
import { EatrLotService, EatrTraceService } from './application/eatr-trace.service';

@Module({
  imports: [CoreEngineModule, EventsModule, EgsipModule, FtipModule, FmdtModule, EatpModule, EappModule, EiwpModule, EphpModule, EimsModule, EscmModule, EpscmModule, EfmModule, EintModule, EbiapModule, EiampModule],
  controllers: [EatrController],
  providers: [
    EatrPrismaService, EatrAuditService, EatrTraceService, EatrLotService, EatrCustodyService,
    EatrHarvestService, EatrPostharvestService, EatrQualityService, EatrPackagingService, EatrExportService,
    EatrBridgeService, EatrDashboardService, EatrOfflineService, EatrEngineService,
  ],
  exports: [EatrEngineService, EatrDashboardService, EatrTraceService],
})
export class EatrModule {}
