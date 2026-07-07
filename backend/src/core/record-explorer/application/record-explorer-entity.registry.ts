import { BadRequestException } from '@nestjs/common';
import type { UreEntityType } from '@agroerp/shared';

export interface UreEntityBinding {
  entityType: UreEntityType;
  aggregateType: string;
  readPermission: string;
}

const REGISTRY: Record<string, UreEntityBinding> = {
  producer: {
    entityType: 'Producer',
    aggregateType: 'Producer',
    readPermission: 'producer:read',
  },
  farm: {
    entityType: 'Farm',
    aggregateType: 'FarmUnit',
    readPermission: 'farm:read',
  },
  lot: {
    entityType: 'Lot',
    aggregateType: 'FieldLotProfile',
    readPermission: 'lot:read',
  },
};

export function resolveUreEntity(entityParam: string): UreEntityBinding {
  const key = entityParam.trim().toLowerCase();
  const binding = REGISTRY[key];
  if (!binding) {
    throw new BadRequestException(
      `Unsupported entity type: ${entityParam}. Supported: Producer, Farm, Lot`,
    );
  }
  return binding;
}
