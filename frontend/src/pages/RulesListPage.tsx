import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { LoadingState } from '../components/ux/LoadingState';
import {
  cloneBreRule,
  createBreRule,
  exportBreRule,
  importBreRule,
  listBreRules,
  publishBreRule,
  unpublishBreRule,
  type BreRule,
} from '../api/bre';

const EVENT_OPTIONS = [
  'ProducerCreated', 'FarmCreated', 'FieldLotRegistered',
  'FormSubmitted', 'WorkflowCompleted', 'GeofenceViolation',
  'AuthLoggedIn', 'AccessDenied', 'HarvestRecorded',
];

export function RulesListPage() {
  const [rules, setRules] = useState<BreRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    ruleKey: '',
    name: '',
    eventTypes: ['ProducerCreated'] as string[],
    eventCategory: 'producer',
    priority: 100,
    conditions: { all: [{ type: 'condition', field: 'payload.status', operator: 'eq', value: 'active' }] },
    actions: [{ type: 'send_notification', config: { title: 'Regla EBRE', severity: 'info' } }],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try { setRules(await listBreRules()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    await createBreRule(form);
    setShowForm(false);
    load();
  }

  return (
    <>
      <Header
        title="Administrador de reglas"
        subtitle="EBRE — Catálogo empresarial"
        actions={
          <div className="row-actions">
            <Link to="/reglas" className="btn">Centro</Link>
            <Link to="/reglas/disenar" className="btn">Diseñador</Link>
            <button type="button" className="btn btn-primary" onClick={() => setShowForm(!showForm)}>+ Nueva regla</button>
          </div>
        }
      />
      {showForm && (
        <div className="panel form-row">
          <input placeholder="rule_key" value={form.ruleKey} onChange={(e) => setForm({ ...form, ruleKey: e.target.value })} />
          <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select value={form.eventCategory} onChange={(e) => setForm({ ...form, eventCategory: e.target.value })}>
            <option value="producer">Productores</option>
            <option value="farm">Fincas</option>
            <option value="lot">Lotes</option>
            <option value="workflow">Workflow</option>
            <option value="gis">GIS</option>
            <option value="security">Seguridad</option>
          </select>
          <select value={form.eventTypes[0]} onChange={(e) => setForm({ ...form, eventTypes: [e.target.value] })}>
            {EVENT_OPTIONS.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
          </select>
          <button type="button" className="btn btn-primary" onClick={handleCreate}>Crear</button>
        </div>
      )}
      {loading ? <LoadingState variant="table" message="Cargando..." /> : (
        <section className="panel">
          <table className="data-table">
            <thead>
              <tr><th>Clave</th><th>Nombre</th><th>Estado</th><th>Eventos</th><th>Prioridad</th><th>v</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td><code>{r.ruleKey}</code></td>
                  <td>{r.name}</td>
                  <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                  <td>{r.eventTypes.join(', ')}</td>
                  <td>{r.priority}</td>
                  <td>{r.version}</td>
                  <td className="row-actions">
                    {r.status !== 'published' && (
                      <button type="button" className="btn btn-sm" onClick={() => publishBreRule(r.id).then(load)}>Publicar</button>
                    )}
                    {r.status === 'published' && (
                      <button type="button" className="btn btn-sm" onClick={() => unpublishBreRule(r.id).then(load)}>Despublicar</button>
                    )}
                    <button type="button" className="btn btn-sm" onClick={() => cloneBreRule(r.id, `${r.ruleKey}_copy`, `${r.name} (copia)`).then(load)}>Clonar</button>
                    <button type="button" className="btn btn-sm" onClick={() => exportBreRule(r.id).then((d) => {
                      const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = `${r.ruleKey}.json`;
                      a.click();
                    })}>Exportar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
