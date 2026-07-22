import { useEffect, useState } from 'react';
import { Header } from '../components/layout/Header';
import { PageLayout } from '../components/layout/PageLayout';
import { HubToolbar } from '../components/layout/HubToolbar';
import { PageSummary, MetricCard, PageSection } from '../components/page';
import { getApiCenter, type ApiCenter } from '../api/apim';
import { LoadingState } from '../components/ux/LoadingState';

export function ApiCenterPage() {
  const [center, setCenter] = useState<ApiCenter | null>(null);

  useEffect(() => { getApiCenter().then(setCenter); }, []);

  if (!center) return <LoadingState variant="dashboard" message="Cargando APIs..." />;

  return (
    <>
      <Header
        title="Gestión de APIs"
        subtitle="Catálogo de servicios, clientes y métricas de consumo"
      />
      <PageLayout
        toolbar={
          <HubToolbar
            primaryAction={{ label: 'Catálogo', to: '/apis/catalogo' }}
            moreActions={[
              { label: 'Clientes', to: '/apis/clientes' },
              { label: 'Portal Dev', to: '/apis/desarrolladores' },
              { label: 'Métricas', to: '/apis/metricas' },
              { label: 'Versiones', to: '/apis/versiones' },
            ]}
          />
        }
      >
        <PageSummary className="kpi-grid-lg">
          <MetricCard label="APIs registradas" value={center.apiCount} tone="blue" />
          <MetricCard label="Publicadas" value={center.publishedCount} tone="green" />
          <MetricCard label="Conectores" value={center.connectorCount} />
          <MetricCard label="Módulos" value={center.discoveredModules} />
          <MetricCard label="Solicitudes 24h" value={center.metrics.kpis.requests24h} />
          <MetricCard label="Latencia prom." value={`${center.metrics.kpis.avgLatencyMs}ms`} />
          <MetricCard label="Disponibilidad" value={`${center.metrics.kpis.availabilityPct}%`} />
          <MetricCard label="Tasa éxito" value={`${center.metrics.kpis.successRatePct}%`} tone="green" />
        </PageSummary>

        <PageSection title="Health checks recientes">
          <table className="data-table data-table-compact">
            <thead><tr><th>Target</th><th>Estado</th><th>Latencia</th></tr></thead>
            <tbody>
              {center.health.map((h, i) => (
                <tr key={i}>
                  <td>{h.targetRef}</td>
                  <td>{h.status}</td>
                  <td>{h.latencyMs ?? '-'}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PageSection>
      </PageLayout>
    </>
  );
}
