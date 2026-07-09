import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  createEscmCustomer,
  listEscmCustomers,
  updateEscmCustomer,
} from '../api/escm';

const CUSTOMER_TYPES = [
  'individual', 'company', 'cooperative', 'exporter', 'distributor',
  'wholesaler', 'retailer', 'international',
];
const STATUSES = ['prospect', 'active', 'inactive', 'suspended', 'blocked'];

export function EscmCustomersPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [status, setStatus] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [q, setQ] = useState('');
  const [form, setForm] = useState({
    customerType: 'company',
    legalName: '',
    commercialName: '',
    status: 'prospect',
    segmentKey: '',
    channelKey: '',
    countryCode: 'CO',
  });
  const [error, setError] = useState('');

  const reload = () => listEscmCustomers({
    status: status || undefined,
    customerType: customerType || undefined,
    q: q || undefined,
  }).then((r) => setRows(r as Array<Record<string, unknown>>)).catch((e) => setError(e.message));

  useEffect(() => { reload(); }, [status, customerType]);

  return (
    <>
      <Header
        title="Clientes comerciales"
        subtitle="Individuales, empresas, cooperativas, exportadores y más"
        actions={<Link to="/comercial" className="btn">Comercial</Link>}
      />
      {error ? <section className="panel error-panel">{error}</section> : null}
      <section className="panel">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos los estados</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={customerType} onChange={(e) => setCustomerType(e.target.value)}>
            <option value="">Todos los tipos</option>
            {CUSTOMER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn" onClick={reload}>Buscar</button>
        </div>
      </section>
      <section className="panel">
        <h3>Nuevo cliente</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={form.customerType} onChange={(e) => setForm({ ...form, customerType: e.target.value })}>
            {CUSTOMER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input placeholder="Nombre legal" value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} />
          <input placeholder="Nombre comercial" value={form.commercialName} onChange={(e) => setForm({ ...form, commercialName: e.target.value })} />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input placeholder="Segmento" value={form.segmentKey} onChange={(e) => setForm({ ...form, segmentKey: e.target.value })} />
          <input placeholder="Canal" value={form.channelKey} onChange={(e) => setForm({ ...form, channelKey: e.target.value })} />
          <button className="btn" onClick={() => createEscmCustomer(form).then(reload).catch((e) => setError(e.message))}>
            Crear
          </button>
        </div>
      </section>
      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Clave</th><th>Nombre</th><th>Tipo</th><th>Estado</th><th>Clasificación</th><th>País</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.customerKey)}>
                <td>{String(r.customerKey)}</td>
                <td>{String(r.legalName)}</td>
                <td>{String(r.customerType)}</td>
                <td>{String(r.status)}</td>
                <td>{String(r.classification ?? '—')}</td>
                <td>{String(r.countryCode ?? '—')}</td>
                <td>
                  <Link to={`/comercial/crm?customerKey=${encodeURIComponent(String(r.customerKey))}`}>CRM</Link>
                  {' · '}
                  <button
                    className="btn-link"
                    onClick={() => updateEscmCustomer(String(r.customerKey), { status: 'active' }).then(reload)}
                  >
                    Activar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
