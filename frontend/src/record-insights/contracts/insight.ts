export type InsightSeverity = 'info' | 'warning' | 'error';

export interface Insight {
  id: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  actionLabel?: string;
  actionRoute?: string;
}

export const INSIGHT_SEVERITY_ORDER: Record<InsightSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};
