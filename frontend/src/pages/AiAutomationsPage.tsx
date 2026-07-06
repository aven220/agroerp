import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { createAiAutomation, listAiAutomations } from '../api/ai';

interface AutomationRule {
  id: string;
  ruleKey: string;
  name: string;
  description?: string | null;
  triggerType: string;
  eventTypes: string[];
  serviceType: string;
  isActive: boolean;
}

export function AiAutomationsPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [form, setForm] = useState({
    ruleKey: '',
    name: '',
    description: '',
    triggerType: 'domain_event',
    eventTypes: 'lot.created',
    serviceType: 'explanation',
  });

  function reload() {
    listAiAutomations().then((r) => setRules(r as AutomationRule[]));
  }

  useEffect(() => { reload(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createAiAutomation({
      ruleKey: form.ruleKey,
      name: form.name,
      description: form.description || undefined,
      triggerType: form.triggerType,
      eventTypes: form.eventTypes.split(',').map((s) => s.trim()).filter(Boolean),
      serviceType: form.serviceType,
      actions: [{ type: 'alert', title: `IA: ${form.name}`, severity: 'info' }],
    });
    setForm({ ruleKey: '', name: '', description: '', triggerType: 'domain_event', eventTypes: 'lot.created', serviceType: 'explanation' });
    reload();
  }

  return (
    <>
      <Header
        title="Automatizaciones IA"
        subtitle="Eventos ERP → acciones inteligentes"
        actions={<Link to="/ia" className="btn">Centro IA</Link>}
      />

      <form className="panel form-panel" onSubmit={handleCreate}>
        <div className="form-row">
          <label>Clave<input required value={form.ruleKey} onChange={(e) => setForm({ ...form, ruleKey: e.target.value })} /></label>
          <label>Nombre<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Servicio
            <select value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })}>
              {['explanation', 'classification', 'summarization', 'recommendation', 'anomaly_detection'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        <label>Eventos (coma)<input required value={form.eventTypes} onChange={(e) => setForm({ ...form, eventTypes: e.target.value })} /></label>
        <label>Descripción<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <button type="submit" className="btn btn-primary">Crear automatización</button>
      </form>

      <table className="data-table">
        <thead>
          <tr><th>Nombre</th><th>Clave</th><th>Eventos</th><th>Servicio</th><th>Estado</th></tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>{r.ruleKey}</td>
              <td>{r.eventTypes.join(', ')}</td>
              <td>{r.serviceType}</td>
              <td>{r.isActive ? 'Activa' : 'Inactiva'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
