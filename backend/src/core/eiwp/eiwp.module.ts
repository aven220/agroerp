import { Module } from '@nestjs/common';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { EventsModule } from '@/core/events/events.module';
import { EgsipModule } from '@/core/egsip/egsip.module';
import { FtipModule } from '@/core/ftip/ftip.module';
import { FmdtModule } from '@/core/fmdt/fmdt.module';
import { EatpModule } from '@/core/eatp/eatp.module';
import { EappModule } from '@/core/eapp/eapp.module';
import { EimsModule } from '@/core/eims/eims.module';
import { EintModule } from '@/core/eint/eint.module';
import { EiampModule } from '@/core/eiamp/eiamp.module';
import { EiesdpModule } from '@/core/eiesdp/eiesdp.module';
import { EiwpPrismaService } from '@/shared/infrastructure/database/eiwp-prisma.service';
import { EiwpController } from './presentation/eiwp.controller';
import { EiwpAuditService } from './application/eiwp-audit.service';
import { EiwpEngineService, EiwpOfflineService } from './application/eiwp-engine.service';
import { EiwpWaterService } from './application/eiwp-water.service';
import { EiwpIrrigationService } from './application/eiwp-irrigation.service';
import { EiwpWeatherService } from './application/eiwp-weather.service';
import { EiwpBalanceService } from './application/eiwp-balance.service';
import { EiwpAlertService } from './application/eiwp-alert.service';
import { EiwpAutomationService, EiwpFieldEventService, EiwpRecommendationService } from './application/eiwp-automation.service';
import { EiwpBridgeService, EiwpMonitoringService } from './application/eiwp-monitoring.service';

@Module({
  imports: [
    CoreEngineModule,
    EventsModule,
    EgsipModule,
    FtipModule,
    FmdtModule,
    EatpModule,
    EappModule,
    EimsModule,
    EintModule,
    EiampModule,
    EiesdpModule,
  ],
  controllers: [EiwpController],
  providers: [
    EiwpPrismaService,
    EiwpAuditService,
    EiwpWaterService,
    EiwpIrrigationService,
    EiwpWeatherService,
    EiwpBalanceService,
    EiwpAlertService,
    EiwpAutomationService,
    EiwpRecommendationService,
    EiwpFieldEventService,
    EiwpBridgeService,
    EiwpMonitoringService,
    EiwpOfflineService,
    EiwpEngineService,
  ],
  exports: [EiwpEngineService, EiwpMonitoringService, EiwpBalanceService],
})
export class EiwpModule {}
