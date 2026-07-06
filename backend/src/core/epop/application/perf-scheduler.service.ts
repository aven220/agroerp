import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { PerfCacheService } from './perf-cache.service';
import { PerfDbService } from './perf-db.service';
import { PerfMetricsService } from './perf-metrics.service';
import { PerfQueryService } from './perf-query.service';

@Injectable()
export class PerfSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(PerfSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: PerfCacheService,
    private readonly db: PerfDbService,
    private readonly metrics: PerfMetricsService,
    private readonly queries: PerfQueryService,
  ) {}

  async onModuleInit() {
    await this.seedMaintenance();
    const timer = setInterval(() => this.tick().catch(() => undefined), 60_000);
    timer.unref?.();
    this.logger.log('EPOP scheduler started (60s cache purge / metrics / maintenance)');
  }

  private async seedMaintenance() {
    await this.db.upsertMaintenance('maint-cache-purge', 'cache_purge', '*/5 * * * *');
    await this.db.upsertMaintenance('maint-vacuum-analyze', 'vacuum_analyze', '0 3 * * *');
    await this.db.upsertMaintenance('maint-reindex-review', 'reindex', '0 4 * * 0');
  }

  private async tick() {
    await this.cache.purgeExpired();
    const mem = process.memoryUsage();
    const orgs = await this.prisma.organization.findMany({
      where: { deletedAt: null },
      select: { id: true },
      take: 20,
    });

    for (const org of orgs) {
      await this.metrics.ingestBatch(org.id, [
        {
          metricKey: 'process.heap',
          kind: 'memory',
          value: mem.heapUsed / 1024 / 1024,
          unit: 'MB',
          moduleKey: 'backend',
        },
        {
          metricKey: 'process.cpu',
          kind: 'cpu',
          value: process.cpuUsage().user / 1000,
          unit: 'ms',
          moduleKey: 'backend',
        },
        {
          metricKey: 'pool.estimate',
          kind: 'connection_pool',
          value: 10,
          unit: 'connections',
          moduleKey: 'database',
        },
      ]);
      await this.queries.analyzeAndOptimize(org.id);
    }

    const jobs = await this.prisma.epopMaintenanceJob.findMany({ where: { isActive: true, jobType: 'cache_purge' } });
    for (const job of jobs) {
      await this.db.runMaintenance(job.jobKey);
    }
  }
}
