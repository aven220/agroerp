import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listEimsCountHistory } from '../api/eims';

export function EimsCountHistoryPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    listEimsCountHistory()
      .then((r) => setRows(r as Array<Record<string, unknown>>))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <Header
        title="Historial de conteos"
        subtitle="Sesiones, estados y resultados"
        actions={<Link to="/inventario/conteos" className="btn">Centro</Link>}
      />
      {error ? <section className="panel error-panel">{error}</section> : null}
      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Clave</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Líneas</th>
              <th>Ajustes</th>
              <th>Creado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const counts = (r._count as Record<string, number>) ?? {};
              return (
                <tr key={String(r.id)}>
                  <td>{String(r.countKey)}</td>
                  <td>{String(r.name)}</td>
                  <td>{String(r.countType)}</td>
                  <td>{String(r.status)}</td>
                  <td>{String(counts.lines ?? 0)}</td>
                  <td>{String(counts.adjustments ?? 0)}</td>
                  <td>{String(r.createdAt).slice(0, 19)}</td>
                  <td><Link to={`/inventario/conteos/${encodeURIComponent(String(r.countKey))}`}>Ver</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
