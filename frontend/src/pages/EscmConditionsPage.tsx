import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listEscmConditions, upsertEscmCondition } from '../api/escm';

export function EscmConditionsPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [form, setForm] = useState({
    name: '',
    customerKey: '',
    priceListKey: '',
    paymentTermKey: '',
    deliveryMethodKey: '',
    incotermKey: '',
    discountPct: 0,
    specialTerms: '',
  });

  const reload = () => listEscmConditions().then((r) => setRows(r as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Condiciones comerciales" subtitle="Pago, entrega, incoterms y términos especiales" actions={<Link to="/comercial" className="btn">ESCM</Link>} />
      <section className="panel">
        <h3>Nueva condición</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Cliente (opcional)" value={form.customerKey} onChange={(e) => setForm({ ...form, customerKey: e.target.value })} />
          <input placeholder="Lista precios" value={form.priceListKey} onChange={(e) => setForm({ ...form, priceListKey: e.target.value })} />
          <input placeholder="Condición pago" value={form.paymentTermKey} onChange={(e) => setForm({ ...form, paymentTermKey: e.target.value })} />
          <input placeholder="Entrega" value={form.deliveryMethodKey} onChange={(e) => setForm({ ...form, deliveryMethodKey: e.target.value })} />
          <input placeholder="Incoterm" value={form.incotermKey} onChange={(e) => setForm({ ...form, incotermKey: e.target.value })} />
          <input type="number" placeholder="Descuento %" value={form.discountPct} onChange={(e) => setForm({ ...form, discountPct: Number(e.target.value) })} />
          <input placeholder="Términos especiales" value={form.specialTerms} onChange={(e) => setForm({ ...form, specialTerms: e.target.value })} />
          <button className="btn" onClick={() => upsertEscmCondition(form).then(reload)}>Guardar</button>
        </div>
      </section>
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Nombre</th><th>Cliente</th><th>Pago</th><th>Entrega</th><th>Desc %</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.conditionKey)}>
                <td>{String(r.conditionKey)}</td>
                <td>{String(r.name)}</td>
                <td>{String(r.customerKey ?? '—')}</td>
                <td>{String(r.paymentTermKey ?? '—')}</td>
                <td>{String(r.deliveryMethodKey ?? '—')}</td>
                <td>{String(r.discountPct ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
