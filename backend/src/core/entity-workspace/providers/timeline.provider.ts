import { Injectable } from '@nestjs/common';
import { AgriculturalTimelineService } from '@/core/agricultural-timeline/application/agricultural-timeline.service';
import type { WorkspaceProvider } from '../interfaces/workspace-provider.interface';
import type { WorkspaceQueryContext } from '../domain/workspace';

@Injectable()
export class TimelineProvider implements WorkspaceProvider {
  readonly key = 'timeline';

  constructor(private readonly timeline: AgriculturalTimelineService) {}

  async fetch(context: WorkspaceQueryContext) {
    const timeline = await this.timeline.getTimeline(
      context.organizationId,
      context.entityParam,
      context.entityId,
      { limit: 80 },
    );

    return {
      section: { id: 'timeline', title: 'Línea de tiempo', priority: 20 },
      widgets: [
        {
          id: 'timeline:main',
          type: 'timeline',
          title: 'Historial cronológico',
          priority: 1,
          data: timeline as unknown as Record<string, unknown>,
        },
      ],
    };
  }
}
