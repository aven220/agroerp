import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import { EmfgQmsInspectionService } from './emfg-qms-inspection.service';

type OfflineAction = {
  type: 'inspection' | 'measurement' | 'evidence' | 'complete';
  inspectionKey?: string;
  payload: Record<string, unknown>;
};

@Injectable()
export class EmfgQmsOfflineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inspection: EmfgQmsInspectionService,
  ) {}

  async submitBatch(organizationId: string, userId: string, deviceId: string | undefined, actions: OfflineAction[]) {
    const seq = await this.prisma.emfgQmsOfflineBatch.count({ where: { organizationId } });
    const batchKey = generateEmfgKey('QOFF', seq + 1);

    await this.prisma.emfgQmsOfflineBatch.create({
      data: { organizationId, batchKey, deviceId, payload: actions as object[], status: 'pending', createdBy: userId },
    });

    const results: unknown[] = [];
    try {
      for (const action of actions) {
        results.push(await this.apply(organizationId, userId, action));
      }
      await this.prisma.emfgQmsOfflineBatch.update({
        where: { organizationId_batchKey: { organizationId, batchKey } },
        data: { status: 'synced', syncedAt: new Date() },
      });
    } catch (err) {
      await this.prisma.emfgQmsOfflineBatch.update({
        where: { organizationId_batchKey: { organizationId, batchKey } },
        data: { status: 'failed', errorMessage: err instanceof Error ? err.message : 'sync_failed' },
      });
      throw err;
    }

    return { batchKey, results };
  }

  private apply(organizationId: string, userId: string, action: OfflineAction) {
    switch (action.type) {
      case 'inspection':
        return this.inspection.create(organizationId, userId, action.payload as never);
      case 'measurement':
        return this.inspection.addMeasurement(organizationId, userId, action.inspectionKey!, action.payload as never);
      case 'evidence':
        return this.inspection.addEvidence(organizationId, userId, action.inspectionKey!, action.payload as never);
      case 'complete':
        return this.inspection.complete(organizationId, userId, action.inspectionKey!);
      default:
        return null;
    }
  }
}
