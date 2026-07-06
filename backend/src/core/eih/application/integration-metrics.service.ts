import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class IntegrationMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(organizationId: string) {
    const since24h = new Date(Date.now() - 24 * 3_600_000);

    const [
      totalConnectors,
      activeConnectors,
      errorConnectors,
      totalFlows,
      publishedFlows,
      syncs24h,
      failedSyncs24h,
      pendingErrors,
      webhooks,
    ] = await Promise.all([
      this.prisma.eihConnector.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.eihConnector.count({ where: { organizationId, status: 'active', deletedAt: null } }),
      this.prisma.eihConnector.count({ where: { organizationId, status: 'error', deletedAt: null } }),
      this.prisma.eihIntegrationFlow.count({ where: { organizationId } }),
      this.prisma.eihIntegrationFlow.count({ where: { organizationId, status: 'published' } }),
      this.prisma.eihSyncRun.count({ where: { organizationId, createdAt: { gte: since24h } } }),
      this.prisma.eihSyncRun.count({
        where: { organizationId, createdAt: { gte: since24h }, status: 'failed' },
      }),
      this.prisma.eihSyncError.count({ where: { organizationId, status: 'pending' } }),
      this.prisma.eihWebhookEndpoint.count({ where: { organizationId, isActive: true } }),
    ]);

    const recentRuns = await this.prisma.eihSyncRun.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        runKey: true,
        status: true,
        recordsIn: true,
        recordsOut: true,
        durationMs: true,
        createdAt: true,
      },
    });

    const avgDuration = await this.prisma.eihSyncRun.aggregate({
      where: { organizationId, createdAt: { gte: since24h }, durationMs: { not: null } },
      _avg: { durationMs: true },
    });

    return {
      totalConnectors,
      activeConnectors,
      errorConnectors,
      totalFlows,
      publishedFlows,
      syncs24h,
      failedSyncs24h,
      pendingErrors,
      webhooks,
      avgDurationMs: Math.round(avgDuration._avg.durationMs ?? 0),
      successRate24h: syncs24h > 0 ? Math.round(((syncs24h - failedSyncs24h) / syncs24h) * 100) : 100,
      recentRuns,
    };
  }
}
