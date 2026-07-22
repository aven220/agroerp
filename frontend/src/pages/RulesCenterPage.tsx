import { useEffect, useState } from 'react';
import { Header } from '../components/layout/Header';
import { PageLayout } from '../components/layout/PageLayout';
import { HubToolbar } from '../components/layout/HubToolbar';
import { PageSummary, MetricCard, PageSection } from '../components/page';
import { getBreCenter, type BreCenter } from '../api/bre';
import { LoadingState } from '../components/ux/LoadingState';

export function RulesCenterPage() {
  const [center, setCenter] = useState<BreCenter | null>(null);
  useEffect(() => { getBreCenter().then(setCenter); }, []);
  if (!center) return <LoadingState variant="dashboard" message="Cargando reglas de negocio..." />;

  return (
    <>
      <Header
        title="Reglas de negocio"
        subtitle="Automatice validaciones y decisiones según políticas de la organización"
      />
      <PageLayout
        toolbar={
          <HubToolbar
            primaryAction={{ label: 'Diseñador', to: '/reglas/disenar' }}
            moreActions={[
              { label: 'Catálogo', to: '/reglas/catalogo' },
              { label: 'Simulador', to: '/reglas/simulador' },
              { label: 'Versiones', to: '/reglas/versiones' },
              { label: 'Auditoría', to: '/reglas/auditoria' },
            ]}
          />
        }
      >
        <PageSummary className="kpi-grid-lg">
          <MetricCard label="Reglas totales" value={center.dashboard.totalRules} tone="blue" />
          <MetricCard label="Publicadas" value={center.dashboard.publishedRules} tone="green" />
          <MetricCard label="Ejecuciones 24h" value={center.dashboard.executions24h} />
          <MetricCard label="Fallos 24h" value={center.dashboard.failures24h} />
          <MetricCard label="Éxito" value={`${center.dashboard.successRatePct}%`} tone="green" />
          <MetricCard label="Latencia prom." value={`${center.dashboard.avgDurationMs}ms`} />
          <MetricCard label="Simulaciones" value={center.dashboard.simulations24h} />
        </PageSummary>
        {center.suggestions.length > 0 ? (
          <PageSection title="Sugerencias IA">
            <table className="data-table data-table-compact">
              <tbody>
                {center.suggestions.map((s, i) => (
                  <tr key={i}>
                    <td>{String((s as { type?: string }).type ?? '')}</td>
                    <td>{String((s as { recommendation?: string }).recommendation ?? JSON.stringify(s))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PageSection>
        ) : null}
        {center.dashboard.topRules.length > 0 ? (
          <PageSection title="Reglas más ejecutadas (24h)">
            <table className="data-table data-table-compact">
              <thead><tr><th>Regla</th><th>Ejecuciones</th></tr></thead>
              <tbody>
                {center.dashboard.topRules.map((r) => (
                  <tr key={r.ruleKey}><td>{r.ruleKey}</td><td>{r.count}</td></tr>
                ))}
              </tbody>
            </table>
          </PageSection>
        ) : null}
      </PageLayout>
    </>
  );
}
