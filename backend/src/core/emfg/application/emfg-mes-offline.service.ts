import { Injectable } from '@nestjs/common';
import { EmfgMesCaptureType } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import { EmfgMesConsumptionService } from './emfg-mes-consumption.service';
import { EmfgMesExecutionService } from './emfg-mes-execution.service';
import { EmfgMesProductionService } from './emfg-mes-production.service';

type OfflineAction = {
  type: 'execute' | 'consume' | 'produce' | 'capture';
  orderKey: string;
  payload: Record<string, unknown>;
};

@Injectable()
export class EmfgMesOfflineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly execution: EmfgMesExecutionService,
    private readonly consumption: EmfgMesConsumptionService,
    private readonly production: EmfgMesProductionService,
  ) {}

  async submitBatch(
    organizationId: string,
    userId: string,
    deviceId: string | undefined,
    actions: OfflineAction[],
  ) {
    const seq = await this.prisma.emfgMesOfflineBatch.count({ where: { organizationId } });
    const batchKey = generateEmfgKey('OFF', seq + 1);

    const batch = await this.prisma.emfgMesOfflineBatch.create({
      data: {
        organizationId,
        batchKey,
        deviceId,
        payload: actions as object[],
        status: 'pending',
        createdBy: userId,
      },
    });

    const results: unknown[] = [];
    try {
      for (const action of actions) {
        const result = await this.applyAction(organizationId, userId, action);
        results.push(result);
      }
      await this.prisma.emfgMesOfflineBatch.update({
        where: { organizationId_batchKey: { organizationId, batchKey } },
        data: { status: 'synced', syncedAt: new Date() },
      });
    } catch (err) {
      await this.prisma.emfgMesOfflineBatch.update({
        where: { organizationId_batchKey: { organizationId, batchKey } },
        data: {
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : 'sync_failed',
        },
      });
      throw err;
    }

    return { batchKey, results };
  }

  async capture(
    organizationId: string,
    userId: string,
    orderKey: string,
    payload: { captureType: EmfgMesCaptureType; value: string; storageUrl?: string },
  ) {
    const seq = await this.prisma.emfgMesCapture.count({ where: { organizationId } });
    const captureKey = generateEmfgKey('CAP', seq + 1);
    return this.prisma.emfgMesCapture.create({
      data: {
        organizationId,
        captureKey,
        orderKey,
        captureType: payload.captureType,
        value: payload.value,
        storageUrl: payload.storageUrl,
        capturedBy: userId,
      },
    });
  }

  private applyAction(organizationId: string, userId: string, action: OfflineAction) {
    switch (action.type) {
      case 'execute':
        return this.execution.execute(
          organizationId,
          userId,
          action.orderKey,
          String(action.payload.action),
          {
            reason: action.payload.reason as string | undefined,
            operatorKey: action.payload.operatorKey as string | undefined,
          },
        );
      case 'consume':
        return this.consumption.consume(organizationId, userId, action.orderKey, action.payload as never);
      case 'produce':
        return this.production.record(organizationId, userId, action.orderKey, action.payload as never);
      case 'capture':
        return this.capture(organizationId, userId, action.orderKey, action.payload as never);
      default:
        return null;
    }
  }
}
