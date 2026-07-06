export type EdgeRuleCondition = {
  metricKey?: string;
  operator?: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value?: number;
};

export function evaluateEdgeCondition(
  cond: EdgeRuleCondition,
  context: Record<string, unknown>,
): boolean {
  const val = context[cond.metricKey ?? ''] as number;
  if (typeof val !== 'number' || Number.isNaN(val)) return false;
  const threshold = cond.value ?? 0;
  switch (cond.operator) {
    case 'gt':
      return val > threshold;
    case 'lt':
      return val < threshold;
    case 'eq':
      return val === threshold;
    case 'gte':
      return val >= threshold;
    case 'lte':
      return val <= threshold;
    default:
      return false;
  }
}

export function matchEdgeRules<T extends { conditions: unknown }>(
  rules: T[],
  context: Record<string, unknown>,
): T[] {
  return rules.filter((r) =>
    evaluateEdgeCondition(r.conditions as EdgeRuleCondition, context),
  );
}
