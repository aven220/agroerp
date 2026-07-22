import { useEffect, useState } from 'react';
import { Header } from '../components/layout/Header';
import { PageLayout } from '../components/layout/PageLayout';
import { HubToolbar } from '../components/layout/HubToolbar';
import { PageSummary, MetricCard, PageSection } from '../components/page';
import { getEsdjeCenter, type EsdjeCenter } from '../api/scheduler';
import { LoadingState } from '../components/ux/LoadingState';

export function TasksCenterPage() {
  const [center, setCenter] = useState<EsdjeCenter | null>(null);
  useEffect(() => { getEsdjeCenter().then(setCenter); }, []);
  if (!center) return <LoadingState variant="dashboard" message="Cargando tareas programadas..." />;

  const d = center.dashboard;
  return (
    <>
      <Header
        title="Tareas programadas"
        subtitle="Procesos automáticos, colas de trabajo e historial de ejecución"
      />
      <PageLayout
        toolbar={
          <HubToolbar
            primaryAction={{ label: 'Catálogo', to: '/tareas/catalogo' }}
            moreActions={[
              { label: 'Colas', to: '/tareas/colas' },
              { label: 'Calendario', to: '/tareas/calendario' },
              { label: 'Workers', to: '/tareas/workers' },
              { label: 'Historial', to: '/tareas/historial' },
            ]}
          />
        }
      >
        <PageSummary className="kpi-grid-lg">
          <MetricCard label="Tareas totales" value={d.totalJobs} tone="blue" />
          <MetricCard label="Activas" value={d.activeJobs} tone="green" />
          <MetricCard label="Ejecuciones 24h" value={d.runs24h} />
          <MetricCard label="Fallos 24h" value={d.failures24h} />
          <MetricCard label="Éxito" value={`${d.successRatePct}%`} tone="green" />
          <MetricCard label="En cola" value={d.queuedRuns} />
          <MetricCard label="Ejecutando" value={d.runningRuns} />
          <MetricCard label="DLQ" value={d.deadLetters} />
          <MetricCard label="Workers online" value={d.onlineWorkers} />
          <MetricCard label="Latencia prom." value={`${d.avgDurationMs}ms`} />
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
        {d.topJobs.length > 0 ? (
          <PageSection title="Tareas más ejecutadas (24h)">
            <table className="data-table data-table-compact">
              <thead><tr><th>Tarea</th><th>Ejecuciones</th></tr></thead>
              <tbody>
                {d.topJobs.map((j) => (
                  <tr key={j.jobKey}><td>{j.jobKey}</td><td>{j.count}</td></tr>
                ))}
              </tbody>
            </table>
          </PageSection>
        ) : null}
        {d.queues.length > 0 ? (
          <PageSection title="Colas por módulo">
            <table className="data-table data-table-compact">
              <thead><tr><th>Cola</th><th>Prioridad</th><th>Tareas</th><th>Concurrencia</th></tr></thead>
              <tbody>
                {d.queues.map((q) => (
                  <tr key={q.queueKey}>
                    <td>{q.name}</td>
                    <td>{q.priority}</td>
                    <td>{q.jobCount}</td>
                    <td>{q.maxConcurrency}</td>
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
