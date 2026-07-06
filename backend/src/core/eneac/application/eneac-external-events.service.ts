import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EventService } from '@/core/events/application/event.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EneacNotificationService } from './eneac-notification.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';

@Injectable()
export class EneacExternalEventsService {
  constructor(
    private readonly events: EventService,
    private readonly core: CoreEngineService,
    private readonly notifications: EneacNotificationService,
  ) {}

  async ingest(
    organizationId: string,
    userId: string,
    data: {
      eventType: string;
      aggregateType?: string;
      aggregateId?: string;
      payload?: Record<string, unknown>;
      alertSeverity?: string;
      notify?: boolean;
    },
    ctx?: RequestContext,
  ) {
    const aggregateId = data.aggregateId ?? randomUUID();
    const aggregateType = data.aggregateType ?? 'ExternalEvent';

    const stored = await this.events.emit({
      organizationId,
      aggregateType,
      aggregateId,
      eventType: data.eventType,
      payload: {
        ...data.payload,
        source: 'external_api',
        ingestedBy: userId,
      },
      metadata: {
        userId,
        correlationId: ctx?.correlationId ?? randomUUID(),
        source: 'api',
      },
    });

    await this.core.emitExternalEventReceived(
      organizationId,
      stored.id!,
      { eventType: data.eventType, aggregateType, aggregateId },
      { ctx },
    );

    if (data.notify !== false) {
      await this.notifications.processDomainEvent(stored);
    }

    return stored;
  }
}
