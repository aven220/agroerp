import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { createApiClient, createApiKey, listApiClients } from '../api/apim';

interface ClientRow {
  id: string;
  clientKey: string;
  name: string;
  status: string;
  scopes: string[];
  rateLimitPerMinute: number;
  keys?: Array<{ keyPrefix: string; name: string }>;
}

export function ApiClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [form, setForm] = useState({ clientKey: '', name: '', scopes: 'prm:read' });
  const [newKey, setNewKey] = useState<string | null>(null);

  function reload() {
    listApiClients().then((r) => setClients(r as ClientRow[]));
  }

  useEffect(() => { reload(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createApiClient({
      ...form,
      scopes: form.scopes.split(',').map((s) => s.trim()).filter(Boolean),
    });
    setForm({ clientKey: '', name: '', scopes: 'prm:read' });
    reload();
  }

  async function generateKey(clientId: string) {
    const res = await createApiKey(clientId, 'Clave generada');
    setNewKey(res.apiKey);
    reload();
  }

  return (
    <>
      <Header title="Administrador de Clientes API" subtitle="OAuth2 · API Keys · rate limits" actions={<Link to="/apis" className="btn">Centro APIs</Link>} />

      {newKey && (
        <div className="panel alert-success">
          <strong>API Key generada (copiar ahora):</strong> <code>{newKey}</code>
          <button type="button" className="btn btn-sm" onClick={() => setNewKey(null)}>Cerrar</button>
        </div>
      )}

      <form className="panel form-panel" onSubmit={handleCreate}>
        <div className="form-row">
          <label>Clave<input required value={form.clientKey} onChange={(e) => setForm({ ...form, clientKey: e.target.value })} /></label>
          <label>Nombre<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Scopes<input value={form.scopes} onChange={(e) => setForm({ ...form, scopes: e.target.value })} /></label>
        </div>
        <button type="submit" className="btn btn-primary">Crear cliente</button>
      </form>

      <table className="data-table">
        <thead><tr><th>Nombre</th><th>Clave</th><th>Estado</th><th>Rate/min</th><th>Scopes</th><th>Keys</th><th></th></tr></thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.clientKey}</td>
              <td>{c.status}</td>
              <td>{c.rateLimitPerMinute}</td>
              <td>{c.scopes.join(', ')}</td>
              <td>{c.keys?.map((k) => k.keyPrefix).join(', ')}</td>
              <td><button type="button" className="btn btn-sm" onClick={() => generateKey(c.id)}>Generar key</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
