import type { UreRecordExplorerResponse } from '../../record-explorer/types';
import type { HealthCheck } from './record-health';

export interface HealthRule {
  id: string;
  evaluate(record: UreRecordExplorerResponse): HealthCheck;
}

export function buildHealthCheck(input: {
  id: string;
  title: string;
  description: string;
  passed: boolean;
  weight: number;
}): HealthCheck {
  return {
    id: input.id,
    title: input.title,
    description: input.description,
    passed: input.passed,
    weight: input.weight,
    score: input.passed ? input.weight : 0,
  };
}
