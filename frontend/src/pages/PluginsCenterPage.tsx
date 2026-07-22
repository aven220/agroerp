import { useEffect, useState } from 'react';
import { Header } from '../components/layout/Header';
import { PageLayout } from '../components/layout/PageLayout';
import { HubToolbar } from '../components/layout/HubToolbar';
import { PageSummary, MetricCard, PageSection } from '../components/page';
import { getEppmCenter, type EppmCenter } from '../api/plugins';
import { LoadingState } from '../components/ux/LoadingState';

export function PluginsCenterPage() {
  const [center, setCenter] = useState<EppmCenter | null>(null);
  useEffect(() => { getEppmCenter().then(setCenter); }, []);
  if (!center) return <LoadingState variant="dashboard" message="Cargando extensiones..." />;

  const d = center.dashboard;
  return (
    <>
      <Header
        title="Extensiones y marketplace"
        subtitle="Instale, actualice y administre complementos de la plataforma"
      />
      <PageLayout
        toolbar={
          <HubToolbar
            primaryAction={{ label: 'Marketplace', to: '/plugins/marketplace' }}
            moreActions={[
              { label: 'Extensiones', to: '/plugins/admin' },
              { label: 'Actualizaciones', to: '/plugins/actualizaciones' },
              { label: 'Desarrolladores', to: '/plugins/desarrolladores' },
            ]}
          />
        }
      >
        <PageSummary className="kpi-grid-lg">
          <MetricCard label="Publicados" value={d.totalPublished} tone="blue" />
          <MetricCard label="Instalados" value={d.installedCount} />
          <MetricCard label="Habilitados" value={d.enabledCount} tone="green" />
          <MetricCard label="Deshabilitados" value={d.disabledCount} />
          <MetricCard label="Fallos" value={d.failedInstalls} />
          <MetricCard label="Updates pendientes" value={d.pendingUpdates} />
          <MetricCard label="Auditoría 24h" value={d.audit24h} />
        </PageSummary>
        {center.suggestions.length > 0 ? (
          <PageSection title="Sugerencias IA">
            <table className="data-table data-table-compact">
              <thead><tr><th>Tipo</th><th>Recomendación</th></tr></thead>
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
        {center.installs.length > 0 ? (
          <PageSection title="Extensiones activas">
            <table className="data-table data-table-compact">
              <thead><tr><th>Plugin</th><th>Versión</th><th>Estado</th><th>Tipo</th></tr></thead>
              <tbody>
                {center.installs.map((i) => (
                  <tr key={i.id}>
                    <td>{i.plugin.name}</td>
                    <td>{i.installedVersion}</td>
                    <td>{i.status}</td>
                    <td>{i.plugin.pluginType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PageSection>
        ) : null}
      </PageLayout>
    </>
  );
}
