import { WidgetShell } from '../components/WidgetShell';
import { MetricsGrid } from '../analytics/MetricsGrid';
import type { UreAnalyticsMetric } from '../types';

interface AnalyticsWidgetProps {
  analytics: UreAnalyticsMetric[];
}

export function AnalyticsWidget({ analytics }: AnalyticsWidgetProps) {
  return (
    <WidgetShell title="Analytics" id="ure-analytics" empty={analytics.length === 0}>
      <MetricsGrid metrics={analytics} />
    </WidgetShell>
  );
}
