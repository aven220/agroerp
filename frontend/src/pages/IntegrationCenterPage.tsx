import { useEffect, useState } from 'react';
import { Header } from '../components/layout/Header';
import { PageLayout } from '../components/layout/PageLayout';
import { HubToolbar } from '../components/layout/HubToolbar';
import { PageSummary, MetricCard, PageSection } from '../components/page';
import { FlowNextActions } from '../components/flow/FlowNextActions';
import { FlowProgress } from '../components/flow/FlowProgress';
import { ModuleIcons } from '../components/ui/icons';
import { getEihCenter, type EihCenter } from '../api/integration';
import { LoadingState } from '../components/ux/LoadingState';

export function IntegrationCenterPage() {
  const [center, setCenter] = useState<EihCenter | null>(null);
  useEffect(() => { getEihCenter().then(setCenter); }, []);
  if (!center) return <LoadingState variant="dashboard" message="Cargando integraciones..." />;

  const d = center.dashboard;
  return (
    <>
      <Header
        title="Integraciones"
        subtitle="Conectores, flujos de datos e historial de sincronización"
      />
      <PageLayout
        toolbar={
          <HubToolbar
            primaryAction={{ label: 'Conectores', to: '/integraciones/conectores' }}
            moreActions={[
              { label: 'Flujos', to: '/integraciones/flujos' },
              { label: 'Historial', to: '/integraciones/historial' },
              { label: 'Errores', to: '/integraciones/errores' },
              { label: 'Dashboard', to: '/integraciones/dashboard' },
            ]}
          />
        }
      >
        <FlowProgress flowId="integrations" currentStepId="hub" />

        <FlowNextActions
          title="Configurar integraciones"
          subtitle="Conecte sistemas externos y supervise la sincronización."
          actions={[
            { label: 'Conectores', description: 'Registre sistemas origen y destino', to: '/integraciones/conectores', primary: true, icon: ModuleIcons.ecosystem },
            { label: 'Flujos de datos', description: 'Defina qué información se sincroniza', to: '/integraciones/flujos', icon: ModuleIcons.sync },
            { label: 'Revisar errores', description: 'Corrija fallos de sincronización', to: '/integraciones/errores', icon: ModuleIcons.warning },
          ]}
        />

        <PageSummary className="kpi-grid-lg">
          <MetricCard label="Conectores" value={d.totalConnectors} tone="blue" />
          <MetricCard label="Activos" value={d.activeConnectors} tone="green" />
          <MetricCard label="Flujos publicados" value={d.publishedFlows} />
          <MetricCard label="Sync 24h" value={d.syncs24h} />
          <MetricCard label="Tasa éxito" value={`${d.successRate24h}%`} tone="green" />
          <MetricCard label="Errores pendientes" value={d.pendingErrors} />
        </PageSummary>
        {center.suggestions.length > 0 ? (
          <PageSection title="Análisis IA">
            <table className="data-table data-table-compact">
              <thead><tr><th>Tipo</th><th>Recomendación</th></tr></thead>
              <tbody>
                {center.suggestions.map((s, i) => (
                  <tr key={i}>
                    <td>{String((s as { type?: string }).type ?? '')}</td>
                    <td>{String((s as { recommendation?: string }).recommendation ?? '')}</td>
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
