import { Injectable } from '@nestjs/common';
import { EamIotProtocol, EamIotSlotStatus } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEamReliabilityKey } from '../domain/eam-reliability.engine';
import { EamAuditService } from './eam-audit.service';
import { EamReliabilityIntegrationService } from './eam-reliability-integration.service';

@Injectable()
export class EamIotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EamAuditService,
    private readonly integration: EamReliabilityIntegrationService,
  ) {}

  listSlots(organizationId: string) {
    return this.prisma.eamIotIntegrationSlot.findMany({ where: { organizationId } });
  }

  async registerSlot(
    organizationId: string,
    userId: string,
    name: string,
    protocol: EamIotProtocol,
    endpointConfig: Record<string, unknown> = {},
  ) {
    const seq = await this.prisma.eamIotIntegrationSlot.count({ where: { organizationId } });
    const slot = await this.prisma.eamIotIntegrationSlot.create({
      data: {
        organizationId,
        slotKey: generateEamReliabilityKey('IOT', seq + 1),
        name,
        protocol,
        status: 'pending_integration',
        endpointConfig: endpointConfig as object,
      },
    });
    await this.audit.log(organizationId, 'EamIotIntegrationSlot', slot.slotKey, 'created', userId, { protocol });
    return slot;
  }

  async bootstrapSlots(organizationId: string, userId: string) {
    const protocols: EamIotProtocol[] = ['mqtt', 'opc_ua', 'modbus', 'rest', 'websocket', 'scada', 'plc', 'gateway'];
    for (const protocol of protocols) {
      const exists = await this.prisma.eamIotIntegrationSlot.findFirst({ where: { organizationId, protocol } });
      if (!exists) {
        await this.registerSlot(organizationId, userId, `Slot ${protocol.toUpperCase()}`, protocol, { ready: true });
      }
    }
    return this.listSlots(organizationId);
  }

  async updateSlotStatus(organizationId: string, userId: string, slotKey: string, status: EamIotSlotStatus) {
    const slot = await this.prisma.eamIotIntegrationSlot.update({
      where: { organizationId_slotKey: { organizationId, slotKey } },
      data: { status },
    });
    await this.audit.log(organizationId, 'EamIotIntegrationSlot', slotKey, 'updated', userId, { status });
    return slot;
  }

  listEvents(organizationId: string, status?: string) {
    return this.prisma.eamIotEventQueue.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      orderBy: { receivedAt: 'desc' },
      take: 100,
    });
  }

  async enqueueEvent(
    organizationId: string,
    userId: string,
    slotKey: string,
    payload: Record<string, unknown>,
    assetKey?: string,
  ) {
    const seq = await this.prisma.eamIotEventQueue.count({ where: { organizationId } });
    const event = await this.prisma.eamIotEventQueue.create({
      data: {
        organizationId,
        eventKey: generateEamReliabilityKey('EVT', seq + 1),
        slotKey,
        assetKey,
        payload: payload as object,
        status: 'queued',
      },
    });
    await this.audit.log(organizationId, 'EamIotEventQueue', event.eventKey, 'iot_event_queued', userId, { slotKey });
    await this.integration.onIotEventQueued(organizationId, event.eventKey, slotKey);
    return event;
  }

  async processEvent(organizationId: string, userId: string, eventKey: string) {
    const event = await this.prisma.eamIotEventQueue.update({
      where: { organizationId_eventKey: { organizationId, eventKey } },
      data: { status: 'processed', processedAt: new Date() },
    });
    await this.audit.log(organizationId, 'EamIotEventQueue', eventKey, 'updated', userId, { status: 'processed' });
    return event;
  }

  panel(organizationId: string) {
    return Promise.all([
      this.listSlots(organizationId),
      this.listEvents(organizationId, 'queued'),
      this.prisma.eamIotEventQueue.count({ where: { organizationId, status: 'processed' } }),
    ]).then(([slots, queued, processedCount]) => ({
      slots,
      queuedEvents: queued,
      processedCount,
      activeSlots: slots.filter((s) => s.status === 'active').length,
    }));
  }
}
