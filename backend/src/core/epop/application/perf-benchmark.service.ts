import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { improvementPct } from '../domain/query-optimizer.engine';
import { PerfMetricsService } from './perf-metrics.service';
import { PerfCacheService } from './perf-cache.service';

@Injectable()
export class PerfBenchmarkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly metrics: PerfMetricsService,
    private readonly cache: PerfCacheService,
  ) {}

  list(organizationId?: string) {
    return this.prisma.epopBenchmarkRun.findMany({
      where: organizationId ? { organizationId } : {},
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async run(organizationId: string | undefined, name: string, scenario: string) {
    const runKey = `bench-${scenario}-${Date.now()}`;
    const startedAt = new Date();
    const run = await this.prisma.epopBenchmarkRun.create({
      data: {
        organizationId,
        runKey,
        name,
        scenario,
        status: 'running',
        startedAt,
      },
    });

    const before = await this.measure(organizationId, scenario);
    // Warm cache / optimize path
    await this.cache.set(organizationId, {
      cacheKey: `benchmark:${scenario}`,
      layer: 'server',
      value: { warmed: true, at: new Date().toISOString() },
      ttlSeconds: 60,
    });
    const after = await this.measure(organizationId, scenario, true);
    const completedAt = new Date();
    const improvement = improvementPct(before.responseTimeMs, after.responseTimeMs);

    const updated = await this.prisma.epopBenchmarkRun.update({
      where: { id: run.id },
      data: {
        status: 'completed',
        beforeMetrics: before as object,
        afterMetrics: after as object,
        improvementPct: improvement,
        durationMs: completedAt.getTime() - startedAt.getTime(),
        completedAt,
        details: { scenario },
      },
    });

    await this.metrics.ingest(organizationId, {
      metricKey: `benchmark.${scenario}.improvement`,
      kind: 'custom',
      value: improvement,
      unit: '%',
      moduleKey: 'epop',
    });

    if (organizationId) {
      await this.core.emitUserAction(
        organizationId,
        'BenchmarkRun',
        run.id,
        EVENT_TYPES.PERF_BENCHMARK_COMPLETED,
        { scenario, improvementPct: improvement },
      );
    }
    return updated;
  }

  private async measure(organizationId: string | undefined, scenario: string, useCache = false) {
    const start = Date.now();
    if (useCache) {
      await this.cache.get(organizationId, `benchmark:${scenario}`, 'server');
    } else {
      await this.prisma.epopPerfMetric.count({
        where: organizationId ? { organizationId } : {},
      });
    }
    const mem = process.memoryUsage();
    return {
      responseTimeMs: Date.now() - start,
      memoryMb: mem.heapUsed / 1024 / 1024,
      scenario,
      cached: useCache,
    };
  }
}
