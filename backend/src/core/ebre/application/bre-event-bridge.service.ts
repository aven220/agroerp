import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EVENT_BUS_PORT, EventBusPort } from '@/shared/domain/events/event-bus.port';
import { DomainEvent } from '@/shared/domain/events/domain-event';
import { BreExecutorService } from './bre-executor.service';

@Injectable()
export class BreEventBridgeService implements OnModuleInit {
  private readonly logger = new Logger(BreEventBridgeService.name);

  constructor(
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
    private readonly executor: BreExecutorService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('*', async (event) => this.handleEvent(event));
    this.logger.log('EBRE event bridge subscribed to all domain events');
  }

  private async handleEvent(event: DomainEvent) {
    try {
      await this.executor.processDomainEvent(event);
    } catch (err) {
      this.logger.error(
        `EBRE rule processing failed for ${event.eventType}: ${(err as Error).message}`,
      );
    }
  }
}
