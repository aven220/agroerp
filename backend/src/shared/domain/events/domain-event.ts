import { EVENT_TYPES, EventMetadata, DomainEventPayload } from '@agroerp/shared';

export interface DomainEvent {
  id?: string;
  organizationId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: DomainEventPayload;
  metadata: EventMetadata;
  version?: bigint;
  occurredAt?: Date;
}

export { EVENT_TYPES };
