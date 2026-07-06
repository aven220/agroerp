import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEpscmWmsKey } from '../domain/epscm-wms.engine';
import { EpscmWmsIntegrationService } from './epscm-wms-integration.service';
import { EpscmWmsPickingService } from './epscm-wms-picking.service';
import { EpscmWmsPackingService } from './epscm-wms-packing.service';
import { EpscmWmsReceivingService } from './epscm-wms-receiving.service';
import { EpscmWmsDispatchService } from './epscm-wms-dispatch.service';
import { EpscmWmsTransferService } from './epscm-wms-transfer.service';

type OfflineOp = {
  type: 'pick' | 'pack' | 'receive' | 'dispatch' | 'transfer';
  payload: Record<string, unknown>;
};

@Injectable()
export class EpscmWmsOfflineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integration: EpscmWmsIntegrationService,
    private readonly picking: EpscmWmsPickingService,
    private readonly packing: EpscmWmsPackingService,
    private readonly receiving: EpscmWmsReceivingService,
    private readonly dispatch: EpscmWmsDispatchService,
    private readonly transfer: EpscmWmsTransferService,
  ) {}

  async queueBatch(organizationId: string, userId: string, deviceId: string, operations: OfflineOp[]) {
    const seq = await this.prisma.epscmWmsOfflineBatch.count({ where: { organizationId } });
    return this.prisma.epscmWmsOfflineBatch.create({
      data: {
        organizationId,
        batchKey: generateEpscmWmsKey('OFF', seq + 1),
        deviceId,
        createdBy: userId,
        payload: operations as object,
        status: 'pending',
      },
    });
  }

  listBatches(organizationId: string) {
    return this.prisma.epscmWmsOfflineBatch.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async syncBatch(organizationId: string, userId: string, batchKey: string) {
    const batch = await this.prisma.epscmWmsOfflineBatch.findFirst({ where: { organizationId, batchKey } });
    if (!batch) return null;
    const ops = (batch.payload as OfflineOp[]) ?? [];
    try {
      for (const op of ops) {
        await this.applyOp(organizationId, userId, op);
      }
      const updated = await this.prisma.epscmWmsOfflineBatch.update({
        where: { id: batch.id },
        data: { status: 'synced', syncedAt: new Date() },
      });
      await this.integration.onOfflineSynced(organizationId, batchKey);
      return updated;
    } catch (e) {
      await this.prisma.epscmWmsOfflineBatch.update({
        where: { id: batch.id },
        data: { status: 'failed', errorMessage: e instanceof Error ? e.message : 'sync failed' },
      });
      throw e;
    }
  }

  private async applyOp(organizationId: string, userId: string, op: OfflineOp) {
    const p = op.payload;
    switch (op.type) {
      case 'pick':
        return this.picking.confirmPick(organizationId, userId, String(p.taskKey), Number(p.pickedQty), String(p.pickerKey ?? userId));
      case 'pack':
        return this.packing.complete(organizationId, userId, String(p.packKey));
      case 'receive':
        return this.receiving.receiveLine(
          organizationId, userId, String(p.receiptKey), String(p.lineKey), Number(p.receivedQty), p.locationKey ? String(p.locationKey) : undefined,
        );
      case 'dispatch':
        return this.dispatch.confirmExit(organizationId, userId, String(p.dispatchKey));
      case 'transfer':
        return this.transfer.complete(organizationId, userId, String(p.transferKey));
      default:
        return null;
    }
  }

  async capturePhoto(
    organizationId: string,
    userId: string,
    refType: string,
    refKey: string,
    storageUrl: string,
    captureType = 'photo',
  ) {
    const seq = await this.prisma.epscmWmsCapture.count({ where: { organizationId } });
    return this.prisma.epscmWmsCapture.create({
      data: {
        organizationId,
        captureKey: generateEpscmWmsKey('CAP', seq + 1),
        refType,
        refKey,
        captureType,
        value: storageUrl,
        storageUrl,
        capturedBy: userId,
      },
    });
  }

  listCaptures(organizationId: string, refType?: string, refKey?: string) {
    return this.prisma.epscmWmsCapture.findMany({
      where: {
        organizationId,
        ...(refType ? { refType } : {}),
        ...(refKey ? { refKey } : {}),
      },
      orderBy: { capturedAt: 'desc' },
      take: 100,
    });
  }

  mobileSync(organizationId: string) {
    return Promise.all([
      this.picking.listTasks(organizationId, 'in_progress'),
      this.packing.panel(organizationId),
      this.receiving.list(organizationId, 'receiving'),
      this.dispatch.list(organizationId, 'preparing'),
      this.transfer.list(organizationId, 'approved'),
      this.listBatches(organizationId),
    ]).then(([picks, packs, receipts, dispatches, transfers, offlineBatches]) => ({
      picks, packs, receipts, dispatches, transfers, offlineBatches,
    }));
  }
}
