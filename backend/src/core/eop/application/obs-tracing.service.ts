import { Injectable } from '@nestjs/common';
import { EVENT_TYPES, EopTraceSpanPayload } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { buildTraceTree, generateSpanId, generateTraceId } from '../domain/trace.engine';

@Injectable()
export class ObsTracingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
  ) {}

  newTraceIds() {
    return { traceId: generateTraceId(), spanId: generateSpanId() };
  }

  async recordSpan(organizationId: string | null | undefined, payload: EopTraceSpanPayload) {
    const span = await this.prisma.eopTraceSpan.create({
      data: {
        organizationId: organizationId ?? undefined,
        traceId: payload.traceId,
        spanId: payload.spanId,
        parentSpanId: payload.parentSpanId,
        name: payload.name,
        component: payload.component as 'backend',
        serviceName: payload.serviceName,
        statusCode: payload.statusCode ?? 'ok',
        durationMs: payload.durationMs,
        attributes: (payload.attributes ?? {}) as object,
        startedAt: new Date(payload.startedAt),
        endedAt: new Date(payload.endedAt),
      },
    });

    if (organizationId) {
      await this.core.emitUserAction(
        organizationId,
        'ObservabilityTrace',
        span.id,
        EVENT_TYPES.OBSERVABILITY_TRACE_RECORDED,
        { traceId: payload.traceId, serviceName: payload.serviceName },
      );
    }
    return span;
  }

  recordBatch(organizationId: string | null | undefined, spans: EopTraceSpanPayload[]) {
    return Promise.all(spans.map((s) => this.recordSpan(organizationId, s)));
  }

  async getTrace(traceId: string) {
    const spans = await this.prisma.eopTraceSpan.findMany({
      where: { traceId },
      orderBy: { startedAt: 'asc' },
    });
    return {
      traceId,
      spans,
      tree: buildTraceTree(spans),
      totalDurationMs: spans.reduce((max, s) => Math.max(max, s.durationMs), 0),
    };
  }

  async listRecent(organizationId: string, limit = 50) {
    const spans = await this.prisma.eopTraceSpan.findMany({
      where: { organizationId },
      orderBy: { startedAt: 'desc' },
      take: limit * 5,
    });
    const seen = new Set<string>();
    const recent = [];
    for (const span of spans) {
      if (seen.has(span.traceId)) continue;
      seen.add(span.traceId);
      recent.push(span);
      if (recent.length >= limit) break;
    }
    return recent;
  }
}
