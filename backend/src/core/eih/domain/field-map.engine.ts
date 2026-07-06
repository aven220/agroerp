import { EihFieldMappingDefinition } from '@agroerp/shared';

export function applyFieldMappings(
  source: Record<string, unknown>,
  mappings: EihFieldMappingDefinition[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const m of mappings) {
    let value = getNestedValue(source, m.sourceField);
    if (value === undefined || value === null) {
      if (m.isRequired && m.defaultValue === undefined) {
        throw new Error(`Campo requerido faltante: ${m.sourceField}`);
      }
      value = m.defaultValue;
    }
    if (m.transform === 'uppercase' && typeof value === 'string') value = value.toUpperCase();
    if (m.transform === 'lowercase' && typeof value === 'string') value = value.toLowerCase();
    if (m.transform === 'number' && value != null) value = Number(value);
    setNestedValue(result, m.targetField, value);
  }
  return result;
}

export function suggestMappings(
  sourceFields: string[],
  targetFields: string[],
): EihFieldMappingDefinition[] {
  const suggestions: EihFieldMappingDefinition[] = [];
  for (const sf of sourceFields) {
    const normalized = sf.toLowerCase().replace(/[_-]/g, '');
    const match = targetFields.find((tf) => tf.toLowerCase().replace(/[_-]/g, '') === normalized);
    if (match) {
      suggestions.push({ sourceField: sf, targetField: match });
    }
  }
  return suggestions;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {};
    cur = cur[p] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}
