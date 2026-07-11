import { useEffect, useState } from 'react';
import { HubToolbar } from '../components/layout/HubToolbar';
import {
  PageLayout,
  PageHeader,
  PageSection,
  PageSummary,
  MetricCard,
  SimpleRecordsTable,
  withRowId,
} from '../components/page';
import { getExecutiveDashboard } from '../api/coffee';
import { LoadingState } from '../components/ux/LoadingState';

export function CoffeeExecutiveDashboardPage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { getExecutiveDashboard().then(setData); }, []);
  if (!data) return <LoadingState variant="dashboard" message="Cargando resumen ejecutivo…" />;

  const kpis = (data.kpis ?? {}) as Record<string, unknown>;
  const statistics = (data.statistics ?? {}) as Record<string, Record<string, unknown>>;
  const analytics = (data.analytics ?? {}) as Record<string, unknown>;
  const suggestions = (data.suggestions ?? []) as Array<Record<string, unknown>>;
  const trends = (analytics.trends ?? {}) as Record<string, Array<Record<string, unknown>>>;
  const comparatives = (analytics.comparatives ?? {}) as Record<string, Record<string, number>>;

  const periodData = ['today', 'week', 'month', 'year'].map((p) =>
    withRowId({ ...(statistics[p] ?? {}), period: p } as Record<string, unknown>, 'period'),
  );

  const comparativeData = Object.entries(comparatives).map(([key, val]) =>
    withRowId({ ...val, metric: key } as Record<string, unknown>, 'metric'),
  );

  return (
    <PageLayout
      toolbar={
        <HubToolbar
          primaryAction={{ label: 'Centro de operaciones', to: '/compras/ops' }}
          moreActions={[
            { label: 'Analítica', to: '/compras/ops/analitica' },
            { label: 'Centro', to: '/compras' },
          ]}
        />
      }
    >
      <PageHeader
        title="Dashboard ejecutivo"
        subtitle="KPIs, tendencias e IA"
      />

      <PageSummary>
        <MetricCard label="Kg comprados" value={Number(kpis.kgTotal ?? 0).toLocaleString()} />
        <MetricCard label="Valor comprado" value={Number(kpis.amountTotal ?? 0).toLocaleString()} />
        <MetricCard label="Precio promedio" value={Number(kpis.avgPricePerKg ?? 0).toLocaleString()} />
        <MetricCard label="Humedad prom." value={`${Number(kpis.avgHumidity ?? 0).toFixed(1)}%`} />
        <MetricCard label="Factor prom." value={Number(kpis.avgFactor ?? 0).toFixed(1)} />
        <MetricCard label="% rechazo" value={`${Number(kpis.rejectRate ?? 0).toFixed(1)}%`} />
        <MetricCard label="Bonificaciones" value={Number(kpis.bonusesTotal ?? 0).toLocaleString()} />
        <MetricCard label="Castigos" value={Number(kpis.penaltiesTotal ?? 0).toLocaleString()} />
      </PageSummary>

      <PageSection title="Comparativos hoy / semana / mes / año">
        <SimpleRecordsTable
          gridId="coffee-exec-periods"
          selectable={false}
          data={periodData}
          columns={[
            { key: 'period', label: 'Periodo', getValue: (r) => String(r.period) },
            { key: 'tickets', label: 'Tickets', getValue: (r) => String(r.tickets ?? 0) },
            { key: 'kgTotal', label: 'Kg', getValue: (r) => Number(r.kgTotal ?? 0).toLocaleString() },
            { key: 'amountTotal', label: 'Valor', getValue: (r) => Number(r.amountTotal ?? 0).toLocaleString() },
            { key: 'avgPricePerKg', label: 'Precio prom.', getValue: (r) => Number(r.avgPricePerKg ?? 0).toLocaleString() },
            { key: 'rejectRate', label: 'Rechazo %', getValue: (r) => `${Number(r.rejectRate ?? 0).toFixed(1)}%` },
          ]}
        />
      </PageSection>

      <PageSection title="Tendencia diaria (kg)">
        <div className="spark-chart">
          {(trends.daily ?? []).slice(-30).map((d) => (
            <div key={String(d.day)} className="spark-chart-col-fixed" title={`${d.day}: ${d.kg}`}>
              <div className="spark-bar spark-bar-green" style={{ height: Math.max(4, Number(d.kg) / 50) }} />
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection title="Delta vs periodo anterior">
        <SimpleRecordsTable
          gridId="coffee-exec-comparatives"
          selectable={false}
          data={comparativeData}
          columns={[
            { key: 'metric', label: 'Métrica', getValue: (r) => String(r.metric) },
            { key: 'current', label: 'Actual', getValue: (r) => Number(r.current ?? 0).toLocaleString() },
            { key: 'previous', label: 'Anterior', getValue: (r) => Number(r.previous ?? 0).toLocaleString() },
            { key: 'delta', label: 'Delta', getValue: (r) => Number(r.delta ?? 0).toLocaleString() },
            { key: 'deltaPct', label: 'Delta %', getValue: (r) => `${Number(r.deltaPct ?? 0).toFixed(1)}%` },
          ]}
        />
      </PageSection>

      <PageSection title="Sugerencias y recomendaciones">
        <ul>
          {suggestions.map((s, i) => (
            <li key={i}><strong>{String(s.type)}</strong>: {String(s.recommendation)}</li>
          ))}
        </ul>
      </PageSection>
    </PageLayout>
  );
}
