import { CAPTURE_PROCESSING_TYPES } from '@agroerp/shared';
import type { FlowContext, FlowExistingEntity } from './flow-context';

export const LEGACY_CREATE_PROCESSING_TYPES = new Set<string>([
  CAPTURE_PROCESSING_TYPES.PRODUCER_CREATE,
  CAPTURE_PROCESSING_TYPES.FARM_CREATE,
  CAPTURE_PROCESSING_TYPES.PRODUCTION_CREATE,
]);

export function resolveProcessorKey(processingType: string | null): string | null {
  switch (processingType) {
    case CAPTURE_PROCESSING_TYPES.PRODUCER_CREATE:
      return 'producer';
    case CAPTURE_PROCESSING_TYPES.FARM_CREATE:
      return 'farm';
    case CAPTURE_PROCESSING_TYPES.PRODUCTION_CREATE:
      return 'production';
    default:
      return null;
  }
}

export function resolveTargetEntity(processingType: string | null): string | null {
  switch (processingType) {
    case CAPTURE_PROCESSING_TYPES.PRODUCER_CREATE:
      return 'Producer';
    case CAPTURE_PROCESSING_TYPES.FARM_CREATE:
      return 'Farm';
    case CAPTURE_PROCESSING_TYPES.PRODUCTION_CREATE:
      return 'Lot';
    default:
      return null;
  }
}

export function findExistingForTarget(
  context: FlowContext,
  targetEntity: string | null,
): FlowExistingEntity | null {
  if (!targetEntity) return null;
  return (
    context.existingEntities.find((entity) => entity.entityType === targetEntity) ?? null
  );
}
