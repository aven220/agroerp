import { Injectable } from '@nestjs/common';
import type { TimelineFilter, TimelineResponse } from '../domain/timeline-event';
import { TimelineBuilderService } from './timeline-builder.service';
import { resolveTimelineEntity } from './timeline-entity.registry';

@Injectable()
export class AgriculturalTimelineService {
  constructor(private readonly builder: TimelineBuilderService) {}

  async getTimeline(
    organizationId: string,
    entityParam: string,
    entityId: string,
    filter: TimelineFilter = {},
  ): Promise<TimelineResponse> {
    const binding = resolveTimelineEntity(entityParam);

    return this.builder.build(
      {
        organizationId,
        entityType: binding.entityType,
        entityId,
        aggregateType: binding.aggregateType,
      },
      filter,
    );
  }
}
