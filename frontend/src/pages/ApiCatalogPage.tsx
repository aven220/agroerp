import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { createApiDefinition, listApiCatalog, listApiDiscovery, publishApi } from '../api/apim';

interface ApiRow {
  id: string;
  apiKey: string;
  name: string;
  domain: string;
  status: string;
  tags: string[];
}

export function ApiCatalogPage() {
  const [apis, setApis] = useState<ApiRow[]>([]);
  const [modules, setModules] = useState<Array<{ moduleRef: string; name: string }>>([]);
  const [form, setForm] = useState({ apiKey: '', name: '', domain: 'prm', basePath: '/gateway/v1', moduleRef: 'prm' });

  function reload() {
    listApiCatalog().then((r) => setApis(r as ApiRow[]));
    listApiDiscovery().then(setModules);
  }

  useEffect(() => { reload(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createApiDefinition(form);
    reload();
  }

  return (
    <>
      <Header title="Catálogo de APIs" subtitle="Registro · publicación · dominios" actions={<Link to="/apis" className="btn">Centro APIs</Link>} />

      <form className="panel form-panel" onSubmit={handleCreate}>
        <div className="form-row">
          <label>Clave<input required value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} /></label>
          <label>Nombre<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Módulo
            <select value={form.moduleRef} onChange={(e) => setForm({ ...form, moduleRef: e.target.value, domain: e.target.value })}>
              {modules.map((m) => <option key={m.moduleRef} value={m.moduleRef}>{m.name}</option>)}
            </select>
          </label>
        </div>
        <button type="submit" className="btn btn-primary">Registrar API</button>
      </form>

      <table className="data-table">
        <thead><tr><th>Nombre</th><th>Clave</th><th>Dominio</th><th>Estado</th><th>Tags</th><th></th></tr></thead>
        <tbody>
          {apis.map((a) => (
            <tr key={a.id}>
              <td>{a.name}</td>
              <td>{a.apiKey}</td>
              <td>{a.domain}</td>
              <td>{a.status}</td>
              <td>{a.tags?.join(', ')}</td>
              <td>
                {a.status !== 'published' && (
                  <button type="button" className="btn btn-sm" onClick={() => publishApi(a.id).then(reload)}>Publicar</button>
                )}
                <Link to={`/apis/versiones?api=${a.id}`} className="btn btn-sm">Versiones</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
