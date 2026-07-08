import type { Insight, InsightSeverity } from '../contracts/insight';
import { INSIGHT_SEVERITY_ORDER } from '../contracts/insight';
import { getInsightRules } from '../registry/insight-rule.registry';
import type { UreRecordExplorerResponse } from '../../record-explorer/types';

export class InsightsEngine {
  evaluate(record: UreRecordExplorerResponse): Insight[] {
    const rules = getInsightRules();
    const combined = rules.flatMap((rule) => rule.evaluate(record));
    return this.deduplicateById(combined).sort(this.compareBySeverity);
  }

  private deduplicateById(insights: Insight[]): Insight[] {
    const seen = new Set<string>();
    return insights.filter((insight) => {
      if (seen.has(insight.id)) return false;
      seen.add(insight.id);
      return true;
    });
  }

  private compareBySeverity(a: Insight, b: Insight): number {
    return INSIGHT_SEVERITY_ORDER[a.severity] - INSIGHT_SEVERITY_ORDER[b.severity];
  }
}

export const insightsEngine = new InsightsEngine();

export function sortInsightsBySeverity(insights: Insight[]): Insight[] {
  return [...insights].sort(
    (a, b) => INSIGHT_SEVERITY_ORDER[a.severity] - INSIGHT_SEVERITY_ORDER[b.severity],
  );
}

export function severityAlertClass(severity: InsightSeverity): string {
  switch (severity) {
    case 'error':
      return 'alert-error';
    case 'warning':
      return 'alert-warn';
    default:
      return 'alert-info';
  }
}
