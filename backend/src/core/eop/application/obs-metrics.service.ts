import { Injectable } from '@nestjs/common';
import { EopMetricPayload } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { aggregateMetricValues } from '../domain/alert-rule.engine';

@Injectable()
export class ObsMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  ingest(organizationId: string | null | undefined, payload: EopMetricPayload) {
    return this.prisma.eopMetricSample.create({
      data: {
        organizationId: organizationId ?? undefined,
        metricKey: payload.metricKey,
        kind: payload.kind as 'latency',
        serviceName: payload.serviceName,
        moduleKey: payload.moduleKey,
        apiPath: payload.apiPath,
        value: payload.value,
        unit: payload.unit,
        labels: (payload.labels ?? {}) as object,
        recordedAt: payload.recordedAt ? new Date(payload.recordedAt) : new Date(),
      },
    });
  }

  ingestBatch(organizationId: string | null | undefined, payloads: EopMetricPayload[]) {
    return Promise.all(payloads.map((p) => this.ingest(organizationId, p)));
  }

  async dashboard(organizationId: string, sinceHours = 24) {
    const since = new Date(Date.now() - sinceHours * 3_600_000);
    const samples = await this.prisma.eopMetricSample.findMany({
      where: { organizationId, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'desc' },
      take: 5000,
    });

    const byKind = new Map<string, number[]>();
    for (const s of samples) {
      const arr = byKind.get(s.kind) ?? [];
      arr.push(s.value);
      byKind.set(s.kind, arr);
    }

    const summary: Record<string, ReturnType<typeof aggregateMetricValues>> = {};
    for (const [kind, values] of byKind) {
      summary[kind] = aggregateMetricValues(values);
    }

    const byModule = await this.prisma.eopMetricSample.groupBy({
      by: ['moduleKey'],
      where: { organizationId, recordedAt: { gte: since }, moduleKey: { not: null } },
      _count: { id: true },
      _avg: { value: true },
    });

    const byApi = await this.prisma.eopMetricSample.groupBy({
      by: ['apiPath'],
      where: { organizationId, recordedAt: { gte: since }, apiPath: { not: null } },
      _count: { id: true },
      _avg: { value: true },
    });

    return {
      summary,
      byModule: byModule.map((m) => ({ moduleKey: m.moduleKey, count: m._count.id, avg: m._avg.value })),
      byApi: byApi.map((a) => ({ apiPath: a.apiPath, count: a._count.id, avg: a._avg.value })),
      sampleCount: samples.length,
    };
  }

  list(organizationId: string, kind?: string, limit = 200) {
    return this.prisma.eopMetricSample.findMany({
      where: {
        organizationId,
        ...(kind ? { kind: kind as 'latency' } : {}),
      },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
  }
}
