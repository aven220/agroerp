import { Injectable, OnModuleInit } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { EVENT_BUS_PORT, EventBusPort } from '@/shared/domain/events/event-bus.port';
import { DomainEvent } from '@/shared/domain/events/domain-event';
import { AiServicesFacade } from './ai-services.facade';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class AiAutomationService implements OnModuleInit {
  constructor(
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
    private readonly prisma: PrismaService,
    private readonly ai: AiServicesFacade,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('*', async (event) => this.handleDomainEvent(event));
  }

  private async handleDomainEvent(event: DomainEvent) {
    try {
      await this.handleEvent(event.organizationId, event.eventType, event.payload as Record<string, unknown>);
    } catch {
      /* non-blocking */
    }
  }

  async findAll(organizationId: string) {
    return this.prisma.aiAutomationRule.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(
    organizationId: string,
    userId: string,
    data: {
      ruleKey: string;
      name: string;
      description?: string;
      triggerType: string;
      eventTypes?: string[];
      serviceType: string;
      promptKey?: string;
      actions?: unknown[];
    },
  ) {
    return this.prisma.aiAutomationRule.create({
      data: {
        organizationId,
        ruleKey: data.ruleKey,
        name: data.name,
        description: data.description,
        triggerType: data.triggerType,
        eventTypes: data.eventTypes ?? [],
        serviceType: data.serviceType as 'explanation',
        promptKey: data.promptKey,
        actions: (data.actions ?? []) as object[],
        createdBy: userId,
      },
    });
  }

  private async handleEvent(organizationId: string, eventType: string, payload: Record<string, unknown>) {
    const rules = await this.prisma.aiAutomationRule.findMany({
      where: { organizationId, isActive: true, eventTypes: { has: eventType } },
    });
    for (const rule of rules) {
      const result = await this.ai.invoke(
        organizationId,
        'system',
        rule.serviceType as 'explanation',
        `Evento ${eventType}: ${JSON.stringify(payload).slice(0, 2000)}`,
        { moduleContext: 'automation' },
      );
      const actions = (rule.actions as Array<Record<string, unknown>>) ?? [];
      for (const action of actions) {
        if (action.type === 'alert') {
          await this.prisma.notificationMessage.create({
            data: {
              organizationId,
              title: String(action.title ?? `IA: ${rule.name}`),
              body: result.content.slice(0, 1000),
              alertSeverity: (String(action.severity ?? 'info')) as 'info',
              channel: 'internal',
              status: 'unread',
              sourceEventType: eventType,
              payload: { automationRule: rule.ruleKey, explainability: result.explainability } as object,
            },
          }).catch(() => undefined);
        }
      }
    }
  }
}
