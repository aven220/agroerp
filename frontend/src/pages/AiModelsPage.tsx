import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { createAiProvider, listAiModels, listAiProviders } from '../api/ai';

export function AiModelsPage() {
  const [providers, setProviders] = useState<Array<Record<string, unknown>>>([]);
  const [models, setModels] = useState<Array<Record<string, unknown>>>([]);
  const [form, setForm] = useState({ providerKey: '', providerType: 'openai', name: '', baseUrl: '', apiKeyRef: '' });

  const load = () => Promise.all([listAiProviders(), listAiModels()]).then(([p, m]) => {
    setProviders(p as Array<Record<string, unknown>>);
    setModels(m as Array<Record<string, unknown>>);
  });
  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createAiProvider(form);
    setForm({ providerKey: '', providerType: 'openai', name: '', baseUrl: '', apiKeyRef: '' });
    load();
  }

  return (
    <>
      <Header title="Administrador de Modelos" subtitle="Proveedores y enrutamiento IA" actions={<Link to="/ia" className="btn">Centro IA</Link>} />

      <form className="panel form-panel" onSubmit={handleCreate}>
        <h3>Nuevo proveedor</h3>
        <div className="form-row">
          <label>Clave<input required value={form.providerKey} onChange={(e) => setForm({ ...form, providerKey: e.target.value })} /></label>
          <label>Tipo
            <select value={form.providerType} onChange={(e) => setForm({ ...form, providerType: e.target.value })}>
              {['openai', 'google', 'anthropic', 'meta', 'mistral', 'deepseek', 'ollama', 'custom'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>Nombre<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Base URL<input value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} /></label>
          <label>API Key env<input value={form.apiKeyRef} onChange={(e) => setForm({ ...form, apiKeyRef: e.target.value })} placeholder="OPENAI_API_KEY" /></label>
        </div>
        <button type="submit" className="btn btn-primary">Registrar proveedor</button>
      </form>

      <div className="split-layout">
        <section className="panel">
          <h3>Proveedores</h3>
          <table className="data-table">
            <thead><tr><th>Nombre</th><th>Tipo</th><th>Default</th><th>Activo</th></tr></thead>
            <tbody>
              {providers.map((p) => (
                <tr key={String(p.id)}>
                  <td>{String(p.name)}</td>
                  <td>{String(p.providerType)}</td>
                  <td>{p.isDefault ? 'Sí' : 'No'}</td>
                  <td>{p.isActive ? 'Sí' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <h3>Modelos</h3>
          <table className="data-table">
            <thead><tr><th>Modelo</th><th>Display</th><th>Default</th></tr></thead>
            <tbody>
              {models.map((m) => (
                <tr key={String(m.id)}>
                  <td>{String(m.modelKey)}</td>
                  <td>{String(m.displayName)}</td>
                  <td>{m.isDefault ? 'Sí' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
