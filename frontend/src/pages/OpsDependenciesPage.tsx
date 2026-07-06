import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEopServiceMap, type EopServiceMap } from '../api/observability';

export function OpsDependenciesPage() {
  const [graph, setGraph] = useState<EopServiceMap | null>(null);
  useEffect(() => { getEopServiceMap().then(setGraph); }, []);

  return (
    <>
      <Header title="Mapa de dependencias" subtitle="Service map y dependency graph" actions={<Link to="/operaciones" className="btn">Centro</Link>} />
      <section className="panel">
        <h3>Nodos ({graph?.nodes.length ?? 0})</h3>
        <table className="data-table">
          <thead><tr><th>Key</th><th>Nombre</th><th>Componente</th><th>Estado</th></tr></thead>
          <tbody>
            {(graph?.nodes ?? []).map((n) => (
              <tr key={n.id}><td>{n.key}</td><td>{n.name}</td><td>{n.component}</td><td>{n.status}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Dependencias ({graph?.edges.length ?? 0})</h3>
        <table className="data-table">
          <thead><tr><th>Origen</th><th>Destino</th><th>Tipo</th><th>Latencia avg</th></tr></thead>
          <tbody>
            {(graph?.edges ?? []).map((e) => (
              <tr key={e.id}><td>{e.source}</td><td>{e.target}</td><td>{e.type}</td><td>{e.latencyMsAvg ?? '—'}ms</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
