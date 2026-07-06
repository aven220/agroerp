import { Module } from '@nestjs/common';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { EventsModule } from '@/core/events/events.module';
import { EamModule } from '@/core/eam/eam.module';
import { EgsipModule } from '@/core/egsip/egsip.module';
import { FtipModule } from '@/core/ftip/ftip.module';
import { FmdtModule } from '@/core/fmdt/fmdt.module';
import { EatpModule } from '@/core/eatp/eatp.module';
import { EappModule } from '@/core/eapp/eapp.module';
import { EiwpModule } from '@/core/eiwp/eiwp.module';
import { EphpModule } from '@/core/ephp/ephp.module';
import { EatrModule } from '@/core/eatr/eatr.module';
import { EaccModule } from '@/core/eacc/eacc.module';
import { EimsModule } from '@/core/eims/eims.module';
import { EscmModule } from '@/core/escm/escm.module';
import { EpscmModule } from '@/core/epscm/epscm.module';
import { EfmModule } from '@/core/efm/efm.module';
import { EintModule } from '@/core/eint/eint.module';
import { EbiapModule } from '@/core/ebiap/ebiap.module';
import { EiampModule } from '@/core/eiamp/eiamp.module';
import { EffmPrismaService } from '@/shared/infrastructure/database/effm-prisma.service';
import { EffmController } from './presentation/effm.controller';
import { EffmAuditService } from './application/effm-audit.service';
import { EffmBridgeService, EffmDashboardService, EffmOfflineService, EffmPerformanceService } from './application/effm-dashboard.service';
import { EffmEngineService } from './application/effm-engine.service';
import { EffmFuelService } from './application/effm-fuel.service';
import { EffmImplementService, EffmMachineService } from './application/effm-machine.service';
import { EffmOperationService } from './application/effm-operation.service';
import { EffmTelemetryService } from './application/effm-telemetry.service';

@Module({
  imports: [CoreEngineModule, EventsModule, EamModule, EgsipModule, FtipModule, FmdtModule, EatpModule, EappModule, EiwpModule, EphpModule, EatrModule, EaccModule, EimsModule, EscmModule, EpscmModule, EfmModule, EintModule, EbiapModule, EiampModule],
  controllers: [EffmController],
  providers: [
    EffmPrismaService, EffmAuditService, EffmMachineService, EffmImplementService,
    EffmOperationService, EffmFuelService, EffmTelemetryService,
    EffmPerformanceService, EffmBridgeService, EffmDashboardService, EffmOfflineService, EffmEngineService,
  ],
  exports: [EffmEngineService, EffmDashboardService, EffmMachineService],
})
export class EffmModule {}
