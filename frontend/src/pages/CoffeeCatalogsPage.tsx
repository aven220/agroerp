import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listCoffeeCatalogKeys, listCoffeeCatalogs, upsertCoffeeCatalog } from '../api/coffee';

export function CoffeeCatalogsPage() {
  const [keys, setKeys] = useState<string[]>([]);
  const [catalogKey, setCatalogKey] = useState('coffee_type');
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [entryKey, setEntryKey] = useState('');
  const [name, setName] = useState('');

  const reload = () => listCoffeeCatalogs(catalogKey, true).then((r) => setRows(r as Array<Record<string, unknown>>));
  useEffect(() => {
    listCoffeeCatalogKeys().then(setKeys);
  }, []);
  useEffect(() => { reload(); }, [catalogKey]);

  return (
    <>
      <Header title="Administrador de catálogos" subtitle="Tipos, variedades, defectos, pagos..." actions={<Link to="/compras/config" className="btn">Config</Link>} />
      <section className="panel">
        <div className="row-actions">
          <select value={catalogKey} onChange={(e) => setCatalogKey(e.target.value)}>
            {keys.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <input placeholder="entryKey" value={entryKey} onChange={(e) => setEntryKey(e.target.value)} />
          <input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <button
            type="button"
            className="btn"
            onClick={() => upsertCoffeeCatalog({ catalogKey, entryKey, name, reason: 'UI update' }).then(() => { setEntryKey(''); setName(''); reload(); })}
          >
            Guardar
          </button>
        </div>
        <table className="data-table" style={{ marginTop: 12 }}>
          <thead><tr><th>Key</th><th>Nombre</th><th>Código</th><th>Activo</th><th>Versión</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)}>
                <td>{String(r.entryKey)}</td>
                <td>{String(r.name)}</td>
                <td>{String(r.code ?? '—')}</td>
                <td>{String(r.isActive)}</td>
                <td>{String(r.version)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
