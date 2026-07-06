import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  cancelEscmOrder,
  createEscmOrder,
  getEscmOrderCenter,
  listEscmCustomers,
  listEscmOrders,
  submitEscmOrder,
} from '../api/escm';

export function EscmOrdersPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const [customers, setCustomers] = useState<Array<Record<string, unknown>>>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({ customerKey: '', itemKey: 'CAF-PERG-001', quantity: 10, unitPrice: 5000 });

  const reload = () => {
    listEscmOrders(statusFilter ? { status: statusFilter } : undefined).then((r) =>
      setRows(r as Array<Record<string, unknown>>),
    );
    getEscmOrderCenter().then(setCenter);
  };

  useEffect(() => {
    reload();
    listEscmCustomers().then((r) => setCustomers(r as Array<Record<string, unknown>>));
  }, [statusFilter]);

  const byStatus = (center?.byStatus ?? {}) as Record<string, number>;

  return (
    <>
      <Header
        title="Centro de pedidos"
        subtitle="Creación, validación, reservas y seguimiento"
        actions={
          <>
            <Link to="/comercial/aprobaciones" className="btn">Aprobaciones</Link>
            <Link to="/comercial/reservas" className="btn">Reservas</Link>
          </>
        }
      />
      <section className="panel" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {Object.entries(byStatus).map(([k, v]) => (
          <div key={k}><strong>{k}</strong>: {v}</div>
        ))}
        <div><strong>Pendientes aprobación</strong>: {Number(center?.pendingApprovals ?? 0)}</div>
        <div><strong>Pipeline</strong>: {Number(center?.pipelineValue ?? 0).toLocaleString()}</div>
      </section>
      <section className="panel">
        <h3>Nuevo pedido</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={form.customerKey} onChange={(e) => setForm({ ...form, customerKey: e.target.value })}>
            <option value="">Cliente</option>
            {customers.map((c) => (
              <option key={String(c.customerKey)} value={String(c.customerKey)}>{String(c.legalName)}</option>
            ))}
          </select>
          <input placeholder="itemKey" value={form.itemKey} onChange={(e) => setForm({ ...form, itemKey: e.target.value })} />
          <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
          <input type="number" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })} />
          <button
            className="btn"
            onClick={() =>
              createEscmOrder({
                customerKey: form.customerKey,
                lines: [{ itemKey: form.itemKey, quantity: form.quantity, unitPrice: form.unitPrice, taxKey: 'iva_19' }],
                submit: true,
              }).then(reload)
            }
          >
            Crear y enviar
          </button>
        </div>
      </section>
      <section className="panel">
        <div style={{ marginBottom: 8 }}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="pending_approval">Pendiente aprobación</option>
            <option value="approved">Aprobado</option>
            <option value="reserved">Reservado</option>
            <option value="in_preparation">En preparación</option>
            <option value="ready_for_dispatch">Listo despacho</option>
            <option value="dispatched">Despachado</option>
            <option value="delivered">Entregado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Pedido</th><th>Cliente</th><th>Tipo</th><th>Estado</th><th>Total</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.orderKey)}>
                <td><Link to={`/comercial/pedidos/${encodeURIComponent(String(r.orderKey))}`}>{String(r.orderKey)}</Link></td>
                <td>{String((r.customer as { legalName?: string })?.legalName ?? r.customerKey)}</td>
                <td>{String(r.orderType ?? 'standard')}</td>
                <td>{String(r.status)}</td>
                <td>{Number(r.totalAmount ?? 0).toLocaleString()}</td>
                <td>
                  {r.status === 'draft' ? (
                    <button className="btn-link" onClick={() => submitEscmOrder(String(r.orderKey)).then(reload)}>Enviar</button>
                  ) : null}
                  {r.status !== 'cancelled' && r.status !== 'delivered' ? (
                    <>
                      {' · '}
                      <button className="btn-link" onClick={() => cancelEscmOrder(String(r.orderKey), 'Cancelado desde centro').then(reload)}>Cancelar</button>
                    </>
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
