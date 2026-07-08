import { Module } from '@nestjs/common';
import { FormsModule } from '@/core/forms/forms.module';
import { EventsModule } from '@/core/events/events.module';
import { AgriculturalTimelineService } from './application/agricultural-timeline.service';
import { TimelineBuilderService } from './application/timeline-builder.service';
import { TimelineQueryService } from './application/timeline-query.service';
import { AgriculturalTimelineController } from './presentation/agricultural-timeline.controller';
import { SubmissionProvider } from './providers/submission.provider';
import { AnalyticsProvider } from './providers/analytics.provider';
import { EventsProvider } from './providers/events.provider';
import {
  TIMELINE_PROVIDERS,
  type TimelineProvider,
} from './interfaces/timeline-provider.interface';

@Module({
  imports: [FormsModule, EventsModule],
  controllers: [AgriculturalTimelineController],
  providers: [
    SubmissionProvider,
    AnalyticsProvider,
    EventsProvider,
    {
      provide: TIMELINE_PROVIDERS,
      useFactory: (
        submissions: SubmissionProvider,
        analytics: AnalyticsProvider,
        events: EventsProvider,
      ): TimelineProvider[] => [submissions, analytics, events],
      inject: [SubmissionProvider, AnalyticsProvider, EventsProvider],
    },
    TimelineQueryService,
    TimelineBuilderService,
    AgriculturalTimelineService,
  ],
  exports: [AgriculturalTimelineService, TimelineBuilderService],
})
export class AgriculturalTimelineModule {}
