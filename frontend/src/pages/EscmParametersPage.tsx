import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listEscmParameters, upsertEscmParameter } from '../api/escm';

export function EscmParametersPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [form, setForm] = useState({ parameterKey: '', name: '', value: '{}' });

  const reload = () => listEscmParameters().then((r) => setRows(r as Array<Record<string, unknown>>));
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Parámetros comerciales" subtitle="Configuración general del proceso de ventas" actions={<Link to="/comercial" className="btn">ESCM</Link>} />
      <section className="panel">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="parameterKey" value={form.parameterKey} onChange={(e) => setForm({ ...form, parameterKey: e.target.value })} />
          <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="JSON value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} style={{ minWidth: 240 }} />
          <button
            className="btn"
            onClick={() => upsertEscmParameter({ parameterKey: form.parameterKey, name: form.name, value: JSON.parse(form.value) }).then(reload)}
          >
            Guardar
          </button>
        </div>
      </section>
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Nombre</th><th>Valor</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.parameterKey)}>
                <td>{String(r.parameterKey)}</td>
                <td>{String(r.name)}</td>
                <td><code>{JSON.stringify(r.value)}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
