import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  getSdkTemplate,
  listExtensionPoints,
  packageManifest,
  validateManifest,
} from '../api/plugins';

export function PluginsDeveloperPage() {
  const [points, setPoints] = useState<unknown[]>([]);
  const [manifest, setManifest] = useState('');
  const [result, setResult] = useState('');

  useEffect(() => {
    listExtensionPoints().then(setPoints);
    getSdkTemplate('business_module').then((t) => setManifest(JSON.stringify(t, null, 2)));
  }, []);

  const validate = async () => {
    const parsed = JSON.parse(manifest);
    const r = await validateManifest(parsed);
    setResult(JSON.stringify(r, null, 2));
  };

  const pack = async () => {
    const parsed = JSON.parse(manifest);
    const r = await packageManifest(parsed);
    setResult(JSON.stringify(r, null, 2));
  };

  return (
    <>
      <Header
        title="Panel para desarrolladores"
        subtitle="SDK, validación y empaquetado"
        actions={<Link to="/plugins" className="btn">Centro</Link>}
      />
      <section className="panel">
        <h3>Extension Points disponibles</h3>
        <table className="data-table data-table-compact">
          <thead><tr><th>Clave</th><th>Nombre</th><th>Tipo</th><th>Interface</th></tr></thead>
          <tbody>
            {points.map((p) => {
              const row = p as { pointKey: string; name: string; pluginType: string; handlerInterface: string };
              return (
                <tr key={row.pointKey}>
                  <td>{row.pointKey}</td>
                  <td>{row.name}</td>
                  <td>{row.pluginType}</td>
                  <td>{row.handlerInterface}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Manifest editor</h3>
        <textarea rows={16} style={{ width: '100%' }} value={manifest} onChange={(e) => setManifest(e.target.value)} />
        <div className="form-row" style={{ marginTop: 12 }}>
          <button type="button" className="btn" onClick={validate}>Validar</button>
          <button type="button" className="btn btn-primary" onClick={pack}>Empaquetar y firmar</button>
        </div>
        {result && <pre className="code-block">{result}</pre>}
      </section>
    </>
  );
}
