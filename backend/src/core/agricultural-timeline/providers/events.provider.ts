import { Injectable } from '@nestjs/common';
import { EventService } from '@/core/events/application/event.service';
import type { TimelineProvider } from '../interfaces/timeline-provider.interface';
import {
  TIMELINE_EVENT_TYPES,
  TIMELINE_SOURCES,
  type TimelineEventType,
  type TimelineItem,
  type TimelineQueryContext,
} from '../domain/timeline-event';

@Injectable()
export class EventsProvider implements TimelineProvider {
  readonly key = 'events';

  constructor(private readonly events: EventService) {}

  async fetch(context: TimelineQueryContext): Promise<TimelineItem[]> {
    const domainEvents = await this.events.getByAggregate(
      context.aggregateType,
      context.entityId,
      context.organizationId,
    );

    return domainEvents
      .filter((event) => event.occurredAt instanceof Date)
      .map((event) => ({
        id: `events:domain:${event.id ?? `${event.eventType}-${event.occurredAt?.getTime()}`}`,
        date: event.occurredAt!.toISOString(),
        title: event.eventType,
        description: null,
        entityId: context.entityId,
        entityType: context.entityType,
        organizationId: context.organizationId,
        eventType: this.mapEventType(event.eventType),
        source: TIMELINE_SOURCES.EVENTS,
        importance: 'normal',
        icon: 'event',
        metadata: {
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          payload: event.payload ?? {},
        },
      }));
  }

  private mapEventType(eventType: string): TimelineEventType {
    const normalized = eventType.toUpperCase();
    if (normalized.includes('PHOTO')) return TIMELINE_EVENT_TYPES.PHOTO;
    if (normalized.includes('DOCUMENT')) return TIMELINE_EVENT_TYPES.DOCUMENT;
    if (normalized.includes('VISIT')) return TIMELINE_EVENT_TYPES.VISIT;
    if (normalized.includes('FORM')) return TIMELINE_EVENT_TYPES.FORM_SUBMITTED;
    return TIMELINE_EVENT_TYPES.CUSTOM;
  }
}
