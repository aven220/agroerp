import { DomainEvent } from '../events/domain-event';

export interface EventStorePort {
  append(event: DomainEvent): Promise<DomainEvent>;
  getByAggregate(aggregateType: string, aggregateId: string): Promise<DomainEvent[]>;
  getSince(organizationId: string, cursor: bigint, limit?: number): Promise<DomainEvent[]>;
}

export const EVENT_STORE_PORT = Symbol('EVENT_STORE_PORT');
