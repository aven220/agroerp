import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getCoffeeConfigCenter, seedCoffeeConfig } from '../api/coffee';

export function CoffeeConfigCenterPage() {
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  const reload = () => getCoffeeConfigCenter().then(setDash);
  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header
        title="Centro de configuración — Compras café"
        subtitle="Catálogos, parámetros y reglas de recepción"
        actions={
          <div className="row-actions">
            <button type="button" className="btn" onClick={() => seedCoffeeConfig().then(reload)}>Sembrar defaults</button>
            <Link to="/compras/config/catalogos" className="btn">Catálogos</Link>
            <Link to="/compras/config/parametros" className="btn">Parámetros</Link>
            <Link to="/compras/config/precios" className="btn">Precios</Link>
            <Link to="/compras/config/centros" className="btn">Centros</Link>
            <Link to="/compras/config/validaciones" className="btn">Validaciones</Link>
            <Link to="/compras/config/cambios" className="btn">Historial</Link>
            <Link to="/compras" className="btn">Compras</Link>
          </div>
        }
      />
      {dash && (
        <div className="kpi-grid kpi-grid-lg">
          <div className="kpi-card kpi-card-primary"><span className="kpi-label">Catálogos</span><span className="kpi-value">{String(dash.totalCatalogEntries)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Activos</span><span className="kpi-value">{String(dash.activeCatalogEntries)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Parámetros</span><span className="kpi-value">{String(dash.parameters)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Reglas recepción</span><span className="kpi-value">{String(dash.receptionRules)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Centros compra</span><span className="kpi-value">{String(dash.purchaseCenters)}</span></div>
          <div className="kpi-card"><span className="kpi-label">Precios</span><span className="kpi-value">{String(dash.priceConfigs)}</span></div>
        </div>
      )}
      <section className="panel">
        <h3>Conteo por catálogo</h3>
        <pre className="code-block">{JSON.stringify(dash?.catalogCounts ?? {}, null, 2)}</pre>
      </section>
    </>
  );
}
