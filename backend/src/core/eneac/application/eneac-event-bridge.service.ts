import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { EVENT_BUS_PORT, EventBusPort } from '@/shared/domain/events/event-bus.port';
import { DomainEvent } from '@/shared/domain/events/domain-event';
import { EneacNotificationService } from './eneac-notification.service';

@Injectable()
export class EneacEventBridgeService implements OnModuleInit {
  private readonly logger = new Logger(EneacEventBridgeService.name);

  constructor(
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
    private readonly notifications: EneacNotificationService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('*', async (event) => this.handleEvent(event));
    this.logger.log('ENEAC event bridge subscribed to all domain events');
  }

  private async handleEvent(event: DomainEvent) {
    if (
      event.eventType.startsWith('Notification') ||
      event.eventType === EVENT_TYPES.SYNC_COMPLETED ||
      event.eventType === EVENT_TYPES.WORKFLOW_NOTIFICATION_QUEUED
    ) {
      return;
    }

    try {
      await this.notifications.processDomainEvent(event);
    } catch (err) {
      this.logger.error(
        `ENEAC rule processing failed for ${event.eventType}: ${(err as Error).message}`,
      );
    }
  }
}
