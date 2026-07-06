import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { errorFingerprint } from '../domain/trace.engine';

@Injectable()
export class ObsErrorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
  ) {}

  async track(organizationId: string | null | undefined, data: {
    component: string; serviceName: string; message: string;
    stackTrace?: string; traceId?: string; attributes?: Record<string, unknown>;
  }) {
    const fingerprint = errorFingerprint(data.component, data.message, data.stackTrace);
    const existing = await this.prisma.eopErrorEvent.findFirst({
      where: { fingerprint, organizationId: organizationId ?? undefined },
    });

    if (existing) {
      return this.prisma.eopErrorEvent.update({
        where: { id: existing.id },
        data: {
          count: { increment: 1 },
          lastSeenAt: new Date(),
          stackTrace: data.stackTrace ?? existing.stackTrace,
        },
      });
    }

    const error = await this.prisma.eopErrorEvent.create({
      data: {
        organizationId: organizationId ?? undefined,
        errorKey: `err-${Date.now()}`,
        component: data.component as 'backend',
        serviceName: data.serviceName,
        message: data.message,
        stackTrace: data.stackTrace,
        traceId: data.traceId,
        fingerprint,
        attributes: (data.attributes ?? {}) as object,
      },
    });

    if (organizationId) {
      await this.core.emitUserAction(
        organizationId,
        'ErrorEvent',
        error.id,
        EVENT_TYPES.OBSERVABILITY_ERROR_TRACKED,
        { component: data.component, message: data.message },
      );
    }
    return error;
  }

  list(organizationId: string, limit = 100) {
    return this.prisma.eopErrorEvent.findMany({
      where: { organizationId },
      orderBy: { lastSeenAt: 'desc' },
      take: limit,
    });
  }
}
