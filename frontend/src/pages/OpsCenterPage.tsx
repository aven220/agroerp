import { useEffect, useState } from 'react';
import { Header } from '../components/layout/Header';
import { PageLayout } from '../components/layout/PageLayout';
import { HubToolbar } from '../components/layout/HubToolbar';
import { PageSummary, MetricCard } from '../components/page';
import { getEopCenter, type EopDashboard } from '../api/observability';
import { LoadingState } from '../components/ux/LoadingState';

export function OpsCenterPage() {
  const [dash, setDash] = useState<EopDashboard | null>(null);
  useEffect(() => { getEopCenter().then(setDash); }, []);
  if (!dash) return <LoadingState variant="dashboard" message="Cargando monitoreo de operaciones..." />;

  return (
    <>
      <Header
        title="Monitoreo técnico"
        subtitle="Estado de servicios, incidentes y salud"
      />
      <PageLayout
        toolbar={
          <HubToolbar
            primaryAction={{ label: 'Incidentes', to: '/operaciones/incidentes' }}
            moreActions={[
              { label: 'Infraestructura', to: '/operaciones/infraestructura' },
              { label: 'Servicios', to: '/operaciones/servicios' },
              { label: 'Dependencias', to: '/operaciones/dependencias' },
              { label: 'Timeline', to: '/operaciones/timeline' },
            ]}
          />
        }
      >
        <PageSummary className="kpi-grid-lg">
          <MetricCard label="Salud" value={dash.health} tone="green" />
          <MetricCard label="Logs 24h" value={dash.logs24h} />
          <MetricCard label="Errores 24h" value={dash.errors24h} />
          <MetricCard label="Alertas abiertas" value={dash.openAlerts} />
          <MetricCard label="Incidentes" value={dash.openIncidents} />
          <MetricCard label="Traces 24h" value={dash.traces24h} />
          <MetricCard label="Nodos mapa" value={dash.serviceMap.nodes} />
          <MetricCard label="IA requests" value={dash.ai.requests} />
        </PageSummary>
      </PageLayout>
    </>
  );
}
