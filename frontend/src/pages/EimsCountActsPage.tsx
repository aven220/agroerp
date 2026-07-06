import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listEimsCountActs } from '../api/eims';

export function EimsCountActsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    listEimsCountActs()
      .then((r) => setRows(r as Array<Record<string, unknown>>))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <Header
        title="Actas de cierre de conteo"
        subtitle="Documentos de cierre y resumen de conciliaciones"
        actions={<Link to="/inventario/conteos" className="btn">Centro</Link>}
      />
      {error ? <section className="panel error-panel">{error}</section> : null}
      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Acta</th>
              <th>Conteo</th>
              <th>Líneas</th>
              <th>Variaciones</th>
              <th>Ajustes</th>
              <th>Costo var.</th>
              <th>Documento</th>
              <th>Cierre</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const session = (r.session as Record<string, unknown>) ?? {};
              return (
                <tr key={String(r.id)}>
                  <td>{String(r.actKey)}</td>
                  <td>
                    <Link to={`/inventario/conteos/${encodeURIComponent(String(session.countKey ?? ''))}`}>
                      {String(session.countKey ?? '—')}
                    </Link>
                  </td>
                  <td>{String(r.linesCounted)}</td>
                  <td>{String(r.variancesFound)}</td>
                  <td>{String(r.adjustmentsPosted)}</td>
                  <td>{String(r.totalVarianceCost)}</td>
                  <td>{String(r.documentKey ?? '—')}</td>
                  <td>{String(r.closedAt).slice(0, 19)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
