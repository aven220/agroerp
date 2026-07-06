import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { PerfMetricsService } from './perf-metrics.service';
import { PerfCacheService } from './perf-cache.service';
import { PerfBundleService } from './perf-bundle.service';
import { PerfMobileService } from './perf-mobile.service';

@Injectable()
export class PerfCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: PerfMetricsService,
    private readonly cache: PerfCacheService,
    private readonly bundles: PerfBundleService,
    private readonly mobile: PerfMobileService,
  ) {}

  async dashboard(organizationId: string) {
    const since24h = new Date(Date.now() - 24 * 3_600_000);
    const [
      metricsDash,
      slowQueries,
      indexRecs,
      cacheStats,
      benchmarks,
      bundleSummary,
      mobileSummary,
      maintenanceJobs,
    ] = await Promise.all([
      this.metrics.dashboard(organizationId),
      this.prisma.epopSlowQuery.count({ where: { organizationId, recordedAt: { gte: since24h } } }),
      this.prisma.epopIndexRecommendation.count({ where: { status: 'suggested' } }),
      this.cache.stats(organizationId),
      this.prisma.epopBenchmarkRun.count({ where: { organizationId } }),
      this.bundles.summary('web'),
      this.mobile.summary(organizationId),
      this.prisma.epopMaintenanceJob.count({ where: { isActive: true } }),
    ]);

    const mem = process.memoryUsage();
    return {
      responseTimeAvg: metricsDash.summary.response_time?.avg ?? 0,
      slowQueries24h: slowQueries,
      indexRecommendations: indexRecs,
      cacheLayers: cacheStats,
      benchmarks,
      maintenanceJobs,
      memoryMb: mem.heapUsed / 1024 / 1024,
      cpuLoad: process.cpuUsage().user / 1000,
      metrics: metricsDash,
      bundles: bundleSummary,
      mobile: mobileSummary,
      features: {
        multilevelCache: true,
        lazyLoading: true,
        virtualization: true,
        smartPagination: true,
        responseCompression: true,
        dataStreaming: true,
        imageOptimization: true,
        cdnReady: true,
        offlineFirst: true,
      },
    };
  }
}
