import { Injectable } from '@nestjs/common';
import { EipPrismaService } from '@/shared/infrastructure/database/eip-prisma.service';
import { aggregateEipIndicators, generateEipKey } from '../domain/eip.engine';

@Injectable()
export class EipMonitoringService {
  constructor(private readonly prisma: EipPrismaService) {}

  async dashboard(organizationId: string) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [invocations, failed, events, dlq, webhooksPending, esbMessages, avgDuration] = await Promise.all([
      this.prisma.eipInvocationLog.count({ where: { organizationId, createdAt: { gte: since } } }),
      this.prisma.eipInvocationLog.count({ where: { organizationId, success: false, createdAt: { gte: since } } }),
      this.prisma.eipEventMessage.count({ where: { organizationId, publishedAt: { gte: since } } }),
      this.prisma.eipEventDlq.count({ where: { organizationId } }),
      this.prisma.eipWebhookDelivery.count({ where: { organizationId, status: { in: ['pending', 'failed'] } } }),
      this.prisma.eipEsbMessage.count({ where: { organizationId, createdAt: { gte: since } } }),
      this.prisma.eipInvocationLog.aggregate({
        where: { organizationId, createdAt: { gte: since }, durationMs: { not: null } },
        _avg: { durationMs: true },
      }),
    ]);
    const indicators = aggregateEipIndicators({
      invocations24h: invocations,
      failedInvocations24h: failed,
      events24h: events,
      dlqCount: dlq,
      webhooksPending,
      esbMessages24h: esbMessages,
      avgDurationMs: Math.round(avgDuration._avg.durationMs ?? 0),
    });
    const seq = await this.prisma.eipIndicatorSnapshot.count({ where: { organizationId } });
    await this.prisma.eipIndicatorSnapshot.create({
      data: {
        organizationId,
        snapshotKey: generateEipKey('SNAP', seq + 1),
        indicators: indicators as object,
      },
    });
    return indicators;
  }

  invocations(organizationId: string, channel?: string, limit = 100) {
    return this.prisma.eipInvocationLog.findMany({
      where: { organizationId, ...(channel ? { channel } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  errors(organizationId: string, limit = 100) {
    return this.prisma.eipInvocationLog.findMany({
      where: { organizationId, success: false },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  configChanges(organizationId: string, limit = 100) {
    return this.prisma.eipConfigChange.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  snapshots(organizationId: string, limit = 24) {
    return this.prisma.eipIndicatorSnapshot.findMany({
      where: { organizationId },
      orderBy: { capturedAt: 'desc' },
      take: limit,
    });
  }
}
