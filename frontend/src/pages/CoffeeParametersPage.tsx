import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listCoffeeParameters, upsertCoffeeParameter } from '../api/coffee';

export function CoffeeParametersPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [parameterKey, setParameterKey] = useState('humidity_ranges');
  const [name, setName] = useState('Rangos de humedad');
  const [valueJson, setValueJson] = useState('{"min":10,"max":12.5}');

  const reload = () => listCoffeeParameters().then((r) => setRows(r as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Administrador de parámetros" subtitle="Bonos, castigos, rangos, límites" actions={<Link to="/compras/config" className="btn">Config</Link>} />
      <section className="panel">
        <div className="row-actions">
          <input value={parameterKey} onChange={(e) => setParameterKey(e.target.value)} placeholder="parameterKey" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" />
        </div>
        <textarea style={{ width: '100%', minHeight: 80, marginTop: 8 }} value={valueJson} onChange={(e) => setValueJson(e.target.value)} />
        <button
          type="button"
          className="btn"
          style={{ marginTop: 8 }}
          onClick={() => upsertCoffeeParameter({ parameterKey, name, value: JSON.parse(valueJson), reason: 'UI update' }).then(reload)}
        >
          Guardar parámetro
        </button>
      </section>
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Key</th><th>Nombre</th><th>Scope</th><th>Versión</th><th>Valor</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)}>
                <td>{String(r.parameterKey)}</td>
                <td>{String(r.name)}</td>
                <td>{String(r.scopeType)}:{String(r.scopeRef || 'org')}</td>
                <td>{String(r.version)}</td>
                <td><code>{JSON.stringify(r.value)}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
