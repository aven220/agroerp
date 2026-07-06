import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listEpopBenchmarks, runEpopBenchmark } from '../api/performance';

export function PerfBenchmarksPage() {
  const [runs, setRuns] = useState<Array<Record<string, unknown>>>([]);
  const reload = () => listEpopBenchmarks().then((r) => setRuns(r as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header
        title="Benchmarks y carga"
        subtitle="Comparación antes/después"
        actions={
          <div className="row-actions">
            <button type="button" className="btn" onClick={() => runEpopBenchmark('Cache warm', 'cache-warm').then(reload)}>
              Run cache-warm
            </button>
            <button type="button" className="btn" onClick={() => runEpopBenchmark('Query load', 'query-load').then(reload)}>
              Run query-load
            </button>
            <Link to="/rendimiento" className="btn">Centro</Link>
          </div>
        }
      />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Nombre</th><th>Escenario</th><th>Mejora %</th><th>Duración</th><th>Estado</th></tr></thead>
          <tbody>
            {runs.map((r) => (
              <tr key={String(r.runKey)}>
                <td>{String(r.name)}</td>
                <td>{String(r.scenario)}</td>
                <td>{r.improvementPct != null ? `${Number(r.improvementPct).toFixed(1)}%` : '—'}</td>
                <td>{r.durationMs != null ? `${r.durationMs}ms` : '—'}</td>
                <td>{String(r.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
