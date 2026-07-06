import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class PluginMarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  async search(params: {
    q?: string;
    categoryKey?: string;
    pluginType?: string;
    organizationId?: string;
  }) {
    const orgFilter = params.organizationId
      ? { OR: [{ visibility: 'public' as const }, { organizationId: params.organizationId }] }
      : { visibility: 'public' as const };

    return this.prisma.eppmPluginPackage.findMany({
      where: {
        deletedAt: null,
        status: 'published',
        ...orgFilter,
        ...(params.categoryKey ? { categoryKey: params.categoryKey } : {}),
        ...(params.pluginType ? { pluginType: params.pluginType as 'business_module' } : {}),
        ...(params.q
          ? {
              OR: [
                { name: { contains: params.q, mode: 'insensitive' } },
                { description: { contains: params.q, mode: 'insensitive' } },
                { pluginKey: { contains: params.q, mode: 'insensitive' } },
                { vendor: { contains: params.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { category: true },
      orderBy: [{ ratingAvg: 'desc' }, { downloadCount: 'desc' }],
      take: 100,
    });
  }

  async addReview(
    organizationId: string,
    userId: string,
    pluginKey: string,
    rating: number,
    comment?: string,
  ) {
    const plugin = await this.prisma.eppmPluginPackage.findUnique({ where: { pluginKey } });
    if (!plugin) return null;

    await this.prisma.eppmPluginReview.upsert({
      where: {
        pluginId_organizationId_userId: {
          pluginId: plugin.id,
          organizationId,
          userId,
        },
      },
      update: { rating, comment },
      create: { pluginId: plugin.id, organizationId, userId, rating, comment },
    });

    const agg = await this.prisma.eppmPluginReview.aggregate({
      where: { pluginId: plugin.id },
      _avg: { rating: true },
      _count: { id: true },
    });

    await this.prisma.eppmPluginPackage.update({
      where: { id: plugin.id },
      data: {
        ratingAvg: agg._avg.rating ?? 0,
        ratingCount: agg._count.id,
      },
    });
    return { rating: agg._avg.rating, count: agg._count.id };
  }

  incrementDownload(pluginKey: string) {
    return this.prisma.eppmPluginPackage.updateMany({
      where: { pluginKey },
      data: { downloadCount: { increment: 1 } },
    });
  }
}
