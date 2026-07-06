import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listEimsCatalogKeys, listEimsCatalogs, upsertEimsCatalog } from '../api/eims';

export function EimsCatalogsPage() {
  const [keys, setKeys] = useState<string[]>([]);
  const [catalogKey, setCatalogKey] = useState('item_type');
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [form, setForm] = useState({ entryKey: '', name: '', code: '' });

  const reload = () => listEimsCatalogs(catalogKey, true).then((r) => setRows(r as Array<Record<string, unknown>>));
  useEffect(() => {
    listEimsCatalogKeys().then(setKeys);
  }, []);
  useEffect(() => { reload(); }, [catalogKey]);

  return (
    <>
      <Header title="Catálogos de inventario" subtitle="Tipos, categorías, UOM, motivos y más" actions={<Link to="/inventario" className="btn">EIMS</Link>} />
      <section className="panel">
        <select value={catalogKey} onChange={(e) => setCatalogKey(e.target.value)}>
          {keys.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input placeholder="entryKey" value={form.entryKey} onChange={(e) => setForm({ ...form, entryKey: e.target.value })} />
          <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Código" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <button className="btn" onClick={() => upsertEimsCatalog({ catalogKey, ...form }).then(reload)}>Guardar</button>
        </div>
      </section>
      <section className="panel">
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Nombre</th><th>Código</th><th>Padre</th><th>Activo</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)}>
                <td>{String(r.entryKey)}</td>
                <td>{String(r.name)}</td>
                <td>{String(r.code ?? '—')}</td>
                <td>{String(r.parentKey ?? '—')}</td>
                <td>{r.isActive ? 'Sí' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
