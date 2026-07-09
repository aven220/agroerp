import { Module } from '@nestjs/common';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { IdentityModule } from '@/core/identity/identity.module';
import { ProducersService } from './application/producers.service';
import { ProducerLifecycleService } from './application/producer-lifecycle.service';
import { ProducerRelationsService } from './application/producer-relations.service';
import { ProducerSyncService } from './application/producer-sync.service';
import { SegmentsService } from './application/segments.service';
import { PrmReportsService } from './application/prm-reports.service';
import { ProducersController } from './presentation/producers.controller';
import { SegmentsController } from './presentation/segments.controller';
import { PrmReportsController } from './presentation/prm-reports.controller';

@Module({
  imports: [CoreEngineModule, IdentityModule],
  controllers: [ProducersController, SegmentsController, PrmReportsController],
  providers: [
    ProducersService,
    ProducerLifecycleService,
    ProducerRelationsService,
    ProducerSyncService,
    SegmentsService,
    PrmReportsService,
  ],
  exports: [ProducersService, ProducerSyncService, ProducerLifecycleService],
})
export class PrmModule {}
