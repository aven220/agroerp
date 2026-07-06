import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  listEsdjeDeadLetters,
  listEsdjeRuns,
  requeueEsdjeDeadLetter,
  type EsdjeJobRun,
} from '../api/scheduler';

export function TasksHistoryPage() {
  const [runs, setRuns] = useState<EsdjeJobRun[]>([]);
  const [dlq, setDlq] = useState<unknown[]>([]);

  const reload = () => {
    listEsdjeRuns().then(setRuns);
    listEsdjeDeadLetters().then(setDlq);
  };
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header
        title="Historial y DLQ"
        subtitle="Ejecuciones, reintentos y dead letter queue"
        actions={<Link to="/tareas" className="btn">Centro</Link>}
      />
      {dlq.length > 0 && (
        <section className="panel">
          <h3>Dead Letter Queue</h3>
          <table className="data-table data-table-compact">
            <thead><tr><th>Tarea</th><th>Error</th><th>Intentos</th><th>Acción</th></tr></thead>
            <tbody>
              {dlq.map((d) => {
                const row = d as { id: string; jobKey: string; error: string; attempts: number };
                return (
                  <tr key={row.id}>
                    <td>{row.jobKey}</td>
                    <td>{row.error}</td>
                    <td>{row.attempts}</td>
                    <td>
                      <button type="button" className="btn btn-sm" onClick={() => requeueEsdjeDeadLetter(row.id).then(reload)}>
                        Reencolar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
      <section className="panel">
        <h3>Historial de ejecuciones</h3>
        <table className="data-table">
          <thead>
            <tr><th>Tarea</th><th>Estado</th><th>Intento</th><th>Duración</th><th>Worker</th><th>Inicio</th><th>Error</th></tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td>{r.jobKey}</td>
                <td>{r.status}</td>
                <td>{r.attempt}</td>
                <td>{r.durationMs}ms</td>
                <td>{r.workerNode ?? '—'}</td>
                <td>{r.startedAt ? new Date(r.startedAt).toLocaleString() : '—'}</td>
                <td>{r.error ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
