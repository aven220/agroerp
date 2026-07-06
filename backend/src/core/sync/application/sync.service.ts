import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { DomainEvent } from '@/shared/domain/events/domain-event';

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  async enqueueFromEvent(event: DomainEvent, operation: string) {
    if (!event.id) return;

    const resourceId =
      event.aggregateType === 'Resource' ? event.aggregateId : undefined;

    return this.prisma.syncQueue.create({
      data: {
        organizationId: event.organizationId,
        resourceId,
        eventId: event.id,
        operation,
        payload: {
          eventType: event.eventType,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          payload: event.payload,
        } as object,
        status: 'pending',
      },
    });
  }

  async getPending(organizationId: string, limit = 100) {
    return this.prisma.syncQueue.findMany({
      where: { organizationId, status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async getStatus(organizationId: string) {
    const [pending, processed, failed, lastEvent] = await Promise.all([
      this.prisma.syncQueue.count({
        where: { organizationId, status: 'pending' },
      }),
      this.prisma.syncQueue.count({
        where: { organizationId, status: 'processed' },
      }),
      this.prisma.syncQueue.count({
        where: { organizationId, status: 'failed' },
      }),
      this.prisma.event.findFirst({
        where: { organizationId },
        orderBy: { globalSequence: 'desc' },
        select: { globalSequence: true, occurredAt: true },
      }),
    ]);

    return {
      pending,
      processed,
      failed,
      lastGlobalSequence: lastEvent?.globalSequence?.toString() ?? '0',
      lastEventAt: lastEvent?.occurredAt ?? null,
    };
  }

  async pull(organizationId: string, cursor: bigint, limit = 500) {
    const events = await this.prisma.event.findMany({
      where: {
        organizationId,
        globalSequence: { gt: cursor },
      },
      orderBy: { globalSequence: 'asc' },
      take: limit,
    });

    const nextCursor =
      events.length > 0
        ? events[events.length - 1].globalSequence
        : cursor;

    return {
      events: events.map((e) => ({
        ...e,
        globalSequence: e.globalSequence.toString(),
        version: e.version.toString(),
      })),
      nextCursor: nextCursor.toString(),
      hasMore: events.length === limit,
    };
  }

  async markResourcePending(resourceId: string) {
    return this.prisma.resource.update({
      where: { id: resourceId },
      data: { syncStatus: 'pending' },
    });
  }

  async markProducerPending(producerId: string) {
    return this.prisma.producer.update({
      where: { id: producerId },
      data: { syncStatus: 'pending' },
    });
  }

  async markFarmPending(farmUnitId: string) {
    return this.prisma.farmUnit.update({
      where: { id: farmUnitId },
      data: { syncStatus: 'pending' },
    });
  }

  async markFieldLotPending(fieldLotId: string) {
    return this.prisma.fieldLotProfile.update({
      where: { id: fieldLotId },
      data: { syncStatus: 'pending' },
    });
  }
}
