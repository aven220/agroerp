import type { RecordHealth, RecordHealthLevel } from '../contracts/record-health';
import { getHealthRules } from '../registry/health-rule.registry';
import type { UreRecordExplorerResponse } from '../../record-explorer/types';

export class RecordHealthEngine {
  evaluate(record: UreRecordExplorerResponse): RecordHealth {
    const rules = getHealthRules();
    const checks = rules.map((rule) => rule.evaluate(record));
    const score = checks.reduce((sum, check) => sum + check.score, 0);
    const completed = checks.filter((check) => check.passed).length;

    return {
      score,
      level: classifyHealthScore(score),
      completed,
      total: checks.length,
      checks,
    };
  }
}

export function classifyHealthScore(score: number): RecordHealthLevel {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'warning';
  return 'critical';
}

export const recordHealthEngine = new RecordHealthEngine();

export function healthLevelAlertClass(level: RecordHealthLevel): string {
  switch (level) {
    case 'excellent':
      return 'alert-success';
    case 'good':
      return 'alert-info';
    case 'warning':
      return 'alert-warn';
    default:
      return 'alert-error';
  }
}
