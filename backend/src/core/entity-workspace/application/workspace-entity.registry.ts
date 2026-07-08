import { BadRequestException } from '@nestjs/common';
import type { UreEntityType } from '@agroerp/shared';

export interface WorkspaceEntityBinding {
  entityType: UreEntityType;
  aggregateType: string;
  entityParam: string;
}

const REGISTRY: Record<string, Omit<WorkspaceEntityBinding, 'entityParam'>> = {
  producer: { entityType: 'Producer', aggregateType: 'Producer' },
  farm: { entityType: 'Farm', aggregateType: 'FarmUnit' },
  lot: { entityType: 'Lot', aggregateType: 'FieldLotProfile' },
};

export function resolveWorkspaceEntity(entityParam: string): WorkspaceEntityBinding {
  const key = entityParam.trim().toLowerCase();
  const binding = REGISTRY[key];
  if (!binding) {
    throw new BadRequestException(
      `Unsupported entity type: ${entityParam}. Supported: Producer, Farm, Lot`,
    );
  }
  return { ...binding, entityParam: key };
}
