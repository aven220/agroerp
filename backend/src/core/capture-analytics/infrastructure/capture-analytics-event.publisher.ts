import { Injectable } from '@nestjs/common';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import type { AnalyticsEvent } from '../domain/analytics-event';

@Injectable()
export class CaptureAnalyticsEventPublisher {
  constructor(private readonly core: CoreEngineService) {}

  async publish(
    event: AnalyticsEvent,
    ctx?: RequestContext,
    userId?: string,
  ): Promise<void> {
    await this.core.emitCaptureAnalyticsEvent(
      event.organizationId,
      event.entityId,
      event as unknown as Record<string, unknown>,
      {
        ctx: { ...ctx, userId, organizationId: event.organizationId },
      },
    );
  }
}
