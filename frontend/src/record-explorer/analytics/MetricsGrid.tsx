import type { UreAnalyticsMetric } from '../types';

interface MetricsGridProps {
  metrics: UreAnalyticsMetric[];
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  if (metrics.length === 0) {
    return <p className="ure-empty">Sin métricas disponibles</p>;
  }

  return (
    <div className="ure-metrics-grid">
      {metrics.map((metric) => (
        <div key={metric.key} className="kpi-card ure-metric">
          <span className="ure-kpi-label">{metric.label}</span>
          <strong className="ure-kpi-value">
            {metric.value}
            {metric.unit ? ` ${metric.unit}` : ''}
          </strong>
        </div>
      ))}
    </div>
  );
}
