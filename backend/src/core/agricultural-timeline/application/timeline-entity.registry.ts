import { BadRequestException } from '@nestjs/common';

export interface TimelineEntityBinding {
  entityType: string;
  aggregateType: string;
}

const REGISTRY: Record<string, TimelineEntityBinding> = {
  producer: { entityType: 'Producer', aggregateType: 'Producer' },
  farm: { entityType: 'Farm', aggregateType: 'FarmUnit' },
  lot: { entityType: 'Lot', aggregateType: 'FieldLotProfile' },
};

export function resolveTimelineEntity(entityParam: string): TimelineEntityBinding {
  const key = entityParam.trim().toLowerCase();
  const binding = REGISTRY[key];
  if (!binding) {
    throw new BadRequestException(
      `Unsupported entity type: ${entityParam}. Supported: Producer, Farm, Lot`,
    );
  }
  return binding;
}
