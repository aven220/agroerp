import type { FormEntityMapping } from '@agroerp/shared';
import { UCEM_ERP_ENTITIES } from '@agroerp/shared';

export function mapEntityMappingToDto(
  data: Record<string, unknown>,
  entityMapping?: FormEntityMapping,
): Record<string, unknown> {
  if (!entityMapping?.mappings?.length) return {};

  const entityProps = UCEM_ERP_ENTITIES[entityMapping.targetEntity] ?? [];
  const propToPath = new Map(entityProps.map((p) => [p.property, p.dtoPath]));
  const result: Record<string, unknown> = {};

  for (const map of entityMapping.mappings) {
    const path = propToPath.get(map.entityProperty);
    if (!path || data[map.fieldKey] === undefined) continue;
    setNestedValue(result, path, data[map.fieldKey]);
  }

  return result;
}

function setNestedValue(target: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split('.');
  let cursor: Record<string, unknown> = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!cursor[key] || typeof cursor[key] !== 'object') {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]] = value;
}
