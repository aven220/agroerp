import { Injectable } from '@nestjs/common';
import { EmfgResourceCaptureType } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import { EmfgResourcesEquipmentService } from './emfg-resources-equipment.service';
import { EmfgResourcesMaintenanceService } from './emfg-resources-maintenance.service';

type OfflineAction = {
  type: 'availability' | 'maintenance' | 'downtime' | 'capture' | 'note';
  equipmentKey?: string;
  payload: Record<string, unknown>;
};

@Injectable()
export class EmfgResourcesOfflineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly equipment: EmfgResourcesEquipmentService,
    private readonly maintenance: EmfgResourcesMaintenanceService,
  ) {}

  async capture(organizationId: string, userId: string, payload: {
    equipmentKey?: string; captureType: EmfgResourceCaptureType; value: string; storageUrl?: string;
  }) {
    const seq = await this.prisma.emfgResourceCapture.count({ where: { organizationId } });
    const captureKey = generateEmfgKey('RCAP', seq + 1);
    return this.prisma.emfgResourceCapture.create({
      data: { organizationId, captureKey, ...payload, capturedBy: userId },
    });
  }

  async submitBatch(organizationId: string, userId: string, deviceId: string | undefined, actions: OfflineAction[]) {
    const seq = await this.prisma.emfgResourceOfflineBatch.count({ where: { organizationId } });
    const batchKey = generateEmfgKey('ROFF', seq + 1);

    await this.prisma.emfgResourceOfflineBatch.create({
      data: { organizationId, batchKey, deviceId, payload: actions as object[], status: 'pending', createdBy: userId },
    });

    const results: unknown[] = [];
    try {
      for (const action of actions) {
        results.push(await this.apply(organizationId, userId, action));
      }
      await this.prisma.emfgResourceOfflineBatch.update({
        where: { organizationId_batchKey: { organizationId, batchKey } },
        data: { status: 'synced', syncedAt: new Date() },
      });
    } catch (err) {
      await this.prisma.emfgResourceOfflineBatch.update({
        where: { organizationId_batchKey: { organizationId, batchKey } },
        data: { status: 'failed', errorMessage: err instanceof Error ? err.message : 'sync_failed' },
      });
      throw err;
    }
    return { batchKey, results };
  }

  private apply(organizationId: string, userId: string, action: OfflineAction) {
    switch (action.type) {
      case 'availability':
        return this.equipment.setAvailability(
          organizationId, userId, action.equipmentKey!,
          action.payload.status as never, action.payload.reason as string | undefined,
        );
      case 'maintenance':
        return this.maintenance.recordMaintenance(organizationId, userId, { equipmentKey: action.equipmentKey!, ...action.payload } as never);
      case 'downtime':
        return this.maintenance.recordDowntime(organizationId, userId, action.payload as never);
      case 'capture':
      case 'note':
        return this.capture(organizationId, userId, action.payload as never);
      default:
        return null;
    }
  }
}
