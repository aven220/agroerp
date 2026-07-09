import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { DomainEvent } from '@/shared/domain/events/domain-event';
import { EventBusPort, EVENT_BUS_PORT } from '@/shared/domain/events/event-bus.port';
import { EventStorePort, EVENT_STORE_PORT } from '@/shared/domain/events/event-store.port';
import { Inject } from '@nestjs/common';

@Injectable()
export class EventService implements OnModuleInit {
  private readonly logger = new Logger(EventService.name);

  constructor(
    @Inject(EVENT_STORE_PORT) private readonly eventStore: EventStorePort,
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
  ) {}

  onModuleInit() {
    this.logger.log('Event Engine initialized');
  }

  async emit(event: DomainEvent): Promise<DomainEvent> {
    const stored = await this.eventStore.append(event);
    await this.eventBus.publish(stored);
    this.logger.debug(`Event emitted: ${stored.eventType} [${stored.id}]`);
    return stored;
  }

  async getByAggregate(
    aggregateType: string,
    aggregateId: string,
    organizationId: string,
  ) {
    return this.eventStore.getByAggregate(aggregateType, aggregateId, organizationId);
  }

  async getSince(organizationId: string, cursor: bigint, limit?: number) {
    return this.eventStore.getSince(organizationId, cursor, limit);
  }

  async emitUserCreated(
    organizationId: string,
    userId: string,
    payload: Record<string, unknown>,
    metadata: DomainEvent['metadata'],
  ) {
    return this.emit({
      organizationId,
      aggregateType: 'User',
      aggregateId: userId,
      eventType: EVENT_TYPES.USER_CREATED,
      payload: { ...payload, newValues: payload },
      metadata,
    });
  }

  async emitAuthLoggedIn(
    organizationId: string,
    userId: string,
    payload: Record<string, unknown>,
    metadata: DomainEvent['metadata'],
  ) {
    return this.emit({
      organizationId,
      aggregateType: 'User',
      aggregateId: userId,
      eventType: EVENT_TYPES.AUTH_LOGGED_IN,
      payload,
      metadata,
    });
  }
}
