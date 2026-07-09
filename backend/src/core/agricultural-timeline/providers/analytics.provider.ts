import { Injectable } from '@nestjs/common';
import { CAPTURE_ANALYTICS_EVENT_TYPES } from '@agroerp/shared';
import { EventService } from '@/core/events/application/event.service';
import type { TimelineProvider } from '../interfaces/timeline-provider.interface';
import {
  TIMELINE_EVENT_TYPES,
  TIMELINE_SOURCES,
  type TimelineEventType,
  type TimelineItem,
  type TimelineQueryContext,
} from '../domain/timeline-event';

/**
 * Reads Capture Analytics history from the event store stream
 * populated by AnalyticsEventService (aggregate CaptureAnalytics).
 */
@Injectable()
export class AnalyticsProvider implements TimelineProvider {
  readonly key = 'analytics';

  constructor(private readonly events: EventService) {}

  async fetch(context: TimelineQueryContext): Promise<TimelineItem[]> {
    const analyticsEvents = await this.events.getByAggregate(
      'CaptureAnalytics',
      context.entityId,
      context.organizationId,
    );

    return analyticsEvents
      .filter((event) => event.occurredAt instanceof Date)
      .map((event) => {
        const payload = (event.payload ?? {}) as Record<string, unknown>;
        const analyticsType = String(payload.eventType ?? event.eventType);

        return {
          id: `analytics:${event.id ?? analyticsType}`,
          date: event.occurredAt!.toISOString(),
          title: this.buildTitle(analyticsType),
          description: String(payload.processingType ?? payload.integration ?? null),
          entityId: context.entityId,
          entityType: String(payload.entityType ?? context.entityType),
          organizationId: context.organizationId,
          eventType: this.mapAnalyticsType(analyticsType),
          source: TIMELINE_SOURCES.ANALYTICS,
          importance: 'high',
          icon: 'analytics',
          metadata: payload,
        } satisfies TimelineItem;
      });
  }

  private mapAnalyticsType(value: string): TimelineEventType {
    switch (value) {
      case CAPTURE_ANALYTICS_EVENT_TYPES.PRODUCER_CREATED:
        return TIMELINE_EVENT_TYPES.PRODUCER_CREATED;
      case CAPTURE_ANALYTICS_EVENT_TYPES.FARM_CREATED:
        return TIMELINE_EVENT_TYPES.FARM_CREATED;
      case CAPTURE_ANALYTICS_EVENT_TYPES.PRODUCTION_REGISTERED:
        return TIMELINE_EVENT_TYPES.LOT_CREATED;
      case CAPTURE_ANALYTICS_EVENT_TYPES.FORM_COMPLETED:
        return TIMELINE_EVENT_TYPES.FORM_SUBMITTED;
      default:
        return TIMELINE_EVENT_TYPES.ANALYTICS;
    }
  }

  private buildTitle(analyticsType: string): string {
    switch (analyticsType) {
      case CAPTURE_ANALYTICS_EVENT_TYPES.PRODUCER_CREATED:
        return 'Productor registrado';
      case CAPTURE_ANALYTICS_EVENT_TYPES.FARM_CREATED:
        return 'Finca registrada';
      case CAPTURE_ANALYTICS_EVENT_TYPES.PRODUCTION_REGISTERED:
        return 'Producción / lote registrado';
      case CAPTURE_ANALYTICS_EVENT_TYPES.FORM_COMPLETED:
        return 'Formulario completado';
      default:
        return 'Evento analítico';
    }
  }
}
