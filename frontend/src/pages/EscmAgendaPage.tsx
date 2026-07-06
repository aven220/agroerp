import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { completeEscmActivity, createEscmActivity, listEscmActivities, listEscmCustomers } from '../api/escm';

export function EscmAgendaPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [customers, setCustomers] = useState<Array<Record<string, unknown>>>([]);
  const [form, setForm] = useState({
    activityType: 'task',
    subject: '',
    dueAt: '',
    customerKey: '',
  });

  const reload = () => listEscmActivities().then((r) => setRows(r as Array<Record<string, unknown>>));
  useEffect(() => {
    reload();
    listEscmCustomers().then((r) => setCustomers(r as Array<Record<string, unknown>>));
  }, []);

  return (
    <>
      <Header title="Agenda comercial" subtitle="Tareas, recordatorios y seguimientos" actions={<Link to="/comercial/crm" className="btn">CRM</Link>} />
      <section className="panel">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={form.activityType} onChange={(e) => setForm({ ...form, activityType: e.target.value })}>
            {['task', 'call', 'email', 'meeting', 'reminder', 'follow_up'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input placeholder="Asunto" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <input type="datetime-local" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
          <select value={form.customerKey} onChange={(e) => setForm({ ...form, customerKey: e.target.value })}>
            <option value="">Cliente</option>
            {customers.map((c) => <option key={String(c.customerKey)} value={String(c.customerKey)}>{String(c.legalName)}</option>)}
          </select>
          <button className="btn" onClick={() => createEscmActivity({ ...form, dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined }).then(reload)}>Agregar</button>
        </div>
      </section>
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Tipo</th><th>Asunto</th><th>Estado</th><th>Vence</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.activityKey)}>
                <td>{String(r.activityType)}</td>
                <td>{String(r.subject)}</td>
                <td>{String(r.status)}</td>
                <td>{r.dueAt ? new Date(String(r.dueAt)).toLocaleString() : '—'}</td>
                <td>
                  {r.status !== 'completed' ? (
                    <button className="btn-link" onClick={() => completeEscmActivity(String(r.activityKey)).then(reload)}>Completar</button>
                  ) : '✓'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
