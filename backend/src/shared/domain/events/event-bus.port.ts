import { DomainEvent } from '../events/domain-event';

export interface EventBusPort {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void;
}

export const EVENT_BUS_PORT = Symbol('EVENT_BUS_PORT');
