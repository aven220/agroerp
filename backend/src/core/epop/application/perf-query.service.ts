import { Injectable } from '@nestjs/common';
import { EVENT_TYPES, EpopSlowQueryPayload } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { extractTableNames, queryFingerprint, suggestIndex } from '../domain/query-optimizer.engine';
import { PerfAuditService } from './perf-audit.service';

@Injectable()
export class PerfQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: PerfAuditService,
  ) {}

  async recordSlowQuery(organizationId: string | undefined, payload: EpopSlowQueryPayload) {
    const tables = payload.tableNames?.length ? payload.tableNames : extractTableNames(payload.sqlText);
    const queryKey = queryFingerprint(payload.sqlText);
    const row = await this.prisma.epopSlowQuery.create({
      data: {
        organizationId,
        queryKey,
        sqlText: payload.sqlText,
        durationMs: payload.durationMs,
        moduleKey: payload.moduleKey,
        tableNames: tables,
        rowsExamined: payload.rowsExamined,
        planSummary: (payload.planSummary ?? {}) as object,
      },
    });

    if (organizationId) {
      await this.core.emitUserAction(
        organizationId,
        'SlowQuery',
        row.id,
        EVENT_TYPES.PERF_SLOW_QUERY_DETECTED,
        { durationMs: payload.durationMs, tables },
      );
    }

    if (payload.durationMs >= 200 && tables[0]) {
      await this.recommendIndex(organizationId, tables[0], ['organization_id', 'created_at'], payload.durationMs);
    }
    return row;
  }

  async recommendIndex(organizationId: string | undefined, tableName: string, columns: string[], estimatedGainMs?: number) {
    const suggestion = suggestIndex(tableName, columns);
    const rec = await this.prisma.epopIndexRecommendation.upsert({
      where: { recommendationKey: suggestion.recommendationKey },
      update: {
        reason: suggestion.reason,
        estimatedGainMs,
        status: 'suggested',
      },
      create: {
        organizationId,
        recommendationKey: suggestion.recommendationKey,
        tableName,
        columns,
        indexSql: suggestion.indexSql,
        reason: suggestion.reason,
        estimatedGainMs,
      },
    });
    if (organizationId) {
      await this.core.emitUserAction(
        organizationId,
        'IndexRecommendation',
        rec.id,
        EVENT_TYPES.PERF_INDEX_RECOMMENDED,
        { tableName, columns },
      );
    }
    return rec;
  }

  listSlowQueries(organizationId: string, limit = 100) {
    return this.prisma.epopSlowQuery.findMany({
      where: { organizationId },
      orderBy: { durationMs: 'desc' },
      take: limit,
    });
  }

  listIndexRecommendations(status?: string) {
    return this.prisma.epopIndexRecommendation.findMany({
      where: status ? { status: status as 'suggested' } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async applyIndexRecommendation(recommendationKey: string, userId?: string) {
    const rec = await this.prisma.epopIndexRecommendation.update({
      where: { recommendationKey },
      data: { status: 'applied', appliedAt: new Date() },
    });
    await this.audit.log(rec.organizationId ?? undefined, 'index_applied', 'IndexRecommendation', recommendationKey, userId, {
      indexSql: rec.indexSql,
    });
    return rec;
  }

  async analyzeAndOptimize(organizationId: string) {
    const slow = await this.prisma.epopSlowQuery.findMany({
      where: { organizationId, durationMs: { gte: 100 } },
      orderBy: { durationMs: 'desc' },
      take: 20,
    });
    const recommendations = [];
    for (const q of slow) {
      const table = q.tableNames[0];
      if (!table) continue;
      recommendations.push(await this.recommendIndex(organizationId, table, ['organization_id', 'created_at'], q.durationMs * 0.4));
    }
    return { analyzed: slow.length, recommendations };
  }
}
