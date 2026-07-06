import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { createAiPrompt, listAiPrompts } from '../api/ai';

export function AiPromptsPage() {
  const [prompts, setPrompts] = useState<Array<Record<string, unknown>>>([]);
  const [form, setForm] = useState({ promptKey: '', name: '', template: '', serviceType: 'chat' });

  useEffect(() => { listAiPrompts().then((p) => setPrompts(p as Array<Record<string, unknown>>)); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createAiPrompt(form);
    listAiPrompts().then((p) => setPrompts(p as Array<Record<string, unknown>>));
  }

  return (
    <>
      <Header title="Administrador de Prompts" subtitle="Versionado · pruebas · aprobaciones" actions={<Link to="/ia" className="btn">Centro IA</Link>} />

      <form className="panel form-panel" onSubmit={handleCreate}>
        <div className="form-row">
          <label>Clave<input required value={form.promptKey} onChange={(e) => setForm({ ...form, promptKey: e.target.value })} /></label>
          <label>Nombre<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Servicio
            <select value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })}>
              {['chat', 'summarization', 'classification', 'extraction', 'recommendation', 'explanation'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        <label>Plantilla<textarea required rows={4} value={form.template} onChange={(e) => setForm({ ...form, template: e.target.value })} /></label>
        <button type="submit" className="btn btn-primary">Crear prompt</button>
      </form>

      <table className="data-table">
        <thead><tr><th>Nombre</th><th>Clave</th><th>Servicio</th><th>Estado</th><th>Versión</th></tr></thead>
        <tbody>
          {prompts.map((p) => (
            <tr key={String(p.id)}>
              <td>{String(p.name)}</td>
              <td>{String(p.promptKey)}</td>
              <td>{String(p.serviceType)}</td>
              <td>{String(p.status)}</td>
              <td>{(p.versions as Array<{ version: number }>)?.[0]?.version ?? 1}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
