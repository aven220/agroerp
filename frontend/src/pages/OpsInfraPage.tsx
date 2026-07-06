import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEopHealth, listEopMetricsDashboard } from '../api/observability';

export function OpsInfraPage() {
  const [health, setHealth] = useState<{ status: string; checks: unknown[] } | null>(null);
  const [metrics, setMetrics] = useState<Record<string, { avg: number; max: number; count: number }> | null>(null);

  useEffect(() => {
    getEopHealth().then(setHealth);
    listEopMetricsDashboard().then((m) => setMetrics(m.summary));
  }, []);

  return (
    <>
      <Header title="Dashboard de infraestructura" subtitle="CPU, RAM, dependencias" actions={<Link to="/operaciones" className="btn">Centro</Link>} />
      <section className="panel">
        <h3>Health checks — {health?.status ?? '...'}</h3>
        <table className="data-table">
          <thead><tr><th>Check</th><th>Tipo</th><th>Estado</th><th>Latencia</th><th>Mensaje</th></tr></thead>
          <tbody>
            {(health?.checks ?? []).map((c, i) => {
              const row = c as { checkKey?: string; checkType?: string; status?: string; latencyMs?: number; message?: string };
              return (
                <tr key={i}>
                  <td>{row.checkKey}</td>
                  <td>{row.checkType}</td>
                  <td>{row.status}</td>
                  <td>{row.latencyMs ?? '—'}ms</td>
                  <td>{row.message}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Métricas agregadas</h3>
        <table className="data-table data-table-compact">
          <thead><tr><th>Kind</th><th>Avg</th><th>Max</th><th>Samples</th></tr></thead>
          <tbody>
            {metrics && Object.entries(metrics).map(([kind, v]) => (
              <tr key={kind}><td>{kind}</td><td>{v.avg.toFixed(2)}</td><td>{v.max.toFixed(2)}</td><td>{v.count}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
