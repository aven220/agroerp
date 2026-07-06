import { Injectable, NotFoundException } from '@nestjs/common';
import { EpscmTmsDeliveryStatus, EpscmTmsDeliveryType } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEpscmTmsKey } from '../domain/epscm-tms-routing.engine';
import { EpscmAuditService } from './epscm-audit.service';
import { EpscmTmsIntegrationService } from './epscm-tms-integration.service';

@Injectable()
export class EpscmTmsDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EpscmAuditService,
    private readonly integration: EpscmTmsIntegrationService,
  ) {}

  list(organizationId: string, tripKey?: string, status?: EpscmTmsDeliveryStatus) {
    return this.prisma.epscmTmsDelivery.findMany({
      where: {
        organizationId,
        ...(tripKey ? { tripKey } : {}),
        ...(status ? { status } : {}),
      },
      include: { attempts: true, pods: true },
      orderBy: { deliveryKey: 'asc' },
    });
  }

  async get(organizationId: string, deliveryKey: string) {
    const d = await this.prisma.epscmTmsDelivery.findFirst({
      where: { organizationId, deliveryKey },
      include: { attempts: true, pods: true },
    });
    if (!d) throw new NotFoundException('Delivery not found');
    return d;
  }

  async createForOrder(
    organizationId: string,
    userId: string,
    tripKey: string,
    orderKey: string,
    customerKey?: string | null,
    deliveryType: EpscmTmsDeliveryType = 'delivery',
  ) {
    const lines = await this.prisma.escmSalesOrderLine.findMany({
      where: { order: { organizationId, orderKey } },
    });
    const requestedQty = lines.reduce((s, l) => s + Number(l.quantity), 0);
    const seq = await this.prisma.epscmTmsDelivery.count({ where: { organizationId } });
    const delivery = await this.prisma.epscmTmsDelivery.create({
      data: {
        organizationId,
        deliveryKey: generateEpscmTmsKey('DLV', seq + 1),
        tripKey,
        orderKey,
        customerKey: customerKey ?? undefined,
        deliveryType,
        requestedQty,
      },
    });
    await this.audit.log(organizationId, 'EpscmTmsDelivery', delivery.deliveryKey, 'created', userId);
    return delivery;
  }

  async complete(
    organizationId: string,
    userId: string,
    deliveryKey: string,
    deliveredQty: number,
    issueNotes?: string,
  ) {
    const delivery = await this.get(organizationId, deliveryKey);
    const status: EpscmTmsDeliveryStatus =
      deliveredQty >= delivery.requestedQty ? 'completed' : deliveredQty > 0 ? 'partial' : 'failed';
    const updated = await this.prisma.epscmTmsDelivery.update({
      where: { id: delivery.id },
      data: {
        deliveredQty,
        status,
        issueNotes,
        completedAt: status === 'completed' || status === 'partial' ? new Date() : null,
        attemptCount: { increment: 1 },
      },
    });
    await this.recordAttempt(organizationId, deliveryKey, status, issueNotes);
    if (status === 'completed' || status === 'partial') {
      await this.integration.onDeliveryCompleted(organizationId, deliveryKey, delivery.orderKey);
      await this.audit.log(organizationId, 'EpscmTmsDelivery', deliveryKey, 'tms_delivery_completed', userId);
    } else {
      await this.audit.log(organizationId, 'EpscmTmsDelivery', deliveryKey, 'tms_delivery_failed', userId);
    }
    return updated;
  }

  async reject(organizationId: string, userId: string, deliveryKey: string, rejectionReason: string) {
    const delivery = await this.get(organizationId, deliveryKey);
    const updated = await this.prisma.epscmTmsDelivery.update({
      where: { id: delivery.id },
      data: { status: 'failed', rejectionReason, attemptCount: { increment: 1 } },
    });
    await this.recordAttempt(organizationId, deliveryKey, 'failed', rejectionReason);
    await this.audit.log(organizationId, 'EpscmTmsDelivery', deliveryKey, 'tms_delivery_failed', userId, { rejectionReason });
    return updated;
  }

  async scheduleRetry(organizationId: string, userId: string, deliveryKey: string, notes?: string) {
    const delivery = await this.get(organizationId, deliveryKey);
    const updated = await this.prisma.epscmTmsDelivery.update({
      where: { id: delivery.id },
      data: { status: 'retry_scheduled', issueNotes: notes },
    });
    await this.recordAttempt(organizationId, deliveryKey, 'retry_scheduled', notes);
    return updated;
  }

  async recordReturn(organizationId: string, userId: string, deliveryKey: string, notes?: string) {
    const delivery = await this.get(organizationId, deliveryKey);
    const updated = await this.prisma.epscmTmsDelivery.update({
      where: { id: delivery.id },
      data: { status: 'returned', deliveryType: 'return_order', issueNotes: notes },
    });
    await this.audit.log(organizationId, 'EpscmTmsDelivery', deliveryKey, 'updated', userId, { returned: true });
    return updated;
  }

  private async recordAttempt(organizationId: string, deliveryKey: string, status: EpscmTmsDeliveryStatus, notes?: string) {
    const delivery = await this.get(organizationId, deliveryKey);
    const seq = await this.prisma.epscmTmsDeliveryAttempt.count({ where: { organizationId } });
    return this.prisma.epscmTmsDeliveryAttempt.create({
      data: {
        organizationId,
        attemptKey: generateEpscmTmsKey('ATT', seq + 1),
        deliveryKey,
        attemptNumber: delivery.attemptCount + 1,
        status,
        notes,
      },
    });
  }

  async confirmByBarcode(organizationId: string, userId: string, barcode: string, deliveredQty: number) {
    const delivery = await this.prisma.epscmTmsDelivery.findFirst({
      where: {
        organizationId,
        status: { in: ['pending', 'retry_scheduled', 'partial'] },
        OR: [{ deliveryKey: barcode }, { orderKey: barcode }],
      },
    });
    if (!delivery) throw new NotFoundException('Delivery not found for barcode');
    return this.complete(organizationId, userId, delivery.deliveryKey, deliveredQty);
  }
}
