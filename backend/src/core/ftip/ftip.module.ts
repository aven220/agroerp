import { Module } from '@nestjs/common';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { FarmsService } from './application/farms.service';
import { FarmLifecycleService } from './application/farm-lifecycle.service';
import { FarmRelationsService } from './application/farm-relations.service';
import { FarmGeometryService } from './application/farm-geometry.service';
import { FarmTwinService } from './application/farm-twin.service';
import { FarmSyncService } from './application/farm-sync.service';
import { FtipReportsService } from './application/ftip-reports.service';
import { FarmsController } from './presentation/farms.controller';
import { FtipReportsController } from './presentation/ftip-reports.controller';

@Module({
  imports: [CoreEngineModule],
  controllers: [FarmsController, FtipReportsController],
  providers: [
    FarmsService,
    FarmLifecycleService,
    FarmRelationsService,
    FarmGeometryService,
    FarmTwinService,
    FarmSyncService,
    FtipReportsService,
  ],
  exports: [FarmsService, FarmTwinService, FarmLifecycleService],
})
export class FtipModule {}
