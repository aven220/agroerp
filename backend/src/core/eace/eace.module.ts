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
import { EaipModule } from '@/core/eaip/eaip.module';
import { EimsModule } from '@/core/eims/eims.module';
import { EscmModule } from '@/core/escm/escm.module';
import { EpscmModule } from '@/core/epscm/epscm.module';
import { EamModule } from '@/core/eam/eam.module';
import { EfmModule } from '@/core/efm/efm.module';
import { EintModule } from '@/core/eint/eint.module';
import { EiampModule } from '@/core/eiamp/eiamp.module';
import { EacePrismaService } from '@/shared/infrastructure/database/eace-prisma.service';
import { EaceController } from './presentation/eace.controller';
import { EaceAdvisorService } from './application/eace-advisor.service';
import { EaceApiService } from './application/eace-api.service';
import { EaceAuditService } from './application/eace-audit.service';
import { EaceBridgeService, EaceDashboardService, EaceOfflineService } from './application/eace-dashboard.service';
import { EaceContractService } from './application/eace-contract.service';
import { EaceContractorService } from './application/eace-contractor.service';
import { EaceCooperativeService } from './application/eace-cooperative.service';
import { EaceEngineService } from './application/eace-engine.service';
import { EaceExecutiveService } from './application/eace-executive.service';
import { EaceKnowledgeService } from './application/eace-knowledge.service';
import { EaceMarketplaceService } from './application/eace-marketplace.service';
import { EaceNotificationService } from './application/eace-notification.service';
import { EaceProducerService } from './application/eace-producer.service';

@Module({
  imports: [
    CoreEngineModule, EventsModule, EaidspModule, EbiapModule, EgsipModule, FtipModule, FmdtModule,
    EatpModule, EappModule, EiwpModule, EphpModule, EatrModule, EaccModule, EffmModule, EaipModule,
    EimsModule, EscmModule, EpscmModule, EamModule, EfmModule, EintModule, EiampModule,
  ],
  controllers: [EaceController],
  providers: [
    EacePrismaService, EaceAuditService, EaceProducerService, EaceCooperativeService,
    EaceContractService, EaceContractorService, EaceAdvisorService, EaceMarketplaceService,
    EaceApiService, EaceKnowledgeService, EaceExecutiveService, EaceNotificationService,
    EaceBridgeService, EaceDashboardService, EaceOfflineService, EaceEngineService,
  ],
  exports: [EaceEngineService, EaceDashboardService, EaceProducerService],
})
export class EaceModule {}
