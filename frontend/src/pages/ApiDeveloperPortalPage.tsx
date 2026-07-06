import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getDeveloperPortal } from '../api/apim';

export function ApiDeveloperPortalPage() {
  const [portal, setPortal] = useState<{
    catalog: Array<{ moduleRef: string; name: string; basePath: string }>;
    publishedApis: Array<{ apiKey: string; name: string; status: string }>;
    openApiSpecs: Array<{ apiKey: string; name: string; spec: Record<string, unknown> }>;
    authMethods: string[];
  } | null>(null);
  const [selectedSpec, setSelectedSpec] = useState<string>('');

  useEffect(() => {
    getDeveloperPortal().then((p) => {
      setPortal(p as typeof portal);
      const specs = (p as { openApiSpecs: Array<{ apiKey: string }> }).openApiSpecs;
      if (specs[0]) setSelectedSpec(specs[0].apiKey);
    });
  }, []);

  const spec = portal?.openApiSpecs.find((s) => s.apiKey === selectedSpec)?.spec;

  return (
    <>
      <Header
        title="Portal para Desarrolladores"
        subtitle="OpenAPI · pruebas · API Keys"
        actions={<Link to="/apis" className="btn">Centro APIs</Link>}
      />

      {portal && (
        <div className="split-layout">
          <section className="panel">
            <h3>APIs publicadas</h3>
            <ul>
              {portal.publishedApis.map((a) => (
                <li key={a.apiKey}>
                  <button type="button" className="btn-link" onClick={() => setSelectedSpec(a.apiKey)}>{a.name}</button>
                </li>
              ))}
            </ul>
            <h3>Autenticación</h3>
            <p>{portal.authMethods.join(' · ')}</p>
            <h3>Módulos descubiertos</h3>
            <table className="data-table data-table-compact">
              <tbody>
                {portal.catalog.map((m) => (
                  <tr key={m.moduleRef}><td>{m.name}</td><td>{m.basePath}</td></tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="panel">
            <h3>OpenAPI / Swagger</h3>
            <select value={selectedSpec} onChange={(e) => setSelectedSpec(e.target.value)}>
              {portal.openApiSpecs.map((s) => (
                <option key={s.apiKey} value={s.apiKey}>{s.name}</option>
              ))}
            </select>
            <pre className="code-block">{JSON.stringify(spec, null, 2)}</pre>
            <p className="muted">Consumo: header <code>X-API-Key</code> o Bearer token en <code>/gateway/v1/:apiKey/v1/...</code></p>
          </section>
        </div>
      )}
    </>
  );
}
