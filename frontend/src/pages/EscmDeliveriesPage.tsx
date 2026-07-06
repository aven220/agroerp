import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listEscmDeliveries } from '../api/escm';

export function EscmDeliveriesPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    listEscmDeliveries().then((r) => setRows(r as Array<Record<string, unknown>>));
  }, []);

  return (
    <>
      <Header title="Historial de entregas" subtitle="Entregas completas, parciales y rechazos" actions={<Link to="/comercial/logistica" className="btn">Centro logístico</Link>} />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Entrega</th><th>Despacho</th><th>Pedido</th><th>Resultado</th><th>Fecha</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.deliveryKey)}>
                <td>{String(r.deliveryKey)}</td>
                <td>{String((r.dispatch as { dispatchKey?: string })?.dispatchKey ?? '—')}</td>
                <td>{String(r.orderKey)}</td>
                <td>{String(r.outcome)}</td>
                <td>{r.deliveredAt ? new Date(String(r.deliveredAt)).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
