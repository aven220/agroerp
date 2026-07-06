import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listEscmReservations } from '../api/escm';

export function EscmReservationsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [customerKey, setCustomerKey] = useState('');

  useEffect(() => {
    listEscmReservations(customerKey ? { customerKey } : undefined).then((r) =>
      setRows(r as Array<Record<string, unknown>>),
    );
  }, [customerKey]);

  return (
    <>
      <Header title="Gestor de reservas" subtitle="Reservas EIMS vinculadas a pedidos" actions={<Link to="/comercial/pedidos" className="btn">Pedidos</Link>} />
      <section className="panel">
        <input placeholder="Filtrar por customerKey" value={customerKey} onChange={(e) => setCustomerKey(e.target.value)} />
      </section>
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Reserva</th><th>Artículo</th><th>Bodega</th><th>Cantidad</th><th>Documento</th><th>Estado</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.reservationKey)}>
                <td>{String(r.reservationKey)}</td>
                <td>{String(r.itemKey)}</td>
                <td>{String(r.warehouseKey)}</td>
                <td>{Number(r.quantity)}</td>
                <td>
                  {r.documentKey ? (
                    <Link to={`/comercial/pedidos/${encodeURIComponent(String(r.documentKey))}`}>{String(r.documentKey)}</Link>
                  ) : '—'}
                </td>
                <td>{String(r.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
