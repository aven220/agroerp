import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
  activateEihConnector,
  listEihCatalog,
  listEihConnectors,
  registerEihConnector,
  type EihCatalogItem,
  type EihConnector,
} from '../api/integration';

export function IntegrationConnectorsPage() {
  const [connectors, setConnectors] = useState<EihConnector[]>([]);
  const [catalog, setCatalog] = useState<EihCatalogItem[]>([]);

  const reload = () => {
    listEihConnectors().then(setConnectors);
    listEihCatalog().then(setCatalog);
  };
  useEffect(() => { reload(); }, []);

  const handleRegister = async (item: EihCatalogItem) => {
    const key = item.catalogKey.replace(/\./g, '-');
    await registerEihConnector({
      connectorKey: `${key}-demo`,
      name: item.name,
      protocol: item.protocol,
      category: item.category,
      catalogKey: item.catalogKey,
      authType: 'api_key',
    });
    reload();
  };

  return (
    <>
      <Header
        title="Administrador de conectores"
        subtitle="Catálogo y conectores de organización"
        actions={<Link to="/integraciones" className="btn">Centro</Link>}
      />
      <section className="panel">
        <h3>Conectores activos</h3>
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Nombre</th><th>Protocolo</th><th>Categoría</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {connectors.map((c) => (
              <tr key={c.id}>
                <td>{c.connectorKey}</td>
                <td>{c.name}</td>
                <td>{c.protocol}</td>
                <td>{c.category}</td>
                <td>{c.status}</td>
                <td>
                  {c.status === 'draft' && (
                    <button type="button" className="btn btn-sm" onClick={() => activateEihConnector(c.connectorKey).then(reload)}>
                      Activar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Catálogo reutilizable</h3>
        <table className="data-table">
          <thead><tr><th>Clave</th><th>Nombre</th><th>Protocolo</th><th>Categoría</th><th></th></tr></thead>
          <tbody>
            {catalog.map((item) => (
              <tr key={item.catalogKey}>
                <td>{item.catalogKey}</td>
                <td>{item.name}</td>
                <td>{item.protocol}</td>
                <td>{item.category}</td>
                <td>
                  <button type="button" className="btn btn-sm" onClick={() => handleRegister(item)}>Registrar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
