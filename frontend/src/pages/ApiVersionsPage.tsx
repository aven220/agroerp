import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { createApiVersion, getApiOpenApi, listApiCatalog, listApiVersions } from '../api/apim';

export function ApiVersionsPage() {
  const [searchParams] = useSearchParams();
  const apiId = searchParams.get('api') ?? '';
  const [apis, setApis] = useState<Array<{ id: string; name: string; apiKey: string }>>([]);
  const [versions, setVersions] = useState<Array<{ version: string; status: string; changelog?: string }>>([]);
  const [openApi, setOpenApi] = useState<Record<string, unknown> | null>(null);
  const [newVersion, setNewVersion] = useState('v2');

  useEffect(() => {
    listApiCatalog().then((r) => setApis(r as Array<{ id: string; name: string; apiKey: string }>));
  }, []);

  useEffect(() => {
    if (!apiId) return;
    listApiVersions(apiId).then((v) => setVersions(v as typeof versions));
    getApiOpenApi(apiId).then(setOpenApi);
  }, [apiId]);

  async function addVersion() {
    if (!apiId) return;
    await createApiVersion(apiId, { version: newVersion, changelog: 'Nueva versión' });
    listApiVersions(apiId).then((v) => setVersions(v as typeof versions));
  }

  return (
    <>
      <Header title="Administrador de Versiones" subtitle="Versionado · deprecación · OpenAPI" actions={<Link to="/apis" className="btn">Centro APIs</Link>} />

      <section className="panel">
        <label>API
          <select value={apiId} onChange={(e) => window.location.href = `/apis/versiones?api=${e.target.value}`}>
            <option value="">Seleccione...</option>
            {apis.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
      </section>

      {apiId && (
        <>
          <section className="panel">
            <h3>Versiones</h3>
            <div className="form-row">
              <input value={newVersion} onChange={(e) => setNewVersion(e.target.value)} />
              <button type="button" className="btn btn-primary" onClick={addVersion}>Crear versión</button>
            </div>
            <table className="data-table">
              <thead><tr><th>Versión</th><th>Estado</th><th>Changelog</th></tr></thead>
              <tbody>
                {versions.map((v) => (
                  <tr key={v.version}><td>{v.version}</td><td>{v.status}</td><td>{v.changelog}</td></tr>
                ))}
              </tbody>
            </table>
          </section>

          {openApi && (
            <section className="panel">
              <h3>Documentación automática</h3>
              <pre className="code-block">{JSON.stringify(openApi, null, 2)}</pre>
            </section>
          )}
        </>
      )}
    </>
  );
}
