import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';

@Injectable()
export class IntegrationErrorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
  ) {}

  findAll(organizationId: string, status?: string, limit = 100) {
    return this.prisma.eihSyncError.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as 'pending' } : {}),
      },
      include: { syncRun: true, connector: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async record(
    organizationId: string,
    syncRunId: string,
    data: { errorKey: string; message: string; payload?: Record<string, unknown>; connectorId?: string },
  ) {
    const error = await this.prisma.eihSyncError.create({
      data: {
        organizationId,
        syncRunId,
        connectorId: data.connectorId,
        errorKey: data.errorKey,
        message: data.message,
        payload: (data.payload ?? {}) as object,
        nextRetryAt: new Date(Date.now() + 60_000),
      },
    });
    await this.core.emitUserAction(
      organizationId,
      'SyncError',
      error.id,
      EVENT_TYPES.INTEGRATION_ERROR_RAISED,
      { errorKey: data.errorKey, message: data.message },
    );
    return error;
  }

  async retry(organizationId: string, errorId: string) {
    const err = await this.prisma.eihSyncError.findFirst({
      where: { id: errorId, organizationId },
    });
    if (!err) throw new Error('Error no encontrado');
    if (err.retryCount >= err.maxRetries) {
      return this.prisma.eihSyncError.update({
        where: { id: errorId },
        data: { status: 'dead_letter' },
      });
    }
    return this.prisma.eihSyncError.update({
      where: { id: errorId },
      data: {
        status: 'retrying',
        retryCount: { increment: 1 },
        nextRetryAt: new Date(Date.now() + 120_000 * (err.retryCount + 1)),
      },
    });
  }

  async resolve(organizationId: string, errorId: string, userId: string) {
    return this.prisma.eihSyncError.update({
      where: { id: errorId },
      data: { status: 'resolved', resolvedAt: new Date(), resolvedBy: userId },
    });
  }

  async reprocess(organizationId: string, errorId: string) {
    const err = await this.prisma.eihSyncError.findFirst({
      where: { id: errorId, organizationId },
    });
    if (!err) throw new Error('Error no encontrado');
    await this.retry(organizationId, errorId);
    return { reprocessed: true, payload: err.payload };
  }
}
