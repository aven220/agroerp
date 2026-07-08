import type { FormDefinitionSchema, FormEntityMapping, FormFieldDefinition } from '../api/forms';

export interface DataMappingValue {
  entityMapping: FormEntityMapping;
  universalCatalogs: import('./ucem/universal-catalog-registry').UniversalCatalogDefinition[];
}

function defaultMapping(): FormEntityMapping {
  return { targetEntity: 'Producer', mappings: [] };
}

export function dataMappingFromForm(
  fields: FormFieldDefinition[],
  metadata?: { entityMapping?: FormEntityMapping },
  schemaCatalogs?: DataMappingValue['universalCatalogs'],
): DataMappingValue {
  return {
    entityMapping: metadata?.entityMapping ?? defaultMapping(),
    universalCatalogs: schemaCatalogs?.length ? schemaCatalogs : [],
  };
}

export function patchEntityMapping(
  value: DataMappingValue,
  patch: Partial<FormEntityMapping>,
): DataMappingValue {
  return {
    ...value,
    entityMapping: { ...value.entityMapping, ...patch },
  };
}

export function getFieldEntityMapping(
  value: DataMappingValue,
  fieldKey: string,
): import('../api/forms').FormFieldEntityMapping | undefined {
  return value.entityMapping.mappings.find((mapping) => mapping.fieldKey === fieldKey);
}

export function setFieldEntityMapping(
  value: DataMappingValue,
  fieldKey: string,
  entityProperty: string,
): DataMappingValue {
  const mappings = value.entityMapping.mappings.filter((mapping) => mapping.fieldKey !== fieldKey);
  if (entityProperty) {
    mappings.push({
      fieldKey,
      entityType: value.entityMapping.targetEntity,
      entityProperty,
    });
  }
  return patchEntityMapping(value, { mappings });
}
