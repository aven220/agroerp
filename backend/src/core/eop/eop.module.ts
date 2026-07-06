import { Module } from '@nestjs/common';
import { EventsModule } from '@/core/events/events.module';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { EopController } from './presentation/eop.controller';
import { ObsAuditService } from './application/obs-audit.service';
import { ObsLoggingService } from './application/obs-logging.service';
import { ObsTracingService } from './application/obs-tracing.service';
import { ObsMetricsService } from './application/obs-metrics.service';
import { ObsHealthService } from './application/obs-health.service';
import { ObsAlertsService } from './application/obs-alerts.service';
import { ObsIncidentsService } from './application/obs-incidents.service';
import { ObsServiceMapService } from './application/obs-service-map.service';
import { ObsErrorsService } from './application/obs-errors.service';
import { ObsAiService } from './application/obs-ai.service';
import { ObsRumService } from './application/obs-rum.service';
import { ObsMobileService } from './application/obs-mobile.service';
import { ObsSyntheticService } from './application/obs-synthetic.service';
import { ObsCenterService } from './application/obs-center.service';
import { ObsSchedulerService } from './application/obs-scheduler.service';

@Module({
  imports: [EventsModule, CoreEngineModule],
  controllers: [EopController],
  providers: [
    ObsAuditService,
    ObsLoggingService,
    ObsTracingService,
    ObsMetricsService,
    ObsHealthService,
    ObsAlertsService,
    ObsIncidentsService,
    ObsServiceMapService,
    ObsErrorsService,
    ObsAiService,
    ObsRumService,
    ObsMobileService,
    ObsSyntheticService,
    ObsCenterService,
    ObsSchedulerService,
  ],
  exports: [
    ObsLoggingService,
    ObsTracingService,
    ObsMetricsService,
    ObsHealthService,
    ObsErrorsService,
    ObsAiService,
    ObsMobileService,
  ],
})
export class EopModule {}
