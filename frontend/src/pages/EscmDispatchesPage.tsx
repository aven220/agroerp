import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listEscmDispatches, shipEscmDispatch } from '../api/escm';

export function EscmDispatchesPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [status, setStatus] = useState('');
  const reload = () => listEscmDispatches(status ? { status } : undefined).then((r) => setRows(r as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, [status]);

  return (
    <>
      <Header title="Panel de despachos" subtitle="Preparación, packing y salida" actions={<Link to="/comercial/logistica" className="btn">Centro logístico</Link>} />
      <section className="panel">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="draft">Borrador</option>
          <option value="picking">Picking</option>
          <option value="packing">Packing</option>
          <option value="ready">Listo</option>
          <option value="in_transit">En tránsito</option>
          <option value="delivered">Entregado</option>
        </select>
      </section>
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Despacho</th><th>Pedido</th><th>Cliente</th><th>Estado</th><th>Tipo</th><th>Acciones</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.dispatchKey)}>
                <td><Link to={`/comercial/despachos/${encodeURIComponent(String(r.dispatchKey))}`}>{String(r.dispatchKey)}</Link></td>
                <td>{String(r.orderKey)}</td>
                <td>{String(r.customerKey)}</td>
                <td>{String(r.status)}</td>
                <td>{String(r.dispatchType)}</td>
                <td>
                  {['ready', 'packing', 'scheduled'].includes(String(r.status)) ? (
                    <button className="btn-link" onClick={() => shipEscmDispatch(String(r.dispatchKey)).then(reload)}>Despachar</button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
