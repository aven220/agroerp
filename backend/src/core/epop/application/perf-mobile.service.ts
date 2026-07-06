import { Injectable } from '@nestjs/common';
import { EpopMobilePerfPayload } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class PerfMobileService {
  constructor(private readonly prisma: PrismaService) {}

  ingest(organizationId: string | undefined, payload: EpopMobilePerfPayload) {
    return this.prisma.epopMobilePerfSample.create({
      data: {
        organizationId,
        deviceId: payload.deviceId,
        sampleKey: `mobile-${payload.deviceId}-${Date.now()}`,
        startupMs: payload.startupMs,
        memoryMb: payload.memoryMb,
        batteryPct: payload.batteryPct,
        fps: payload.fps,
        syncMs: payload.syncMs,
        listRenderMs: payload.listRenderMs,
        offlineOps: payload.offlineOps ?? 0,
        attributes: (payload.attributes ?? {}) as object,
      },
    });
  }

  list(organizationId: string, limit = 100) {
    return this.prisma.epopMobilePerfSample.findMany({
      where: { organizationId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
  }

  async summary(organizationId: string) {
    const rows = await this.list(organizationId, 200);
    const avg = (pick: (r: (typeof rows)[number]) => number | null | undefined) => {
      const vals = rows.map(pick).filter((v): v is number => v != null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };
    return {
      samples: rows.length,
      avgStartupMs: avg((r) => r.startupMs),
      avgMemoryMb: avg((r) => r.memoryMb),
      avgFps: avg((r) => r.fps),
      avgSyncMs: avg((r) => r.syncMs),
      avgListRenderMs: avg((r) => r.listRenderMs),
      offlineOps: rows.reduce((s, r) => s + r.offlineOps, 0),
      offlineFirst: true,
    };
  }
}
