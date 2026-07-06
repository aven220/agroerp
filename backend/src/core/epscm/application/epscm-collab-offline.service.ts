import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEpscmCollabKey } from '../domain/epscm-collab-analytics.engine';
import { EpscmCollabCollaborationService } from './epscm-collab-collaboration.service';
import { EpscmCollabSupplierPortalService } from './epscm-collab-supplier-portal.service';
import { EpscmCollabOperatorPortalService } from './epscm-collab-operator-portal.service';
import { EpscmCollabIntegrationService } from './epscm-collab-integration.service';

type OfflineOp = {
  type: 'comment' | 'task_complete' | 'order_confirm' | 'status_update' | 'evidence';
  payload: Record<string, unknown>;
};

@Injectable()
export class EpscmCollabOfflineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integration: EpscmCollabIntegrationService,
    private readonly collaboration: EpscmCollabCollaborationService,
    private readonly supplier: EpscmCollabSupplierPortalService,
    private readonly operator: EpscmCollabOperatorPortalService,
  ) {}

  async queueBatch(organizationId: string, userId: string, deviceId: string, operations: OfflineOp[]) {
    const seq = await this.prisma.epscmCollabOfflineBatch.count({ where: { organizationId } });
    return this.prisma.epscmCollabOfflineBatch.create({
      data: {
        organizationId,
        batchKey: generateEpscmCollabKey('OFF', seq + 1),
        deviceId,
        createdBy: userId,
        payload: operations as object,
        status: 'pending',
      },
    });
  }

  async syncBatch(organizationId: string, userId: string, batchKey: string) {
    const batch = await this.prisma.epscmCollabOfflineBatch.findFirst({ where: { organizationId, batchKey } });
    if (!batch) return null;
    const ops = (batch.payload as OfflineOp[]) ?? [];
    try {
      for (const op of ops) await this.applyOp(organizationId, userId, op);
      const updated = await this.prisma.epscmCollabOfflineBatch.update({
        where: { id: batch.id },
        data: { status: 'synced', syncedAt: new Date() },
      });
      await this.integration.onOfflineSynced(organizationId, batchKey);
      return updated;
    } catch (e) {
      await this.prisma.epscmCollabOfflineBatch.update({
        where: { id: batch.id },
        data: { status: 'failed', errorMessage: e instanceof Error ? e.message : 'sync failed' },
      });
      throw e;
    }
  }

  private async applyOp(organizationId: string, userId: string, op: OfflineOp) {
    const p = op.payload;
    switch (op.type) {
      case 'comment':
        return this.collaboration.addComment(organizationId, userId, String(p.refType), String(p.refKey), String(p.body));
      case 'task_complete':
        return this.collaboration.completeTask(organizationId, userId, String(p.taskKey));
      case 'order_confirm':
        return this.supplier.confirmOrder(organizationId, userId, String(p.linkKey), Number(p.confirmedQty), p.notes ? String(p.notes) : undefined);
      case 'status_update':
        return this.operator.updateStatus(organizationId, userId, String(p.assignmentKey), String(p.status), p.notes ? String(p.notes) : undefined);
      case 'evidence':
        return this.operator.attachEvidence(organizationId, userId, String(p.assignmentKey), String(p.evidenceType), String(p.storageUrl));
      default:
        return null;
    }
  }

  mobileSync(organizationId: string, partnerKey?: string) {
    return Promise.all([
      this.collaboration.listTasks(organizationId, 'open'),
      partnerKey ? this.supplier.portal(organizationId, partnerKey) : Promise.resolve(null),
      partnerKey ? this.operator.portal(organizationId, partnerKey) : Promise.resolve(null),
    ]).then(([tasks, supplierPortal, operatorPortal]) => ({ tasks, supplierPortal, operatorPortal }));
  }
}
