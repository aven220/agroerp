import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class ApiAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async logRequest(data: {
    organizationId: string;
    clientId?: string;
    apiDefinitionId?: string;
    routeKey?: string;
    method: string;
    path: string;
    statusCode: number;
    latencyMs: number;
    moduleRef?: string;
    errorMessage?: string;
  }) {
    await this.prisma.apiRequestLog.create({ data });
  }

  async getDashboard(organizationId: string) {
    const since24h = new Date(Date.now() - 24 * 3600000);
    const sinceMonth = new Date(Date.now() - 30 * 24 * 3600000);

    const [logs24h, logsMonth, byClient, byModule, byEndpoint] = await Promise.all([
      this.prisma.apiRequestLog.findMany({ where: { organizationId, requestedAt: { gte: since24h } } }),
      this.prisma.apiRequestLog.count({ where: { organizationId, requestedAt: { gte: sinceMonth } } }),
      this.groupByClient(organizationId, since24h),
      this.groupByModule(organizationId, since24h),
      this.groupByEndpoint(organizationId, since24h),
    ]);

    const total24h = logs24h.length;
    const errors24h = logs24h.filter((l) => l.statusCode >= 400).length;
    const avgLatency = total24h
      ? Math.round(logs24h.reduce((s, l) => s + l.latencyMs, 0) / total24h)
      : 0;
    const successRate = total24h ? Math.round(((total24h - errors24h) / total24h) * 1000) / 10 : 100;

    return {
      kpis: {
        requests24h: total24h,
        requestsMonth: logsMonth,
        avgLatencyMs: avgLatency,
        errorRatePct: total24h ? Math.round((errors24h / total24h) * 1000) / 10 : 0,
        successRatePct: successRate,
        availabilityPct: successRate,
      },
      byClient,
      byModule,
      byEndpoint,
    };
  }

  async clientHistory(organizationId: string, clientId: string, limit = 100) {
    return this.prisma.apiRequestLog.findMany({
      where: { organizationId, clientId },
      orderBy: { requestedAt: 'desc' },
      take: limit,
    });
  }

  private async groupByClient(organizationId: string, since: Date) {
    const rows = await this.prisma.apiRequestLog.groupBy({
      by: ['clientId'],
      where: { organizationId, requestedAt: { gte: since }, clientId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { clientId: 'desc' } },
      take: 10,
    });
    return rows.map((r) => ({ clientId: r.clientId, count: r._count._all }));
  }

  private async groupByModule(organizationId: string, since: Date) {
    const rows = await this.prisma.apiRequestLog.groupBy({
      by: ['moduleRef'],
      where: { organizationId, requestedAt: { gte: since }, moduleRef: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { moduleRef: 'desc' } },
      take: 10,
    });
    return rows.map((r) => ({ module: r.moduleRef, count: r._count._all }));
  }

  private async groupByEndpoint(organizationId: string, since: Date) {
    const rows = await this.prisma.apiRequestLog.groupBy({
      by: ['method', 'path'],
      where: { organizationId, requestedAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { path: 'desc' } },
      take: 15,
    });
    return rows.map((r) => ({ method: r.method, path: r.path, count: r._count._all }));
  }
}
