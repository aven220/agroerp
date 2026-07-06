import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEopAiSummary, getEopServiceMap, listEopErrors, listEopLogs } from '../api/observability';

export function OpsServicesPage() {
  const [logs, setLogs] = useState<unknown[]>([]);
  const [errors, setErrors] = useState<unknown[]>([]);
  const [ai, setAi] = useState<Record<string, unknown> | null>(null);
  const [nodes, setNodes] = useState<Array<{ key: string; name: string; component: string; status: string }>>([]);

  useEffect(() => {
    listEopLogs().then(setLogs);
    listEopErrors().then(setErrors);
    getEopAiSummary().then((a) => setAi(a as unknown as Record<string, unknown>));
    getEopServiceMap().then((g) => setNodes(g.nodes));
  }, []);

  return (
    <>
      <Header title="Dashboard de servicios" subtitle="Logs, errores, IA, nodos" actions={<Link to="/operaciones" className="btn">Centro</Link>} />
      <section className="panel">
        <h3>Servicios</h3>
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Nombre</th><th>Componente</th><th>Estado</th></tr></thead>
          <tbody>
            {nodes.map((n) => (
              <tr key={n.key}><td>{n.key}</td><td>{n.name}</td><td>{n.component}</td><td>{n.status}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>IA — tokens y costo</h3>
        <pre className="code-block">{JSON.stringify(ai, null, 2)}</pre>
      </section>
      <section className="panel">
        <h3>Errores recientes ({errors.length})</h3>
        <table className="data-table data-table-compact">
          <thead><tr><th>Servicio</th><th>Mensaje</th><th>Count</th></tr></thead>
          <tbody>
            {errors.slice(0, 20).map((e, i) => {
              const row = e as { serviceName?: string; message?: string; count?: number };
              return <tr key={i}><td>{row.serviceName}</td><td>{row.message}</td><td>{row.count}</td></tr>;
            })}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Logs recientes ({logs.length})</h3>
        <table className="data-table data-table-compact">
          <thead><tr><th>Nivel</th><th>Componente</th><th>Mensaje</th></tr></thead>
          <tbody>
            {logs.slice(0, 20).map((l, i) => {
              const row = l as { level?: string; component?: string; message?: string };
              return <tr key={i}><td>{row.level}</td><td>{row.component}</td><td>{row.message}</td></tr>;
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
