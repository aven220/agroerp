import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getWorkflowDashboard, type WorkflowDashboard } from '../api/workflows';
import { LoadingState } from '../components/ux/LoadingState';

export function WorkflowDashboardPage() {
  const [dashboard, setDashboard] = useState<WorkflowDashboard | null>(null);

  useEffect(() => {
    getWorkflowDashboard().then(setDashboard);
  }, []);

  if (!dashboard) return <LoadingState variant="dashboard" message="Cargando dashboard BPM..." />;

  const { summary, bottlenecks, workloadByUser, sla } = dashboard;

  return (
    <>
      <Header
        title="Dashboard BPM"
        subtitle="KPIs · cuellos de botella · carga de trabajo"
        actions={
          <div className="row-actions">
            <Link to="/procesos" className="btn">Catálogo</Link>
            <Link to="/procesos/bandeja" className="btn">Bandeja</Link>
            <Link to="/procesos/instancias" className="btn">Instancias</Link>
          </div>
        }
      />

      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary">
          <span className="kpi-label">Procesos activos</span>
          <span className="kpi-value">{summary.activeProcesses}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Suspendidos</span>
          <span className="kpi-value">{summary.suspendedProcesses}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Vencidos (SLA)</span>
          <span className="kpi-value">{summary.overdueProcesses}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Completados (30d)</span>
          <span className="kpi-value">{summary.completedLast30Days}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Tiempo prom. (h)</span>
          <span className="kpi-value">{summary.averageCompletionHours.toFixed(1)}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">SLA en curso</span>
          <span className="kpi-value">{sla.onTrack}</span>
        </div>
      </div>

      <div className="split-layout">
        <section className="panel">
          <h3>Cuellos de botella por estado</h3>
          {bottlenecks.length === 0 ? (
            <p className="text-muted">Sin datos</p>
          ) : (
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
          )}
        </section>

        <section className="panel">
          <h3>Carga por usuario</h3>
          {workloadByUser.length === 0 ? (
            <p className="text-muted">Sin asignaciones pendientes</p>
          ) : (
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
          )}
        </section>
      </div>

      <div className="panel ai-readiness-banner">
        <h3>Preparación IA</h3>
        <p>El motor registra métricas de duración, transiciones y cuellos de botella para optimización automática, predicción de tiempos y recomendación de rutas.</p>
      </div>
    </>
  );
}
