import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class PluginMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(organizationId: string) {
    const since24h = new Date(Date.now() - 86_400_000);

    const [
      totalPublished,
      installedCount,
      enabledCount,
      disabledCount,
      failedInstalls,
      pendingUpdates,
      audit24h,
    ] = await Promise.all([
      this.prisma.eppmPluginPackage.count({ where: { status: 'published', deletedAt: null } }),
      this.prisma.eppmPluginInstall.count({
        where: { organizationId, status: { not: 'uninstalled' } },
      }),
      this.prisma.eppmPluginInstall.count({ where: { organizationId, status: 'enabled' } }),
      this.prisma.eppmPluginInstall.count({ where: { organizationId, status: 'disabled' } }),
      this.prisma.eppmPluginInstall.count({ where: { organizationId, status: 'failed' } }),
      this.prisma.eppmPluginUpdateJob.count({
        where: { organizationId, status: { in: ['pending', 'running'] } },
      }),
      this.prisma.eppmPluginAuditLog.count({
        where: { organizationId, createdAt: { gte: since24h } },
      }),
    ]);

    const topPlugins = await this.prisma.eppmPluginPackage.findMany({
      where: { status: 'published', deletedAt: null },
      orderBy: { downloadCount: 'desc' },
      take: 5,
      select: { pluginKey: true, name: true, downloadCount: true, ratingAvg: true },
    });

    const byType = await this.prisma.eppmPluginPackage.groupBy({
      by: ['pluginType'],
      where: { status: 'published', deletedAt: null },
      _count: { id: true },
    });

    return {
      totalPublished,
      installedCount,
      enabledCount,
      disabledCount,
      failedInstalls,
      pendingUpdates,
      audit24h,
      topPlugins,
      byType: byType.map((t) => ({ type: t.pluginType, count: t._count.id })),
    };
  }
}
