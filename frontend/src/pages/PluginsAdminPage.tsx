import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  disablePlugin,
  enablePlugin,
  listInstalledPlugins,
  rollbackPlugin,
  uninstallPlugin,
  type EppmInstall,
} from '../api/plugins';

export function PluginsAdminPage() {
  const [installs, setInstalls] = useState<EppmInstall[]>([]);
  const reload = () => listInstalledPlugins().then(setInstalls);
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header
        title="Administrador de extensiones"
        subtitle="Habilitar, deshabilitar y desinstalar"
        actions={
          <div className="row-actions">
            <Link to="/plugins" className="btn">Centro</Link>
            <Link to="/plugins/marketplace" className="btn btn-primary">Marketplace</Link>
          </div>
        }
      />
      <section className="panel">
        <table className="data-table">
          <thead>
            <tr><th>Plugin</th><th>Versión</th><th>Tipo</th><th>Estado</th><th>Auto-update</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {installs.map((i) => (
              <tr key={i.id}>
                <td>{i.plugin.name}<br /><small>{i.pluginKey}</small></td>
                <td>{i.installedVersion}</td>
                <td>{i.plugin.pluginType}</td>
                <td>{i.status}</td>
                <td>{i.autoUpdate ? 'Sí' : 'No'}</td>
                <td className="row-actions">
                  {i.status === 'disabled'
                    ? <button type="button" className="btn btn-sm" onClick={() => enablePlugin(i.id).then(reload)}>Habilitar</button>
                    : <button type="button" className="btn btn-sm" onClick={() => disablePlugin(i.id).then(reload)}>Deshabilitar</button>}
                  <button type="button" className="btn btn-sm" onClick={() => rollbackPlugin(i.id).then(reload)}>Rollback</button>
                  <button type="button" className="btn btn-sm" onClick={() => uninstallPlugin(i.id).then(reload)}>Desinstalar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
