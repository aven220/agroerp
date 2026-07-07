import { Injectable, Logger } from '@nestjs/common';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import type {
  AnalyticsEvent,
  AnalyticsLocation,
  EmitAnalyticsFromProcessingInput,
} from '../domain/analytics-event';
import { mapProcessingToAnalyticsEventType } from '../domain/analytics-types';
import { CaptureAnalyticsEventPublisher } from '../infrastructure/capture-analytics-event.publisher';

@Injectable()
export class AnalyticsEventService {
  private readonly logger = new Logger(AnalyticsEventService.name);

  constructor(private readonly publisher: CaptureAnalyticsEventPublisher) {}

  async emit(event: AnalyticsEvent, ctx?: RequestContext, userId?: string): Promise<void> {
    await this.publisher.publish(event, ctx, userId);
    this.logger.debug(
      `Analytics event ${event.eventType} for org ${event.organizationId} → entity ${event.entityId}`,
    );
  }

  async emitFromProcessing(
    input: EmitAnalyticsFromProcessingInput,
    ctx?: RequestContext,
  ): Promise<AnalyticsEvent> {
    const event = this.buildFromProcessing(input);
    await this.emit(event, ctx, input.userId);
    return event;
  }

  buildFromProcessing(input: EmitAnalyticsFromProcessingInput): AnalyticsEvent {
    return {
      eventType: mapProcessingToAnalyticsEventType(input.processingType),
      timestamp: new Date().toISOString(),
      organizationId: input.organizationId,
      sourceForm: {
        formId: input.form.id,
        formKey: input.form.formKey,
        formVersion: input.form.version,
      },
      processingType: input.processingType,
      entityId: input.entityId,
      entityType: input.entityType,
      submissionId: input.submission.id,
      externalId: input.submission.externalId,
      location: this.extractLocation(input.submission.gpsLocation, input.submission.data),
      metadata: {
        processorKey: input.processorKey,
        duplicate: input.duplicate ?? false,
        integration: 'ebiap',
      },
    };
  }

  private extractLocation(
    gpsLocation?: unknown,
    data?: unknown,
  ): AnalyticsLocation | undefined {
    const gps = (gpsLocation ??
      (data && typeof data === 'object'
        ? (data as Record<string, unknown>).gpsLocation ??
          (data as Record<string, unknown>).gps
        : undefined)) as { lat?: number; lng?: number; accuracy?: number } | undefined;

    if (gps?.lat == null || gps?.lng == null) return undefined;

    return {
      lat: gps.lat,
      lng: gps.lng,
      accuracy: gps.accuracy,
    };
  }
}
