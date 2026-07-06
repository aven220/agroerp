import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listEihSyncHistory, type EihSyncRun } from '../api/integration';

export function IntegrationHistoryPage() {
  const [runs, setRuns] = useState<EihSyncRun[]>([]);
  useEffect(() => { listEihSyncHistory().then(setRuns); }, []);

  return (
    <>
      <Header
        title="Historial de sincronizaciones"
        subtitle="Ejecuciones y resultados"
        actions={<Link to="/integraciones" className="btn">Centro</Link>}
      />
      <section className="panel">
        <table className="data-table">
          <thead>
            <tr><th>Run</th><th>Estado</th><th>Modo</th><th>Entrada</th><th>Salida</th><th>Fallos</th><th>Duración</th><th>Fecha</th></tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td>{r.runKey}</td>
                <td>{r.status}</td>
                <td>{r.syncMode}</td>
                <td>{r.recordsIn}</td>
                <td>{r.recordsOut}</td>
                <td>{r.recordsFailed}</td>
                <td>{r.durationMs != null ? `${r.durationMs}ms` : '—'}</td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
