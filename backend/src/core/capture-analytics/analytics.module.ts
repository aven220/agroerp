import { Module } from '@nestjs/common';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { AnalyticsEventService } from './application/analytics-event.service';
import { CaptureAnalyticsEventPublisher } from './infrastructure/capture-analytics-event.publisher';

@Module({
  imports: [CoreEngineModule],
  providers: [CaptureAnalyticsEventPublisher, AnalyticsEventService],
  exports: [AnalyticsEventService],
})
export class CaptureAnalyticsModule {}
