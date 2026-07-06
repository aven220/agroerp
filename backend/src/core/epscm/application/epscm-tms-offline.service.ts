import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEpscmTmsKey } from '../domain/epscm-tms-routing.engine';
import { EpscmTmsIntegrationService } from './epscm-tms-integration.service';
import { EpscmTmsTripService } from './epscm-tms-trip.service';
import { EpscmTmsDeliveryService } from './epscm-tms-delivery.service';
import { EpscmTmsPodService } from './epscm-tms-pod.service';

type OfflineOp = {
  type: 'start_trip' | 'incident' | 'delivery' | 'pod' | 'accept_route';
  payload: Record<string, unknown>;
};

@Injectable()
export class EpscmTmsOfflineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integration: EpscmTmsIntegrationService,
    private readonly trip: EpscmTmsTripService,
    private readonly delivery: EpscmTmsDeliveryService,
    private readonly pod: EpscmTmsPodService,
  ) {}

  async queueBatch(organizationId: string, userId: string, deviceId: string, operations: OfflineOp[]) {
    const seq = await this.prisma.epscmTmsOfflineBatch.count({ where: { organizationId } });
    return this.prisma.epscmTmsOfflineBatch.create({
      data: {
        organizationId,
        batchKey: generateEpscmTmsKey('OFF', seq + 1),
        deviceId,
        createdBy: userId,
        payload: operations as object,
        status: 'pending',
      },
    });
  }

  listBatches(organizationId: string) {
    return this.prisma.epscmTmsOfflineBatch.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async syncBatch(organizationId: string, userId: string, batchKey: string) {
    const batch = await this.prisma.epscmTmsOfflineBatch.findFirst({ where: { organizationId, batchKey } });
    if (!batch) return null;
    const ops = (batch.payload as OfflineOp[]) ?? [];
    try {
      for (const op of ops) await this.applyOp(organizationId, userId, op);
      const updated = await this.prisma.epscmTmsOfflineBatch.update({
        where: { id: batch.id },
        data: { status: 'synced', syncedAt: new Date() },
      });
      await this.integration.onOfflineSynced(organizationId, batchKey);
      return updated;
    } catch (e) {
      await this.prisma.epscmTmsOfflineBatch.update({
        where: { id: batch.id },
        data: { status: 'failed', errorMessage: e instanceof Error ? e.message : 'sync failed' },
      });
      throw e;
    }
  }

  private async applyOp(organizationId: string, userId: string, op: OfflineOp) {
    const p = op.payload;
    switch (op.type) {
      case 'start_trip':
        return this.trip.start(organizationId, userId, String(p.tripKey));
      case 'accept_route':
        return this.trip.acceptRoute(organizationId, userId, String(p.tripKey));
      case 'incident':
        return this.trip.recordIncident(organizationId, userId, String(p.tripKey), String(p.incidentType), String(p.description));
      case 'delivery':
        return this.delivery.complete(organizationId, userId, String(p.deliveryKey), Number(p.deliveredQty), p.notes ? String(p.notes) : undefined);
      case 'pod':
        return this.pod.capture(organizationId, userId, String(p.deliveryKey), {
          signedBy: p.signedBy ? String(p.signedBy) : undefined,
          signatureUrl: p.signatureUrl ? String(p.signatureUrl) : undefined,
          photoUrl: p.photoUrl ? String(p.photoUrl) : undefined,
          latitude: p.latitude ? Number(p.latitude) : undefined,
          longitude: p.longitude ? Number(p.longitude) : undefined,
          observations: p.observations ? String(p.observations) : undefined,
        });
      default:
        return null;
    }
  }

  mobileSync(organizationId: string) {
    return Promise.all([
      this.trip.list(organizationId, 'assigned'),
      this.trip.list(organizationId, 'in_progress'),
      this.delivery.list(organizationId, undefined, 'pending'),
      this.listBatches(organizationId),
    ]).then(([assigned, inProgress, deliveries, offlineBatches]) => ({
      assignedTrips: assigned,
      activeTrips: inProgress,
      pendingDeliveries: deliveries,
      offlineBatches,
    }));
  }
}
