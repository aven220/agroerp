import { Injectable } from '@nestjs/common';
import {
  NotificationChannelConfig,
  NotificationRuleDefinition,
  WorkflowRuleGroup,
} from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EneacRuleEngine } from './eneac-rule.engine';
import { EneacRecipientResolver } from './eneac-recipient.resolver';
import { EneacDispatcherService } from './eneac-dispatcher.service';
import { DomainEvent } from '@/shared/domain/events/domain-event';
import { createHash } from 'crypto';

@Injectable()
export class EneacNotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly rules: EneacRuleEngine,
    private readonly recipients: EneacRecipientResolver,
    private readonly dispatcher: EneacDispatcherService,
  ) {}

  async processDomainEvent(event: DomainEvent) {
    const activeRules = await this.prisma.notificationRule.findMany({
      where: {
        organizationId: event.organizationId,
        status: 'active',
        deletedAt: null,
        OR: [
          { eventTypes: { has: event.eventType } },
          { eventTypes: { isEmpty: true } },
          { eventTypes: { has: '*' } },
        ],
      },
      orderBy: { priority: 'asc' },
    });

    const results = [];
    for (const rule of activeRules) {
      if (rule.eventTypes.length > 0 && !rule.eventTypes.includes('*') && !rule.eventTypes.includes(event.eventType)) {
        continue;
      }

      const conditions = rule.conditions as unknown as WorkflowRuleGroup;
      if (!this.rules.evaluate(conditions, {
        variables: event.payload as Record<string, unknown>,
        userId: event.metadata?.userId,
        eventType: event.eventType,
      })) continue;

      const suppressed = await this.checkSuppression(
        event.organizationId,
        rule,
        event,
      );
      if (suppressed) continue;

      const channels = rule.channels as unknown as NotificationChannelConfig[];
      const recipientDefs = rule.recipients as unknown as NotificationRuleDefinition['recipients'];
      const userIds = await this.recipients.resolve(recipientDefs, {
        organizationId: event.organizationId,
        payload: event.payload as Record<string, unknown>,
        userId: event.metadata?.userId,
      });

      const targets = userIds.length ? userIds : [null];
      for (const recipientId of targets) {
        const title = this.buildTitle(event, rule.name);
        const body = this.buildBody(event);
        const groupKey = rule.groupingKey ?? `${event.eventType}:${event.aggregateId}`;

        const expiresAt = rule.expiresInHours
          ? new Date(Date.now() + rule.expiresInHours * 3600000)
          : undefined;

        const message = await this.prisma.notificationMessage.create({
          data: {
            organizationId: event.organizationId,
            recipientId: recipientId ?? undefined,
            ruleId: rule.id,
            sourceEventId: event.id,
            sourceEventType: event.eventType,
            alertSeverity: rule.alertSeverity,
            channel: channels[0]?.channel ?? 'internal',
            title,
            body,
            payload: event.payload as object,
            groupKey,
            expiresAt,
          },
        });

        await this.dispatcher.dispatchMessage(message.id, channels);

        await this.core.emitNotificationRuleTriggered(
          event.organizationId,
          message.id,
          {
            ruleId: rule.id,
            ruleKey: rule.ruleKey,
            eventType: event.eventType,
            messageId: message.id,
            recipientId,
          },
        );

        results.push(message.id);
      }
    }
    return results;
  }

  async sendDirect(
    organizationId: string,
    data: {
      recipientId?: string;
      title: string;
      body?: string;
      alertSeverity?: string;
      channels?: NotificationChannelConfig[];
      payload?: Record<string, unknown>;
    },
  ) {
    const channels = data.channels ?? [{ channel: 'internal' as const }];
    const message = await this.prisma.notificationMessage.create({
      data: {
        organizationId,
        recipientId: data.recipientId,
        alertSeverity: (data.alertSeverity as 'info') ?? 'info',
        channel: channels[0].channel,
        title: data.title,
        body: data.body,
        payload: (data.payload ?? {}) as object,
      },
    });
    await this.dispatcher.dispatchMessage(message.id, channels);
    return message;
  }

  private async checkSuppression(
    organizationId: string,
    rule: { suppression: unknown; ruleKey: string },
    event: DomainEvent,
  ) {
    const suppression = rule.suppression as { windowSeconds?: number; keyTemplate?: string };
    if (!suppression?.windowSeconds) return false;

    const keySource = suppression.keyTemplate
      ? `${rule.ruleKey}:${event.eventType}:${event.aggregateId}`
      : `${rule.ruleKey}:${event.eventType}`;
    const suppressionKey = createHash('sha256').update(keySource).digest('hex').slice(0, 64);

    const existing = await this.prisma.notificationSuppression.findFirst({
      where: {
        organizationId,
        suppressionKey,
        expiresAt: { gt: new Date() },
      },
    });

    if (existing) {
      await this.prisma.notificationSuppression.update({
        where: { id: existing.id },
        data: { hitCount: existing.hitCount + 1 },
      });
      return true;
    }

    await this.prisma.notificationSuppression.create({
      data: {
        organizationId,
        suppressionKey,
        expiresAt: new Date(Date.now() + suppression.windowSeconds * 1000),
      },
    });
    return false;
  }

  private buildTitle(event: DomainEvent, ruleName: string) {
    return `[${event.eventType}] ${ruleName}`;
  }

  private buildBody(event: DomainEvent) {
    const payload = event.payload as Record<string, unknown>;
    if (typeof payload.message === 'string') return payload.message;
    if (typeof payload.reason === 'string') return payload.reason;
    return `Evento ${event.eventType} en ${event.aggregateType}`;
  }
}
