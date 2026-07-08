import { type FormEntityMapping } from '@agroerp/shared';
import type { ProcessableSubmission } from '@/core/capture-processing/domain/types/processable-submission';
import { resolveProcessingType } from '@/core/capture-processing/domain/types/processing-type';
import type { FlowContext, FlowExistingEntity } from '../domain/flow-context';

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function readId(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return null;
}

const ENTITY_ID_KEYS: Array<{ keys: string[]; entityType: string }> = [
  { keys: ['producerId', 'producer_id'], entityType: 'Producer' },
  { keys: ['farmId', 'farm_id', 'farmUnitId', 'farm_unit_id'], entityType: 'Farm' },
  { keys: ['lotId', 'lot_id', 'fieldLotId', 'field_lot_id'], entityType: 'Lot' },
  { keys: ['entityId', 'entity_id', 'targetEntityId', 'target_entity_id'], entityType: '*' },
];

export class SubmissionContextBuilder {
  build(input: ProcessableSubmission): FlowContext {
    const data = asRecord(input.submission.data);
    const submissionContext = asRecord(input.submission.context);
    const metadata = asRecord(input.form.metadata);
    const entityMapping = metadata.entityMapping as FormEntityMapping | undefined;

    return {
      submission: {
        id: input.submission.id,
        data: input.submission.data,
        context: input.submission.context,
        externalId: input.submission.externalId,
        gpsLocation: input.submission.gpsLocation,
      },
      form: {
        id: input.form.id,
        formKey: input.form.formKey,
        version: input.form.version,
        metadata: input.form.metadata,
        schema: input.form.schema,
      },
      processingType: resolveProcessingType(input.form),
      entityMapping,
      organizationId: input.organizationId,
      currentUser: { id: input.userId },
      existingEntities: this.resolveExistingEntities(data, submissionContext, entityMapping),
    };
  }

  private resolveExistingEntities(
    data: Record<string, unknown>,
    submissionContext: Record<string, unknown>,
    entityMapping?: FormEntityMapping,
  ): FlowExistingEntity[] {
    const found = new Map<string, FlowExistingEntity>();

    for (const source of [data, submissionContext]) {
      for (const mapping of ENTITY_ID_KEYS) {
        for (const key of mapping.keys) {
          const id = readId(source[key]);
          if (!id) continue;
          const entityType =
            mapping.entityType === '*'
              ? readId(source.entityType ?? source.targetEntity) ??
                entityMapping?.targetEntity ??
                'Unknown'
              : mapping.entityType;
          found.set(`${entityType}:${id}`, {
            entityType,
            id,
            source: key,
          });
        }
      }
    }

    if (entityMapping?.targetEntity) {
      const mappedId = this.resolveMappedEntityId(data, entityMapping);
      if (mappedId) {
        found.set(`${entityMapping.targetEntity}:${mappedId}`, {
          entityType: entityMapping.targetEntity,
          id: mappedId,
          source: 'entityMapping',
        });
      }
    }

    return Array.from(found.values());
  }

  private resolveMappedEntityId(
    data: Record<string, unknown>,
    entityMapping: FormEntityMapping,
  ): string | null {
    for (const mapping of entityMapping.mappings ?? []) {
      const idKeys = [`${mapping.entityProperty}Id`, `${mapping.fieldKey}Id`];
      for (const key of idKeys) {
        const id = readId(data[key]);
        if (id) return id;
      }
    }
    return readId(data.entityId ?? data.targetEntityId);
  }
}
