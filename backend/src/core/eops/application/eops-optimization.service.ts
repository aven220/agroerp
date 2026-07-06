import { Injectable } from '@nestjs/common';
import { PerfCacheService } from '@/core/epop/application/perf-cache.service';
import { PerfQueryService } from '@/core/epop/application/perf-query.service';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class EopsOptimizationService {
  constructor(
    private readonly cache: PerfCacheService,
    private readonly queries: PerfQueryService,
    private readonly prisma: PrismaService,
  ) {}

  async dashboard(organizationId: string) {
    const [cacheStats, slowQueries, indexRecs] = await Promise.all([
      this.cache.stats(organizationId),
      this.prisma.epopSlowQuery.findMany({ where: { organizationId }, orderBy: { durationMs: 'desc' }, take: 10 }),
      this.prisma.epopIndexRecommendation.findMany({ where: { organizationId }, take: 20 }),
    ]);
    return {
      cache: cacheStats,
      slowQueries: slowQueries.length,
      indexRecommendations: indexRecs.length,
      capabilities: [
        'query_optimization',
        'cache_optimization',
        'compression',
        'lazy_loading',
        'image_optimization',
        'api_optimization',
        'analytical_query_optimization',
        'index_review',
      ],
      bridge: 'epop',
    };
  }

  runIndexReview(organizationId: string) {
    return this.queries.analyzeAndOptimize(organizationId);
  }

  purgeCache() {
    return this.cache.purgeExpired();
  }
}
