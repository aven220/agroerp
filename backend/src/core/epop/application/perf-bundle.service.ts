import { Injectable } from '@nestjs/common';
import { EpopBundleMetricPayload } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class PerfBundleService {
  constructor(private readonly prisma: PrismaService) {}

  record(organizationId: string | undefined, payload: EpopBundleMetricPayload) {
    return this.prisma.epopBundleMetric.create({
      data: {
        organizationId,
        bundleKey: payload.bundleKey,
        name: payload.name,
        sizeBytes: payload.sizeBytes,
        gzipBytes: payload.gzipBytes,
        chunkCount: payload.chunkCount ?? 1,
        platform: payload.platform ?? 'web',
      },
    });
  }

  list(platform?: string, limit = 50) {
    return this.prisma.epopBundleMetric.findMany({
      where: platform ? { platform } : {},
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
  }

  async summary(platform = 'web') {
    const rows = await this.list(platform, 20);
    const totalBytes = rows.reduce((s, r) => s + r.sizeBytes, 0);
    const totalGzip = rows.reduce((s, r) => s + (r.gzipBytes ?? 0), 0);
    return {
      platform,
      bundles: rows.length,
      totalBytes,
      totalGzip,
      avgChunkCount: rows.length ? rows.reduce((s, r) => s + r.chunkCount, 0) / rows.length : 0,
      cdnReady: true,
      codeSplitting: true,
      imageOptimization: true,
    };
  }
}
