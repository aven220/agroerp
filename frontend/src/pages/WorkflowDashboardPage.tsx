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
import { EnterpriseDataGrid } from '../components/data-workspace/EnterpriseDataGrid';
import type { GridColumnDef } from '../lib/data-grid/types';
import { getWorkflowDashboard, type WorkflowDashboard } from '../api/workflows';
import { useOnEntityUpdated } from '../lib/entitySync';

type BottleneckRow = { id: string; state: string; count: number };
type WorkloadRow = { id: string; userId: string; pendingAssignments: number };

const bottleneckColumns: GridColumnDef<BottleneckRow>[] = [
  {
    key: 'state',
    label: 'Estado',
    getValue: (b) => b.state,
    render: (b) => <code>{b.state}</code>,
  },
  {
    key: 'count',
    label: 'Solicitudes',
    getValue: (b) => b.count,
    render: (b) => (
      <div className="bar-meter">
        <div className="bar-fill" style={{ width: `${Math.min(100, b.count * 10)}%` }} />
        <span>{b.count}</span>
      </div>
    ),
  },
];

const workloadColumns: GridColumnDef<WorkloadRow>[] = [
  {
    key: 'userId',
    label: 'Usuario',
    getValue: (w) => w.userId,
    render: (w) => <code>{w.userId.slice(0, 8)}…</code>,
  },
  {
    key: 'pendingAssignments',
    label: 'Tareas',
    getValue: (w) => w.pendingAssignments,
  },
];

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
        setError(e instanceof Error ? e.message : 'Error al cargar indicadores de procesos');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useOnEntityUpdated(reload, 'workflow');

  if (loading) {
    return <PageState variant="loading" loadingVariant="dashboard" message="Cargando indicadores de procesos…" />;
  }
  if (error || !dashboard) {
    return (
      <>
        <PageHeader title="Indicadores de procesos" subtitle="KPIs · cuellos de botella · carga de trabajo" />
        <PageLayout>
          <PageState variant="error" message={error ?? 'No hay datos disponibles'} onRetry={reload} />
        </PageLayout>
      </>
    );
  }

  const { summary, bottlenecks, workloadByUser, sla } = dashboard;

  const bottleneckRows: BottleneckRow[] = bottlenecks.map((b) => ({
    id: b.state,
    state: b.state,
    count: b.count,
  }));

  const workloadRows: WorkloadRow[] = workloadByUser.map((w) => ({
    id: w.userId,
    userId: w.userId,
    pendingAssignments: w.pendingAssignments,
  }));

  return (
    <>
      <PageHeader
        title="Indicadores de procesos"
        subtitle="KPIs · cuellos de botella · carga de trabajo"
        actions={
          <PageActions>
            <Link to="/procesos" className="btn">Catálogo</Link>
            <Link to="/procesos/bandeja" className="btn">Bandeja</Link>
            <Link to="/procesos/instancias" className="btn">Solicitudes</Link>
          </PageActions>
        }
      />
      <PageLayout>
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
          {bottleneckRows.length === 0 ? (
            <PageState variant="empty" title="Aún no hay información" loadingVariant="inline" />
          ) : (
            <EnterpriseDataGrid
              gridId="workflow-bottlenecks"
              columns={bottleneckColumns}
              data={bottleneckRows}
              selectable={false}
              emptyMessage="Aún no hay información"
            />
          )}
        </PageSection>

        <PageSection title="Carga por usuario">
          {workloadRows.length === 0 ? (
            <PageState variant="empty" title="Sin asignaciones pendientes" loadingVariant="inline" />
          ) : (
            <EnterpriseDataGrid
              gridId="workflow-workload"
              columns={workloadColumns}
              data={workloadRows}
              selectable={false}
              emptyMessage="Sin asignaciones pendientes"
            />
          )}
        </PageSection>
      </div>

      <PageSection title="Preparación IA">
        <p>El motor registra métricas de duración, transiciones y cuellos de botella para optimización automática, predicción de tiempos y recomendación de rutas.</p>
      </PageSection>
    </PageLayout>
    </>
  );
}
