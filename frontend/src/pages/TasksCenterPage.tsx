import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEsdjeCenter, type EsdjeCenter } from '../api/scheduler';
import { LoadingState } from '../components/ux/LoadingState';

export function TasksCenterPage() {
  const [center, setCenter] = useState<EsdjeCenter | null>(null);
  useEffect(() => { getEsdjeCenter().then(setCenter); }, []);
  if (!center) return <LoadingState variant="dashboard" message="Cargando Centro de Tareas..." />;

  const d = center.dashboard;
  return (
    <>
      <Header
        title="Centro de Tareas — ESDJE"
        subtitle="Enterprise Scheduler & Distributed Job Engine"
        actions={
          <div className="row-actions">
            <Link to="/tareas/catalogo" className="btn">Catálogo</Link>
            <Link to="/tareas/colas" className="btn">Colas</Link>
            <Link to="/tareas/calendario" className="btn">Calendario</Link>
            <Link to="/tareas/workers" className="btn">Workers</Link>
            <Link to="/tareas/historial" className="btn">Historial</Link>
          </div>
        }
      />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Tareas totales</span><span className="kpi-value">{d.totalJobs}</span></div>
        <div className="kpi-card"><span className="kpi-label">Activas</span><span className="kpi-value">{d.activeJobs}</span></div>
        <div className="kpi-card"><span className="kpi-label">Ejecuciones 24h</span><span className="kpi-value">{d.runs24h}</span></div>
        <div className="kpi-card"><span className="kpi-label">Fallos 24h</span><span className="kpi-value">{d.failures24h}</span></div>
        <div className="kpi-card"><span className="kpi-label">Éxito</span><span className="kpi-value">{d.successRatePct}%</span></div>
        <div className="kpi-card"><span className="kpi-label">En cola</span><span className="kpi-value">{d.queuedRuns}</span></div>
        <div className="kpi-card"><span className="kpi-label">Ejecutando</span><span className="kpi-value">{d.runningRuns}</span></div>
        <div className="kpi-card"><span className="kpi-label">DLQ</span><span className="kpi-value">{d.deadLetters}</span></div>
        <div className="kpi-card"><span className="kpi-label">Workers online</span><span className="kpi-value">{d.onlineWorkers}</span></div>
        <div className="kpi-card"><span className="kpi-label">Latencia prom.</span><span className="kpi-value">{d.avgDurationMs}ms</span></div>
      </div>
      {center.suggestions.length > 0 && (
        <section className="panel">
          <h3>Sugerencias IA</h3>
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
        </section>
      )}
      {d.topJobs.length > 0 && (
        <section className="panel">
          <h3>Tareas más ejecutadas (24h)</h3>
          <table className="data-table data-table-compact">
            <thead><tr><th>Tarea</th><th>Ejecuciones</th></tr></thead>
            <tbody>
              {d.topJobs.map((j) => (
                <tr key={j.jobKey}><td>{j.jobKey}</td><td>{j.count}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {d.queues.length > 0 && (
        <section className="panel">
          <h3>Colas por módulo</h3>
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
        </section>
      )}
    </>
  );
}
