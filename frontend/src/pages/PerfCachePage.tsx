import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEpopCacheStats, listEpopMaintenance, runEpopMaintenance, setEpopCache } from '../api/performance';

export function PerfCachePage() {
  const [stats, setStats] = useState<unknown[]>([]);
  const [jobs, setJobs] = useState<Array<Record<string, unknown>>>([]);

  const reload = () => {
    getEpopCacheStats().then(setStats);
    listEpopMaintenance().then((j) => setJobs(j as Array<Record<string, unknown>>));
  };
  useEffect(() => { reload(); }, []);

  const warmClientCache = async () => {
    await setEpopCache(`client-warm-${Date.now()}`, { warmed: true, ts: Date.now() }, 120);
    reload();
  };

  return (
    <>
      <Header
        title="Caché multinivel"
        subtitle="Cliente, servidor y datos"
        actions={
          <div className="row-actions">
            <button type="button" className="btn" onClick={warmClientCache}>Warm client cache</button>
            <Link to="/rendimiento" className="btn">Centro</Link>
          </div>
        }
      />
      <section className="panel">
        <h3>Estadísticas por capa</h3>
        <pre className="code-block">{JSON.stringify(stats, null, 2)}</pre>
      </section>
      <section className="panel">
        <h3>Mantenimiento programado</h3>
        <table className="data-table">
          <thead><tr><th>Job</th><th>Tipo</th><th>Cron</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={String(j.jobKey)}>
                <td>{String(j.jobKey)}</td>
                <td>{String(j.jobType)}</td>
                <td>{String(j.scheduleCron ?? '—')}</td>
                <td>{String(j.status)}</td>
                <td>
                  <button type="button" className="btn btn-sm" onClick={() => runEpopMaintenance(String(j.jobKey)).then(reload)}>
                    Ejecutar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
