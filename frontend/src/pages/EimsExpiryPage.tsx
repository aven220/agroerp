import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { blockExpiredEimsLots, listEimsExpiryPanel } from '../api/eims';

export function EimsExpiryPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');

  const reload = () =>
    listEimsExpiryPanel()
      .then((r) => setRows(r as Array<Record<string, unknown>>))
      .catch((e) => setError(e.message));

  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header
        title="Panel de vencimientos"
        subtitle="Producción, ingreso, vida útil y bloqueo por vencimiento"
        actions={
          <>
            <button
              className="btn"
              onClick={() => blockExpiredEimsLots().then(reload).catch((e) => setError(e.message))}
            >
              Bloquear vencidos
            </button>
            <Link to="/inventario/lotes/alertas" className="btn">Alertas</Link>
            <Link to="/inventario/lotes" className="btn">Lotes</Link>
          </>
        }
      />
      {error ? <section className="panel error-panel">{error}</section> : null}
      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Lote</th>
              <th>Artículo</th>
              <th>Bodega</th>
              <th>Disponible</th>
              <th>Producción</th>
              <th>Ingreso</th>
              <th>Vence</th>
              <th>Vida útil</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)}>
                <td>{String(r.lotKey)}</td>
                <td>{String((r.item as Record<string, unknown>)?.itemKey ?? '')}</td>
                <td>{String((r.warehouse as Record<string, unknown>)?.warehouseKey ?? '')}</td>
                <td>{String(r.onHandQty)}</td>
                <td>{r.productionDate ? String(r.productionDate).slice(0, 10) : '—'}</td>
                <td>{r.receivedDate ? String(r.receivedDate).slice(0, 10) : '—'}</td>
                <td>{r.expiryDate ? String(r.expiryDate).slice(0, 10) : '—'}</td>
                <td>{String(r.shelfLifeDays ?? '—')}</td>
                <td>{String(r.status)}</td>
                <td><Link to={`/inventario/lotes/${encodeURIComponent(String(r.lotKey))}`}>360°</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
