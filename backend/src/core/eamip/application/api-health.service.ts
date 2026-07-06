import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { ApiHealthStatus } from '@agroerp/shared';

@Injectable()
export class ApiHealthService {
  constructor(private readonly prisma: PrismaService) {}

  async checkConnector(organizationId: string, connectorId: string) {
    const connector = await this.prisma.apiConnector.findFirst({
      where: { id: connectorId, organizationId },
    });
    if (!connector) return null;

    const start = Date.now();
    let status: ApiHealthStatus = 'unknown';
    let details: Record<string, unknown> = {};

    if (connector.healthUrl) {
      try {
        const res = await fetch(connector.healthUrl, { signal: AbortSignal.timeout(5000) });
        status = res.ok ? 'healthy' : 'degraded';
        details = { statusCode: res.status };
      } catch (err) {
        status = 'down';
        details = { error: err instanceof Error ? err.message : 'unreachable' };
      }
    } else if (connector.baseUrl) {
      status = 'healthy';
      details = { mode: 'configured' };
    }

    const latencyMs = Date.now() - start;
    await this.prisma.apiHealthSnapshot.create({
      data: {
        organizationId,
        targetType: 'connector',
        targetRef: connector.connectorKey,
        status,
        latencyMs,
        details: details as object,
      },
    });

    return { status, latencyMs, details };
  }

  async checkRoute(organizationId: string, routeKey: string) {
    const route = await this.prisma.apiRoute.findFirst({
      where: { organizationId, routeKey, isActive: true },
    });
    if (!route) return null;

    const status: ApiHealthStatus = route.isActive ? 'healthy' : 'down';
    await this.prisma.apiHealthSnapshot.create({
      data: {
        organizationId,
        targetType: 'route',
        targetRef: routeKey,
        status,
        latencyMs: 0,
        details: { upstreamPath: route.upstreamPath } as object,
      },
    });
    return { status, routeKey };
  }

  async latestSnapshots(organizationId: string, limit = 50) {
    return this.prisma.apiHealthSnapshot.findMany({
      where: { organizationId },
      orderBy: { checkedAt: 'desc' },
      take: limit,
    });
  }
}
