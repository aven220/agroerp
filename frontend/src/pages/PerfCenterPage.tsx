import { useEffect, useState } from 'react';
import { Header } from '../components/layout/Header';
import { PageLayout } from '../components/layout/PageLayout';
import { HubToolbar } from '../components/layout/HubToolbar';
import { PageSummary, MetricCard, PageSection } from '../components/page';
import { Badge } from '../components/ui/Badge';
import { getEpopCenter, type EpopDashboard } from '../api/performance';
import { LoadingState } from '../components/ux/LoadingState';

export function PerfCenterPage() {
  const [dash, setDash] = useState<EpopDashboard | null>(null);
  useEffect(() => { getEpopCenter().then(setDash); }, []);
  if (!dash) return <LoadingState variant="dashboard" message="Cargando rendimiento del sistema..." />;

  return (
    <>
      <Header
        title="Rendimiento del sistema"
        subtitle="Consultas lentas, caché y optimización de la plataforma"
      />
      <PageLayout
        toolbar={
          <HubToolbar
            primaryAction={{ label: 'Consultas', to: '/rendimiento/consultas' }}
            moreActions={[
              { label: 'Caché', to: '/rendimiento/cache' },
              { label: 'Benchmarks', to: '/rendimiento/benchmarks' },
              { label: 'Frontend', to: '/rendimiento/frontend' },
              { label: 'Mobile', to: '/rendimiento/mobile' },
            ]}
          />
        }
      >
        <PageSummary className="kpi-grid-lg">
          <MetricCard label="Resp. avg" value={`${dash.responseTimeAvg.toFixed(1)}ms`} tone="blue" />
          <MetricCard label="Slow queries 24h" value={dash.slowQueries24h} />
          <MetricCard label="Índices sugeridos" value={dash.indexRecommendations} />
          <MetricCard label="Memoria heap" value={`${dash.memoryMb.toFixed(0)}MB`} />
          <MetricCard label="Benchmarks" value={dash.benchmarks} />
          <MetricCard label="Bundle gzip" value={`${(dash.bundles.totalGzip / 1024).toFixed(0)}KB`} />
          <MetricCard label="FPS móvil avg" value={dash.mobile.avgFps.toFixed(1)} />
          <MetricCard label="Jobs mantenimiento" value={dash.maintenanceJobs} />
        </PageSummary>
        <PageSection title="Capacidades activas">
          <div className="row-actions">
            {Object.entries(dash.features).map(([k, v]) => (
              <Badge key={k} variant={v ? 'success' : 'default'}>
                {k}: {v ? 'ON' : 'OFF'}
              </Badge>
            ))}
          </div>
        </PageSection>
      </PageLayout>
    </>
  );
}
