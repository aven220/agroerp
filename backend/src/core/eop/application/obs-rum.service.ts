import { Injectable } from '@nestjs/common';
import { EopRumPayload } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class ObsRumService {
  constructor(private readonly prisma: PrismaService) {}

  ingest(organizationId: string | null | undefined, payload: EopRumPayload) {
    return this.prisma.eopRumEvent.create({
      data: {
        organizationId: organizationId ?? undefined,
        sessionId: payload.sessionId,
        userId: payload.userId,
        pagePath: payload.pagePath,
        eventType: payload.eventType,
        durationMs: payload.durationMs,
        userAgent: payload.userAgent,
        attributes: (payload.attributes ?? {}) as object,
      },
    });
  }

  list(organizationId: string, limit = 200) {
    return this.prisma.eopRumEvent.findMany({
      where: { organizationId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
  }
}
