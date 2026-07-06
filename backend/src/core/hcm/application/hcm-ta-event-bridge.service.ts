import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { EVENT_BUS_PORT, EventBusPort } from '@/shared/domain/events/event-bus.port';
import { DomainEvent } from '@/shared/domain/events/domain-event';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

const HCM_TA_BRIDGE_EVENTS = new Set<string>([
  EVENT_TYPES.HCM_TA_PUNCH_RECORDED,
  EVENT_TYPES.HCM_TA_NOVELTY_DECIDED,
  EVENT_TYPES.HCM_TA_CORRECTION_DECIDED,
  EVENT_TYPES.HCM_TA_SHIFT_SWAP_DECIDED,
]);

@Injectable()
export class HcmTaEventBridgeService implements OnModuleInit {
  private readonly logger = new Logger(HcmTaEventBridgeService.name);

  constructor(
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('*', async (event) => this.handleEvent(event));
    this.logger.log('HCM TA event bridge subscribed');
  }

  private async handleEvent(event: DomainEvent) {
    if (!HCM_TA_BRIDGE_EVENTS.has(event.eventType)) return;
    const payload = event.payload as Record<string, unknown>;

    try {
      if (event.eventType === EVENT_TYPES.HCM_TA_PUNCH_RECORDED) {
        await this.prisma.hcmTaTimePunch.updateMany({
          where: { organizationId: event.organizationId, punchKey: event.aggregateId },
          data: { metadata: { calendarSynced: true, syncedAt: new Date().toISOString() } },
        });
      }

      if (event.eventType === EVENT_TYPES.HCM_TA_NOVELTY_DECIDED && payload.approved) {
        await this.prisma.hcmTaTimeNovelty.updateMany({
          where: { organizationId: event.organizationId, noveltyKey: event.aggregateId },
          data: { metadata: { workflowCompleted: true, payrollQueued: true } },
        });
      }

      if (event.eventType === EVENT_TYPES.HCM_TA_CORRECTION_DECIDED && payload.approved) {
        await this.prisma.hcmTaPunchCorrection.updateMany({
          where: { organizationId: event.organizationId, correctionKey: event.aggregateId },
          data: { metadata: { workflowCompleted: true } },
        });
      }
    } catch (err) {
      this.logger.warn(`HCM TA bridge skipped for ${event.eventType}: ${(err as Error).message}`);
    }
  }
}
