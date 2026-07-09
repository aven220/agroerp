import { WidgetShell } from '../components/WidgetShell';
import { MetricsGrid } from '../analytics/MetricsGrid';
import type { UreAnalyticsMetric } from '../types';

interface AnalyticsWidgetProps {
  analytics: UreAnalyticsMetric[];
}

export function AnalyticsWidget({ analytics }: AnalyticsWidgetProps) {
  return (
    <WidgetShell title="Análisis" id="ure-analytics" empty={analytics.length === 0} emptyMessage="Aún no hay métricas calculadas para este expediente.">
      <MetricsGrid metrics={analytics} />
    </WidgetShell>
  );
}
