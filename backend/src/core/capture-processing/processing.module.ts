import { Module } from '@nestjs/common';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { CaptureAnalyticsModule } from '@/core/capture-analytics/analytics.module';
import { PrmModule } from '@/core/prm/prm.module';
import { FtipModule } from '@/core/ftip/ftip.module';
import { FmdtModule } from '@/core/fmdt/fmdt.module';
import { SubmissionProcessorService } from './application/submission-processor.service';
import {
  CAPTURE_SUBMISSION_PROCESSORS,
  FarmSubmissionProcessor,
  ProducerSubmissionProcessor,
  ProductionSubmissionProcessor,
} from './domain/processors';

@Module({
  imports: [CoreEngineModule, CaptureAnalyticsModule, PrmModule, FtipModule, FmdtModule],
  providers: [
    ProducerSubmissionProcessor,
    FarmSubmissionProcessor,
    ProductionSubmissionProcessor,
    {
      provide: CAPTURE_SUBMISSION_PROCESSORS,
      useFactory: (
        producer: ProducerSubmissionProcessor,
        farm: FarmSubmissionProcessor,
        production: ProductionSubmissionProcessor,
      ) => [producer, farm, production],
      inject: [
        ProducerSubmissionProcessor,
        FarmSubmissionProcessor,
        ProductionSubmissionProcessor,
      ],
    },
    SubmissionProcessorService,
  ],
  exports: [SubmissionProcessorService],
})
export class CaptureProcessingModule {}
