/** Cliente — misma semántica que conditional-logic.engine.ts del backend */

export type ConditionalRule = {
  field: string;
  operator: string;
  value?: unknown;
};

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

export function evaluateRule(rule: ConditionalRule, data: Record<string, unknown>): boolean {
  const fieldValue = data[rule.field];
  const hasValue = fieldValue !== undefined && fieldValue !== null && fieldValue !== '';

  switch (rule.operator) {
    case 'empty':
      return !hasValue;
    case 'not_empty':
      return hasValue;
    case 'eq':
      return compare(fieldValue, rule.value) === 0;
    case 'neq':
      return compare(fieldValue, rule.value) !== 0;
    case 'gt':
      return Number(fieldValue) > Number(rule.value);
    case 'gte':
      return Number(fieldValue) >= Number(rule.value);
    case 'lt':
      return Number(fieldValue) < Number(rule.value);
    case 'lte':
      return Number(fieldValue) <= Number(rule.value);
    case 'in':
      return Array.isArray(rule.value) && rule.value.some((v) => compare(fieldValue, v) === 0);
    case 'not_in':
      return Array.isArray(rule.value) && !rule.value.some((v) => compare(fieldValue, v) === 0);
    default:
      return true;
  }
}

export function isVisible(
  rules: ConditionalRule | ConditionalRule[] | undefined,
  data: Record<string, unknown>,
): boolean {
  if (!rules) return true;
  const list = Array.isArray(rules) ? rules : [rules];
  return list.every((r) => evaluateRule(r, data));
}

export function isRequired(
  baseRequired: boolean | undefined,
  rules: ConditionalRule | ConditionalRule[] | undefined,
  data: Record<string, unknown>,
): boolean {
  if (rules) return isVisible(rules, data);
  return baseRequired === true;
}

export function resolvePreviewFields<T extends {
  key: string;
  required?: boolean;
  visibleWhen?: unknown;
  requiredWhen?: unknown;
}>(
  fields: T[],
  data: Record<string, unknown>,
): Array<T & { visible: boolean; effectiveRequired: boolean }> {
  return fields.map((field) => {
    const visible = isVisible(field.visibleWhen as ConditionalRule | ConditionalRule[] | undefined, data);
    const effectiveRequired = visible
      ? isRequired(field.required, field.requiredWhen as ConditionalRule | ConditionalRule[] | undefined, data)
      : false;
    return { ...field, visible, effectiveRequired };
  });
}
