import { Module } from '@nestjs/common';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { EventsModule } from '@/core/events/events.module';
import { EaidspModule } from '@/core/eaidsp/eaidsp.module';
import { EbiapModule } from '@/core/ebiap/ebiap.module';
import { EgsipModule } from '@/core/egsip/egsip.module';
import { FtipModule } from '@/core/ftip/ftip.module';
import { FmdtModule } from '@/core/fmdt/fmdt.module';
import { EatpModule } from '@/core/eatp/eatp.module';
import { EappModule } from '@/core/eapp/eapp.module';
import { EiwpModule } from '@/core/eiwp/eiwp.module';
import { EphpModule } from '@/core/ephp/ephp.module';
import { EatrModule } from '@/core/eatr/eatr.module';
import { EaccModule } from '@/core/eacc/eacc.module';
import { EffmModule } from '@/core/effm/effm.module';
import { EimsModule } from '@/core/eims/eims.module';
import { EscmModule } from '@/core/escm/escm.module';
import { EpscmModule } from '@/core/epscm/epscm.module';
import { EamModule } from '@/core/eam/eam.module';
import { EfmModule } from '@/core/efm/efm.module';
import { EintModule } from '@/core/eint/eint.module';
import { EiampModule } from '@/core/eiamp/eiamp.module';
import { EaipPrismaService } from '@/shared/infrastructure/database/eaip-prisma.service';
import { EaipController } from './presentation/eaip.controller';
import { EaipAssistantService } from './application/eaip-assistant.service';
import { EaipAuditService } from './application/eaip-audit.service';
import { EaipBridgeService, EaipDashboardService, EaipOfflineService } from './application/eaip-dashboard.service';
import { EaipEngineService } from './application/eaip-engine.service';
import { EaipModelService } from './application/eaip-model.service';
import { EaipPredictionService } from './application/eaip-prediction.service';
import { EaipRecommendationService } from './application/eaip-recommendation.service';
import { EaipSimulationService } from './application/eaip-simulation.service';
import { EaipAnalyticsService, EaipTwinService } from './application/eaip-twin.service';

@Module({
  imports: [CoreEngineModule, EventsModule, EaidspModule, EbiapModule, EgsipModule, FtipModule, FmdtModule, EatpModule, EappModule, EiwpModule, EphpModule, EatrModule, EaccModule, EffmModule, EimsModule, EscmModule, EpscmModule, EamModule, EfmModule, EintModule, EiampModule],
  controllers: [EaipController],
  providers: [
    EaipPrismaService, EaipAuditService, EaipModelService, EaipPredictionService,
    EaipRecommendationService, EaipSimulationService, EaipTwinService, EaipAnalyticsService,
    EaipAssistantService, EaipBridgeService, EaipDashboardService, EaipOfflineService, EaipEngineService,
  ],
  exports: [EaipEngineService, EaipDashboardService, EaipPredictionService],
})
export class EaipModule {}
