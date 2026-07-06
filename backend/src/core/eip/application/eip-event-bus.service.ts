import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { randomUUID } from 'crypto';
import { EipEventKind, EipStatus } from '@agroerp/prisma-eip-client';
import { EventService } from '@/core/events/application/event.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EipPrismaService } from '@/shared/infrastructure/database/eip-prisma.service';
import { generateEipKey, shouldMoveToDlq } from '../domain/eip.engine';
import { EipAuditService } from './eip-audit.service';

@Injectable()
export class EipEventBusService {
  constructor(
    private readonly prisma: EipPrismaService,
    private readonly events: EventService,
    private readonly core: CoreEngineService,
    private readonly audit: EipAuditService,
  ) {}

  listTopics(organizationId: string) {
    return this.prisma.eipEventTopic.findMany({
      where: { organizationId },
      include: { _count: { select: { subscriptions: true, messages: true } } },
      orderBy: { topicKey: 'asc' },
    });
  }

  async createTopic(
    organizationId: string,
    topicKey: string,
    name: string,
    eventKind: EipEventKind,
    persist = true,
  ) {
    const existing = await this.prisma.eipEventTopic.findFirst({ where: { organizationId, topicKey } });
    if (existing) throw new BadRequestException(`Topic ${topicKey} ya existe`);
    return this.prisma.eipEventTopic.create({
      data: { organizationId, topicKey, name, eventKind, persist, status: 'active' },
    });
  }

  async subscribe(
    organizationId: string,
    subscriptionKey: string,
    topicKey: string,
    subscriberRef: string,
    filterExpr?: string,
  ) {
    const topic = await this.prisma.eipEventTopic.findFirst({ where: { organizationId, topicKey } });
    if (!topic) throw new NotFoundException('Topic no encontrado');
    const sub = await this.prisma.eipEventSubscription.create({
      data: { organizationId, subscriptionKey, topicId: topic.id, subscriberRef, filterExpr, status: 'active' },
    });
    await this.audit.log(organizationId, 'EipEventTopic', topicKey, 'event_subscribed', undefined, { subscriberRef });
    return sub;
  }

  async publish(
    organizationId: string,
    topicKey: string,
    eventType: string,
    payload: Record<string, unknown>,
    eventKind: EipEventKind = 'custom',
    userId?: string,
  ) {
    const topic = await this.prisma.eipEventTopic.findFirst({
      where: { organizationId, topicKey, status: 'active' },
      include: { subscriptions: { where: { status: 'active' } } },
    });
    if (!topic) throw new NotFoundException('Topic no encontrado');
    const seq = await this.prisma.eipEventMessage.count({ where: { organizationId } });
    const messageKey = generateEipKey('EVT', seq + 1);
    const message = await this.prisma.eipEventMessage.create({
      data: {
        organizationId,
        topicId: topic.id,
        messageKey,
        eventType,
        eventKind,
        status: 'pending',
        payload: payload as object,
      },
    });
    try {
      await this.events.emit({
        organizationId,
        aggregateType: 'EipEvent',
        aggregateId: message.id,
        eventType: EVENT_TYPES.EIP_EVENT_PUBLISHED,
        payload: { topicKey, eventType, messageKey, ...payload },
        metadata: { userId, correlationId: randomUUID(), source: 'system' },
      });
      await this.prisma.eipEventMessage.update({
        where: { id: message.id },
        data: { status: 'completed', processedAt: new Date() },
      });
      await this.core.emitUserAction(
        organizationId,
        'EipEvent',
        message.id,
        EVENT_TYPES.EIP_EVENT_PUBLISHED,
        { topicKey, eventType, subscribers: topic.subscriptions.length },
      );
      await this.audit.log(organizationId, 'EipEventTopic', topicKey, 'event_published', userId, { messageKey, eventType });
      return { messageKey, subscribers: topic.subscriptions.map((s) => s.subscriberRef) };
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'publish failed';
      await this.prisma.eipEventMessage.update({
        where: { id: message.id },
        data: { status: 'failed', retryCount: 1, errorMessage },
      });
      throw e;
    }
  }

  async retry(organizationId: string, messageKey: string) {
    const message = await this.prisma.eipEventMessage.findFirst({
      where: { organizationId, messageKey },
      include: { topic: true },
    });
    if (!message) throw new NotFoundException('Mensaje no encontrado');
    const retryCount = message.retryCount + 1;
    if (shouldMoveToDlq(retryCount, 5)) {
      const seq = await this.prisma.eipEventDlq.count({ where: { organizationId } });
      await this.prisma.eipEventDlq.create({
        data: {
          organizationId,
          dlqKey: generateEipKey('DLQ', seq + 1),
          messageKey,
          eventType: message.eventType,
          payload: message.payload as object,
          errorMessage: message.errorMessage ?? 'max retries',
          retryCount,
        },
      });
      await this.prisma.eipEventMessage.update({
        where: { id: message.id },
        data: { status: 'dlq', retryCount },
      });
      await this.audit.log(organizationId, 'EipEventMessage', messageKey, 'event_dlq', undefined, { retryCount });
      return { movedToDlq: true };
    }
    await this.prisma.eipEventMessage.update({
      where: { id: message.id },
      data: { status: 'pending', retryCount },
    });
    await this.audit.log(organizationId, 'EipEventMessage', messageKey, 'event_retried', undefined, { retryCount });
    return this.publish(organizationId, message.topic.topicKey, message.eventType, message.payload as Record<string, unknown>, message.eventKind);
  }

  listMessages(organizationId: string, eventType?: string, limit = 100) {
    return this.prisma.eipEventMessage.findMany({
      where: { organizationId, ...(eventType ? { eventType } : {}) },
      include: { topic: { select: { topicKey: true, name: true } } },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
  }

  listDlq(organizationId: string, limit = 100) {
    return this.prisma.eipEventDlq.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  domainEvents(organizationId: string) {
    return this.prisma.eipEventMessage.findMany({
      where: { organizationId, eventKind: 'domain' },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    });
  }

  systemEvents(organizationId: string) {
    return this.prisma.eipEventMessage.findMany({
      where: { organizationId, eventKind: 'system' },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    });
  }
}
