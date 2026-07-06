export type AlertOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq';

export function evaluateThreshold(value: number, operator: AlertOperator | string, threshold: number): boolean {
  switch (operator) {
    case 'gt':
      return value > threshold;
    case 'gte':
      return value >= threshold;
    case 'lt':
      return value < threshold;
    case 'lte':
      return value <= threshold;
    case 'eq':
      return value === threshold;
    default:
      return false;
  }
}

export function aggregateMetricValues(values: number[]): { avg: number; max: number; min: number; count: number } {
  if (!values.length) return { avg: 0, max: 0, min: 0, count: 0 };
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    avg: sum / values.length,
    max: Math.max(...values),
    min: Math.min(...values),
    count: values.length,
  };
}
