import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  approveEscmQuotation,
  convertEscmQuotation,
  createEscmQuotation,
  duplicateEscmQuotation,
  listEscmCustomers,
  listEscmQuotations,
  simulateEscmQuotation,
} from '../api/escm';

export function EscmQuotationsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [customers, setCustomers] = useState<Array<Record<string, unknown>>>([]);
  const [form, setForm] = useState({ customerKey: '', itemKey: 'CAF-PERG-001', quantity: 10, unitPrice: 0 });
  const [simulation, setSimulation] = useState<Record<string, unknown> | null>(null);

  const reload = () => listEscmQuotations().then((r) => setRows(r as Array<Record<string, unknown>>));
  useEffect(() => {
    reload();
    listEscmCustomers().then((r) => setCustomers(r as Array<Record<string, unknown>>));
  }, []);

  return (
    <>
      <Header title="Centro de cotizaciones" subtitle="Crear, versionar y convertir a pedido" actions={<Link to="/comercial/crm" className="btn">CRM</Link>} />
      <section className="panel">
        <h3>Nueva cotización</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={form.customerKey} onChange={(e) => setForm({ ...form, customerKey: e.target.value })}>
            <option value="">Cliente</option>
            {customers.map((c) => <option key={String(c.customerKey)} value={String(c.customerKey)}>{String(c.legalName)}</option>)}
          </select>
          <input placeholder="Código del artículo" value={form.itemKey} onChange={(e) => setForm({ ...form, itemKey: e.target.value })} />
          <input type="number" placeholder="Cantidad" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
          <button
            className="btn"
            onClick={() => simulateEscmQuotation({
              customerKey: form.customerKey,
              lines: [{ itemKey: form.itemKey, quantity: form.quantity, taxKey: 'iva_19' }],
            }).then(setSimulation)}
          >
            Simular
          </button>
          <button
            className="btn"
            onClick={() => createEscmQuotation({
              customerKey: form.customerKey,
              lines: [{ itemKey: form.itemKey, quantity: form.quantity, taxKey: 'iva_19' }],
            }).then(reload)}
          >
            Crear
          </button>
        </div>
        {simulation ? <pre style={{ marginTop: 8 }}>{JSON.stringify(simulation.totals, null, 2)}</pre> : null}
      </section>
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Cliente</th><th>Versión</th><th>Estado</th><th>Total</th><th>Acciones</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.quotationKey)}>
                <td><Link to={`/comercial/cotizaciones/${encodeURIComponent(String(r.quotationKey))}`}>{String(r.quotationKey)}</Link></td>
                <td>{String(r.customerKey)}</td>
                <td>{String(r.version)}</td>
                <td>{String(r.status)}</td>
                <td>{Number(r.totalAmount ?? 0).toLocaleString()}</td>
                <td>
                  <button className="btn-link" onClick={() => duplicateEscmQuotation(String(r.quotationKey)).then(reload)}>Duplicar</button>
                  {' · '}
                  <button className="btn-link" onClick={() => approveEscmQuotation(String(r.quotationKey)).then(reload)}>Aprobar</button>
                  {' · '}
                  <button className="btn-link" onClick={() => convertEscmQuotation(String(r.quotationKey)).then(() => navigate('/comercial/pedidos'))}>→ Pedido</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
