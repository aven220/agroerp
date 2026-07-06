import { Injectable } from '@nestjs/common';
import { EpopPerfMetricPayload } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class PerfMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  ingest(organizationId: string | undefined, payload: EpopPerfMetricPayload) {
    return this.prisma.epopPerfMetric.create({
      data: {
        organizationId,
        metricKey: payload.metricKey,
        kind: payload.kind as 'response_time',
        moduleKey: payload.moduleKey,
        value: payload.value,
        unit: payload.unit,
        labels: (payload.labels ?? {}) as object,
      },
    });
  }

  ingestBatch(organizationId: string | undefined, payloads: EpopPerfMetricPayload[]) {
    return Promise.all(payloads.map((p) => this.ingest(organizationId, p)));
  }

  async dashboard(organizationId: string, sinceHours = 24) {
    const since = new Date(Date.now() - sinceHours * 3_600_000);
    const samples = await this.prisma.epopPerfMetric.findMany({
      where: { organizationId, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'desc' },
      take: 5000,
    });

    const byKind = new Map<string, number[]>();
    const byModule = new Map<string, number[]>();
    for (const s of samples) {
      const k = byKind.get(s.kind) ?? [];
      k.push(s.value);
      byKind.set(s.kind, k);
      if (s.moduleKey) {
        const m = byModule.get(s.moduleKey) ?? [];
        m.push(s.value);
        byModule.set(s.moduleKey, m);
      }
    }

    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    const summary: Record<string, { avg: number; max: number; count: number }> = {};
    for (const [kind, values] of byKind) {
      summary[kind] = { avg: avg(values), max: Math.max(...values), count: values.length };
    }

    return {
      summary,
      byModule: [...byModule.entries()].map(([moduleKey, values]) => ({
        moduleKey,
        avgLatency: avg(values),
        count: values.length,
      })),
      sampleCount: samples.length,
    };
  }

  list(organizationId: string, kind?: string, limit = 200) {
    return this.prisma.epopPerfMetric.findMany({
      where: {
        organizationId,
        ...(kind ? { kind: kind as 'response_time' } : {}),
      },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
  }
}
