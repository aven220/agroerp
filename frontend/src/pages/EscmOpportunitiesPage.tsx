import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { createEscmOpportunity, listEscmCustomers, listEscmOpportunities } from '../api/escm';

export function EscmOpportunitiesPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [customers, setCustomers] = useState<Array<Record<string, unknown>>>([]);
  const [form, setForm] = useState({ title: '', customerKey: '', estimatedValue: 0, stageKey: 'prospect' });

  const reload = () => listEscmOpportunities().then((r) => setRows(r as Array<Record<string, unknown>>));
  useEffect(() => {
    reload();
    listEscmCustomers().then((r) => setCustomers(r as Array<Record<string, unknown>>));
  }, []);

  return (
    <>
      <Header title="Oportunidades" subtitle="Registro y seguimiento comercial" actions={<Link to="/comercial/pipeline" className="btn">Pipeline</Link>} />
      <section className="panel">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select value={form.customerKey} onChange={(e) => setForm({ ...form, customerKey: e.target.value })}>
            <option value="">Cliente</option>
            {customers.map((c) => <option key={String(c.customerKey)} value={String(c.customerKey)}>{String(c.legalName)}</option>)}
          </select>
          <input type="number" placeholder="Valor" value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: Number(e.target.value) })} />
          <button className="btn" onClick={() => createEscmOpportunity(form).then(reload)}>Crear</button>
        </div>
      </section>
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Título</th><th>Etapa</th><th>Valor</th><th>Prob.</th><th>Estado</th><th>Cierre est.</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.opportunityKey)}>
                <td>{String(r.opportunityKey)}</td>
                <td>{String(r.title)}</td>
                <td>{String(r.stageKey)}</td>
                <td>{Number(r.estimatedValue ?? 0).toLocaleString()}</td>
                <td>{String(r.probability)}%</td>
                <td>{String(r.status)}</td>
                <td>{r.expectedCloseDate ? new Date(String(r.expectedCloseDate)).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
