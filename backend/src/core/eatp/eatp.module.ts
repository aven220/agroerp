import { Module } from '@nestjs/common';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { EventsModule } from '@/core/events/events.module';
import { FtipModule } from '@/core/ftip/ftip.module';
import { FmdtModule } from '@/core/fmdt/fmdt.module';
import { EimsModule } from '@/core/eims/eims.module';
import { EintModule } from '@/core/eint/eint.module';
import { EiampModule } from '@/core/eiamp/eiamp.module';
import { EatpPrismaService } from '@/shared/infrastructure/database/eatp-prisma.service';
import { EatpController } from './presentation/eatp.controller';
import { EatpAuditService } from './application/eatp-audit.service';
import { EatpCampaignService } from './application/eatp-campaign.service';
import { EatpCropService } from './application/eatp-crop.service';
import { EatpEngineService, EatpOfflineService } from './application/eatp-engine.service';
import { EatpFarmService } from './application/eatp-farm.service';
import { EatpInputService } from './application/eatp-input.service';
import { EatpLaborService } from './application/eatp-labor.service';
import { EatpLotService } from './application/eatp-lot.service';
import { EatpBridgeService, EatpMonitoringService } from './application/eatp-monitoring.service';
import { EatpScheduleService } from './application/eatp-schedule.service';

@Module({
  imports: [CoreEngineModule, EventsModule, FtipModule, FmdtModule, EimsModule, EintModule, EiampModule],
  controllers: [EatpController],
  providers: [
    EatpPrismaService,
    EatpAuditService,
    EatpFarmService,
    EatpLotService,
    EatpCropService,
    EatpCampaignService,
    EatpLaborService,
    EatpScheduleService,
    EatpInputService,
    EatpBridgeService,
    EatpMonitoringService,
    EatpOfflineService,
    EatpEngineService,
  ],
  exports: [EatpEngineService, EatpLaborService, EatpMonitoringService],
})
export class EatpModule {}
