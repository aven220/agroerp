import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { approveEscmOrder, listEscmPendingApprovals, rejectEscmOrder } from '../api/escm';

export function EscmApprovalsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const reload = () => listEscmPendingApprovals().then((r) => setRows(r as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Panel de aprobaciones" subtitle="Pedidos pendientes de autorización" actions={<Link to="/comercial/pedidos" className="btn">Pedidos</Link>} />
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Aprobación</th><th>Pedido</th><th>Nivel</th><th>Cliente</th><th>Trigger</th><th>Acciones</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const order = (r.order ?? {}) as Record<string, unknown>;
              const customer = (order.customer ?? {}) as Record<string, unknown>;
              return (
                <tr key={String(r.approvalKey)}>
                  <td>{String(r.approvalKey)}</td>
                  <td><Link to={`/comercial/pedidos/${encodeURIComponent(String(r.orderKey))}`}>{String(r.orderKey)}</Link></td>
                  <td>{String(r.level)}</td>
                  <td>{String(customer.legalName ?? order.customerKey)}</td>
                  <td>{String(r.triggerType)}</td>
                  <td>
                    <button className="btn-link" onClick={() => approveEscmOrder(String(r.approvalKey), 'Aprobado').then(reload)}>Aprobar</button>
                    {' · '}
                    <button className="btn-link" onClick={() => rejectEscmOrder(String(r.approvalKey), 'Rechazado').then(reload)}>Rechazar</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
