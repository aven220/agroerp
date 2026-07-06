import { Module } from '@nestjs/common';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { LotsService } from './application/lots.service';
import { LotLifecycleService } from './application/lot-lifecycle.service';
import { LotTwinService } from './application/lot-twin.service';
import { LotOperationsService } from './application/lot-operations.service';
import { LotRelationsService } from './application/lot-relations.service';
import { LotImportService } from './application/lot-import.service';
import { LotSyncService } from './application/lot-sync.service';
import { FmdtReportsService } from './application/fmdt-reports.service';
import { LotsController } from './presentation/lots.controller';
import { FmdtReportsController } from './presentation/fmdt-reports.controller';

@Module({
  imports: [CoreEngineModule],
  controllers: [LotsController, FmdtReportsController],
  providers: [
    LotsService,
    LotLifecycleService,
    LotTwinService,
    LotOperationsService,
    LotRelationsService,
    LotImportService,
    LotSyncService,
    FmdtReportsService,
  ],
  exports: [LotsService, LotTwinService],
})
export class FmdtModule {}
