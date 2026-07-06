import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { EventsModule } from '@/core/events/events.module';
import { CoreEngineModule } from '@/core/engine/core-engine.module';
import { EpopController } from './presentation/epop.controller';
import { PerfAuditService } from './application/perf-audit.service';
import { PerfCacheService } from './application/perf-cache.service';
import { PerfQueryService } from './application/perf-query.service';
import { PerfMetricsService } from './application/perf-metrics.service';
import { PerfDbService } from './application/perf-db.service';
import { PerfBenchmarkService } from './application/perf-benchmark.service';
import { PerfPaginationService } from './application/perf-pagination.service';
import { PerfBundleService } from './application/perf-bundle.service';
import { PerfMobileService } from './application/perf-mobile.service';
import { PerfCenterService } from './application/perf-center.service';
import { PerfSchedulerService } from './application/perf-scheduler.service';
import { CompressionMiddleware } from './infrastructure/compression.middleware';
import { PerfTimingMiddleware } from './infrastructure/perf-timing.middleware';

@Module({
  imports: [EventsModule, CoreEngineModule],
  controllers: [EpopController],
  providers: [
    PerfAuditService,
    PerfCacheService,
    PerfQueryService,
    PerfMetricsService,
    PerfDbService,
    PerfBenchmarkService,
    PerfPaginationService,
    PerfBundleService,
    PerfMobileService,
    PerfCenterService,
    PerfSchedulerService,
    CompressionMiddleware,
    PerfTimingMiddleware,
  ],
  exports: [PerfCacheService, PerfMetricsService, PerfQueryService, PerfPaginationService],
})
export class EpopModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CompressionMiddleware, PerfTimingMiddleware).forRoutes('*');
  }
}
