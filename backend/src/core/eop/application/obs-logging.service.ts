import { Injectable } from '@nestjs/common';
import { EVENT_TYPES, EopLogPayload } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';

@Injectable()
export class ObsLoggingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
  ) {}

  async ingest(organizationId: string | null | undefined, payload: EopLogPayload) {
    const entry = await this.prisma.eopLogEntry.create({
      data: {
        organizationId: organizationId ?? undefined,
        logKey: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        level: payload.level as 'info',
        component: payload.component as 'backend',
        serviceName: payload.serviceName,
        message: payload.message,
        traceId: payload.traceId,
        spanId: payload.spanId,
        userId: payload.userId,
        requestId: payload.requestId,
        attributes: (payload.attributes ?? {}) as object,
        recordedAt: payload.recordedAt ? new Date(payload.recordedAt) : new Date(),
      },
    });

    if (organizationId && (payload.level === 'error' || payload.level === 'fatal')) {
      await this.core.emitUserAction(
        organizationId,
        'ObservabilityLog',
        entry.id,
        EVENT_TYPES.OBSERVABILITY_LOG_INGESTED,
        { level: payload.level, component: payload.component },
      );
    }
    return entry;
  }

  ingestBatch(organizationId: string | null | undefined, payloads: EopLogPayload[]) {
    return Promise.all(payloads.map((p) => this.ingest(organizationId, p)));
  }

  findAll(organizationId: string, filters?: { level?: string; component?: string; limit?: number }) {
    return this.prisma.eopLogEntry.findMany({
      where: {
        organizationId,
        ...(filters?.level ? { level: filters.level as 'info' } : {}),
        ...(filters?.component ? { component: filters.component as 'backend' } : {}),
      },
      orderBy: { recordedAt: 'desc' },
      take: filters?.limit ?? 200,
    });
  }
}
