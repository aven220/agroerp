import { Injectable } from '@nestjs/common';
import { EopMobileTelemetryPayload } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class ObsMobileService {
  constructor(private readonly prisma: PrismaService) {}

  ingest(organizationId: string | null | undefined, payload: EopMobileTelemetryPayload) {
    return this.prisma.eopMobileTelemetry.create({
      data: {
        organizationId: organizationId ?? undefined,
        deviceId: payload.deviceId,
        eventType: payload.eventType,
        message: payload.message,
        stackTrace: payload.stackTrace,
        durationMs: payload.durationMs,
        isOffline: payload.isOffline ?? false,
        appVersion: payload.appVersion,
        attributes: (payload.attributes ?? {}) as object,
      },
    });
  }

  ingestBatch(organizationId: string | null | undefined, payloads: EopMobileTelemetryPayload[]) {
    return Promise.all(payloads.map((p) => this.ingest(organizationId, p)));
  }

  list(organizationId: string, limit = 100) {
    return this.prisma.eopMobileTelemetry.findMany({
      where: { organizationId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
  }
}
