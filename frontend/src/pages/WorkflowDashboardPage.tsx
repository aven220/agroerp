import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageState,
  PageSummary,
  MetricCard,
} from '../components/page';
import { getWorkflowDashboard, type WorkflowDashboard } from '../api/workflows';
import { useOnEntityUpdated } from '../lib/entitySync';

export function WorkflowDashboardPage() {
  const [dashboard, setDashboard] = useState<WorkflowDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    getWorkflowDashboard()
      .then(setDashboard)
      .catch((e: unknown) => {
        setDashboard(null);
        setError(e instanceof Error ? e.message : 'Error al cargar dashboard BPM');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useOnEntityUpdated(reload, 'workflow');

  if (loading) return <PageState variant="loading" loadingVariant="dashboard" message="Cargando dashboard BPM..." />;
  if (error || !dashboard) {
    return (
      <PageLayout>
        <PageHeader title="Dashboard BPM" subtitle="KPIs · cuellos de botella · carga de trabajo" />
        <PageState variant="error" message={error ?? 'No hay datos disponibles'} onRetry={reload} />
      </PageLayout>
    );
  }

  const { summary, bottlenecks, workloadByUser, sla } = dashboard;

  return (
    <PageLayout>
      <PageHeader
        title="Dashboard BPM"
        subtitle="KPIs · cuellos de botella · carga de trabajo"
        actions={
          <PageActions>
            <Link to="/procesos" className="btn">Catálogo</Link>
            <Link to="/procesos/bandeja" className="btn">Bandeja</Link>
            <Link to="/procesos/instancias" className="btn">Instancias</Link>
          </PageActions>
        }
      />

      <PageSummary>
        <MetricCard label="Procesos activos" value={summary.activeProcesses} tone="blue" />
        <MetricCard label="Suspendidos" value={summary.suspendedProcesses} />
        <MetricCard label="Vencidos (SLA)" value={summary.overdueProcesses} tone="coffee" />
        <MetricCard label="Completados (30d)" value={summary.completedLast30Days} tone="green" />
        <MetricCard label="Tiempo prom. (h)" value={summary.averageCompletionHours.toFixed(1)} />
        <MetricCard label="SLA en curso" value={sla.onTrack} tone="teal" />
      </PageSummary>

      <div className="split-layout">
        <PageSection title="Cuellos de botella por estado">
          {bottlenecks.length === 0 ? (
            <PageState variant="empty" title="Aún no hay información" loadingVariant="inline" />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Estado</th><th>Instancias</th></tr>
                </thead>
                <tbody>
                  {bottlenecks.map((b) => (
                    <tr key={b.state}>
                      <td><code>{b.state}</code></td>
                      <td>
                        <div className="bar-meter">
                          <div className="bar-fill" style={{ width: `${Math.min(100, b.count * 10)}%` }} />
                          <span>{b.count}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PageSection>

        <PageSection title="Carga por usuario">
          {workloadByUser.length === 0 ? (
            <PageState variant="empty" title="Sin asignaciones pendientes" loadingVariant="inline" />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Usuario</th><th>Tareas</th></tr>
                </thead>
                <tbody>
                  {workloadByUser.map((w) => (
                    <tr key={w.userId}>
                      <td><code>{w.userId.slice(0, 8)}…</code></td>
                      <td>{w.pendingAssignments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PageSection>
      </div>

      <PageSection title="Preparación IA">
        <p>El motor registra métricas de duración, transiciones y cuellos de botella para optimización automática, predicción de tiempos y recomendación de rutas.</p>
      </PageSection>
    </PageLayout>
  );
}
