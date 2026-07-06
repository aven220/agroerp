import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  getMarketplacePlugin,
  installPlugin,
  listMarketplaceCategories,
  reviewPlugin,
  searchMarketplace,
  type EppmCategory,
  type EppmPlugin,
} from '../api/plugins';

export function MarketplacePage() {
  const [plugins, setPlugins] = useState<EppmPlugin[]>([]);
  const [categories, setCategories] = useState<EppmCategory[]>([]);
  const [q, setQ] = useState('');
  const [categoryKey, setCategoryKey] = useState('');
  const [selected, setSelected] = useState<EppmPlugin | null>(null);

  const reload = () => searchMarketplace(q || undefined, categoryKey || undefined).then(setPlugins);
  useEffect(() => {
    listMarketplaceCategories().then(setCategories);
    reload();
  }, [categoryKey]);

  const search = () => reload();

  const install = async (pluginKey: string) => {
    await installPlugin(pluginKey);
    alert('Plugin instalado');
  };

  const openDetail = async (pluginKey: string) => {
    const p = await getMarketplacePlugin(pluginKey);
    setSelected(p);
  };

  return (
    <>
      <Header
        title="Marketplace"
        subtitle="Explorar e instalar extensiones"
        actions={<Link to="/plugins" className="btn">Centro</Link>}
      />
      <section className="panel">
        <div className="form-row">
          <input placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={categoryKey} onChange={(e) => setCategoryKey(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.categoryKey} value={c.categoryKey}>{c.name}</option>
            ))}
          </select>
          <button type="button" className="btn btn-primary" onClick={search}>Buscar</button>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Plugin</th><th>Vendor</th><th>Tipo</th><th>Versión</th><th>Rating</th><th>Descargas</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {plugins.map((p) => (
              <tr key={p.id}>
                <td><strong>{p.name}</strong><br /><small>{p.pluginKey}</small></td>
                <td>{p.vendor}</td>
                <td>{p.pluginType}</td>
                <td>{p.currentVersion}</td>
                <td>{p.ratingAvg.toFixed(1)} ({p.ratingCount})</td>
                <td>{p.downloadCount}</td>
                <td className="row-actions">
                  <button type="button" className="btn btn-sm" onClick={() => openDetail(p.pluginKey)}>Detalle</button>
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => install(p.pluginKey)}>Instalar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {selected && (
        <section className="panel">
          <h3>{selected.name}</h3>
          <p>{selected.description ?? 'Sin descripción'}</p>
          <p>Licencia: {selected.license ?? '—'} | Compatibilidad: {JSON.stringify(selected.compatibility)}</p>
          {selected.versions && selected.versions.length > 0 && (
            <>
              <h4>Historial de versiones</h4>
              <ul>
                {selected.versions.map((v) => (
                  <li key={v.version}>{v.version} — {new Date(v.publishedAt).toLocaleDateString()}</li>
                ))}
              </ul>
            </>
          )}
          <div className="form-row">
            <button type="button" className="btn" onClick={() => reviewPlugin(selected.pluginKey, 5, 'Excelente extensión')}>
              Calificar 5★
            </button>
            <button type="button" className="btn" onClick={() => setSelected(null)}>Cerrar</button>
          </div>
        </section>
      )}
    </>
  );
}
