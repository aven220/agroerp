import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class EneacMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(organizationId: string) {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 3600000);

    const [
      unreadCount,
      importantCount,
      deliveredLast24h,
      failedDeliveries,
      avgDeliveryLatency,
      bySeverity,
      byChannel,
      activeRules,
      pendingSchedules,
    ] = await Promise.all([
      this.prisma.notificationMessage.count({
        where: { organizationId, status: 'unread', deletedAt: null },
      }),
      this.prisma.notificationMessage.count({
        where: { organizationId, isImportant: true, deletedAt: null, status: { not: 'deleted' } },
      }),
      this.prisma.notificationDelivery.count({
        where: { organizationId, deliveredAt: { gte: dayAgo } },
      }),
      this.prisma.notificationDelivery.count({
        where: { organizationId, status: 'failed' },
      }),
      this.prisma.$queryRaw<{ avg_ms: number }[]>`
        SELECT AVG(latency_ms) as avg_ms FROM notification_deliveries
        WHERE organization_id = ${organizationId}::uuid AND latency_ms IS NOT NULL
      `,
      this.prisma.notificationMessage.groupBy({
        by: ['alertSeverity'],
        where: { organizationId, deletedAt: null, createdAt: { gte: dayAgo } },
        _count: { id: true },
      }),
      this.prisma.notificationDelivery.groupBy({
        by: ['channel'],
        where: { organizationId, createdAt: { gte: dayAgo } },
        _count: { id: true },
      }),
      this.prisma.notificationRule.count({
        where: { organizationId, status: 'active', deletedAt: null },
      }),
      this.prisma.notificationSchedule.count({
        where: { organizationId, status: 'pending' },
      }),
    ]);

    const readStats = await this.prisma.$queryRaw<{ avg_read_minutes: number }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM (read_at - created_at)) / 60) as avg_read_minutes
      FROM notification_messages
      WHERE organization_id = ${organizationId}::uuid
        AND read_at IS NOT NULL
        AND created_at >= ${dayAgo}
    `;

    const attendStats = await this.prisma.$queryRaw<{ avg_attend_minutes: number }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM (attended_at - created_at)) / 60) as avg_attend_minutes
      FROM notification_messages
      WHERE organization_id = ${organizationId}::uuid
        AND attended_at IS NOT NULL
        AND created_at >= ${dayAgo}
    `;

    return {
      kpis: {
        unread: unreadCount,
        important: importantCount,
        deliveredLast24h,
        failedDeliveries,
        activeRules,
        pendingSchedules,
        avgDeliveryLatencyMs: Number(avgDeliveryLatency[0]?.avg_ms ?? 0),
        avgReadMinutes: Number(readStats[0]?.avg_read_minutes ?? 0),
        avgAttendMinutes: Number(attendStats[0]?.avg_attend_minutes ?? 0),
      },
      bySeverity: bySeverity.map((r) => ({
        severity: r.alertSeverity,
        count: r._count.id,
      })),
      byChannel: byChannel.map((r) => ({
        channel: r.channel,
        count: r._count.id,
      })),
      aiReadiness: {
        autoPrioritization: true,
        intelligentGrouping: true,
        anomalyDetection: true,
        noiseReduction: true,
      },
    };
  }

  async getTimeline(
    organizationId: string,
    from?: string,
    to?: string,
    eventType?: string,
    limit = 100,
  ) {
    const events = await this.prisma.event.findMany({
      where: {
        organizationId,
        eventType,
        occurredAt: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      orderBy: { globalSequence: 'desc' },
      take: limit,
    });

    const messages = await this.prisma.notificationMessage.findMany({
      where: {
        organizationId,
        deletedAt: null,
        createdAt: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      domainEvents: events.map((e) => ({
        ...e,
        globalSequence: e.globalSequence.toString(),
        version: e.version.toString(),
      })),
      notifications: messages,
    };
  }
}
