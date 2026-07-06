import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listEimsSupplyCalendar } from '../api/eims';

export function EimsSupplyCalendarPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    listEimsSupplyCalendar()
      .then((r) => setRows(r as Array<Record<string, unknown>>))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <Header
        title="Calendario de abastecimiento"
        subtitle="Compras, traslados y reposiciones programadas"
        actions={<Link to="/inventario/abastecimiento" className="btn">Centro</Link>}
      />
      {error ? <section className="panel error-panel">{error}</section> : null}
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Fecha</th><th>Título</th><th>Tipo</th><th>Artículo</th><th>Bodega</th><th>Cantidad</th><th>Estado</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)}>
                <td>{String(r.scheduledAt).slice(0, 16).replace('T', ' ')}</td>
                <td>{String(r.title)}</td>
                <td>{String(r.eventType)}</td>
                <td>{String(r.itemKey ?? '—')}</td>
                <td>{String(r.warehouseKey ?? '—')}</td>
                <td>{String(r.quantity ?? '—')}</td>
                <td>{String(r.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
