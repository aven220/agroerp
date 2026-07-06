import { Module } from '@nestjs/common';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { EventsModule } from '@/core/events/events.module';
import { EgsipModule } from '@/core/egsip/egsip.module';
import { FtipModule } from '@/core/ftip/ftip.module';
import { FmdtModule } from '@/core/fmdt/fmdt.module';
import { EatpModule } from '@/core/eatp/eatp.module';
import { EimsModule } from '@/core/eims/eims.module';
import { EintModule } from '@/core/eint/eint.module';
import { EiampModule } from '@/core/eiamp/eiamp.module';
import { EappPrismaService } from '@/shared/infrastructure/database/eapp-prisma.service';
import { EappController } from './presentation/eapp.controller';
import { EappAuditService } from './application/eapp-audit.service';
import { EappEngineService, EappOfflineService } from './application/eapp-engine.service';
import { EappGisService } from './application/eapp-gis.service';
import { EappGeoService } from './application/eapp-geo.service';
import { EappSatelliteService } from './application/eapp-satellite.service';
import { EappDroneService } from './application/eapp-drone.service';
import { EappThematicService } from './application/eapp-thematic.service';
import { EappIndexService } from './application/eapp-index.service';
import { EappTelemetryService } from './application/eapp-telemetry.service';
import { EappInspectionService } from './application/eapp-inspection.service';
import { EappBridgeService, EappMonitoringService } from './application/eapp-monitoring.service';

@Module({
  imports: [CoreEngineModule, EventsModule, EgsipModule, FtipModule, FmdtModule, EatpModule, EimsModule, EintModule, EiampModule],
  controllers: [EappController],
  providers: [
    EappPrismaService,
    EappAuditService,
    EappGisService,
    EappGeoService,
    EappSatelliteService,
    EappDroneService,
    EappThematicService,
    EappIndexService,
    EappTelemetryService,
    EappInspectionService,
    EappBridgeService,
    EappMonitoringService,
    EappOfflineService,
    EappEngineService,
  ],
  exports: [EappEngineService, EappGisService, EappMonitoringService],
})
export class EappModule {}
