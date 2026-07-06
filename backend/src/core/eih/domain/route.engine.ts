export type RoutingRule = {
  field?: string;
  operator?: 'eq' | 'neq' | 'contains';
  value?: string;
  targetStepKey?: string;
};

export function resolveRoute(
  rules: RoutingRule[],
  context: Record<string, unknown>,
  defaultStepKey: string,
): string {
  for (const rule of rules) {
    const val = String(context[rule.field ?? ''] ?? '');
    if (rule.operator === 'eq' && val === rule.value) return rule.targetStepKey ?? defaultStepKey;
    if (rule.operator === 'neq' && val !== rule.value) return rule.targetStepKey ?? defaultStepKey;
    if (rule.operator === 'contains' && rule.value && val.includes(rule.value)) {
      return rule.targetStepKey ?? defaultStepKey;
    }
  }
  return defaultStepKey;
}
