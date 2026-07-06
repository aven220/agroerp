import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class DeviceMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(organizationId: string) {
    const since24h = new Date(Date.now() - 86_400_000);

    const [
      totalDevices,
      activeDevices,
      offlineDevices,
      readings24h,
      alertsOpen,
      gatewaysOnline,
    ] = await Promise.all([
      this.prisma.eiesdpDevice.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.eiesdpDevice.count({ where: { organizationId, status: 'active', deletedAt: null } }),
      this.prisma.eiesdpDevice.count({ where: { organizationId, status: 'offline', deletedAt: null } }),
      this.prisma.eiesdpTelemetryReading.count({ where: { organizationId, recordedAt: { gte: since24h } } }),
      this.prisma.eiesdpAlert.count({ where: { organizationId, isAcknowledged: false } }),
      this.prisma.eiesdpEdgeGateway.count({
        where: {
          organizationId,
          status: 'online',
          lastHeartbeat: { gte: new Date(Date.now() - 120_000) },
        },
      }),
    ]);

    const byType = await this.prisma.eiesdpDevice.groupBy({
      by: ['deviceType'],
      where: { organizationId, deletedAt: null },
      _count: { id: true },
    });

    const topMetrics = await this.prisma.eiesdpTelemetryReading.groupBy({
      by: ['metricKey'],
      where: { organizationId, recordedAt: { gte: since24h } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    return {
      totalDevices,
      activeDevices,
      offlineDevices,
      readings24h,
      alertsOpen,
      gatewaysOnline,
      byType: byType.map((t) => ({ type: t.deviceType, count: t._count.id })),
      topMetrics: topMetrics.map((m) => ({ metricKey: m.metricKey, count: m._count.id })),
    };
  }
}
