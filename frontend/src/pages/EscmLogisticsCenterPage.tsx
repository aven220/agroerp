import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEscmLogisticsCenter } from '../api/escm';

export function EscmLogisticsCenterPage() {
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    getEscmLogisticsCenter().then(setDash);
  }, []);

  const byStatus = (dash?.dispatchesByStatus ?? {}) as Record<string, number>;
  const routes = (dash?.routesByStatus ?? {}) as Record<string, number>;

  return (
    <>
      <Header
        title="Centro logístico"
        subtitle="Despachos, rutas, entregas e incidencias"
        actions={
          <>
            <Link to="/comercial/despachos" className="btn">Despachos</Link>
            <Link to="/comercial/rutas" className="btn">Rutas</Link>
            <Link to="/comercial/entregas" className="btn">Entregas</Link>
            <Link to="/comercial/incidencias" className="btn">Incidencias</Link>
          </>
        }
      />
      <section className="panel" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div><strong>Pedidos pendientes</strong>: {Number(dash?.pendingOrders ?? 0)}</div>
        <div><strong>Rutas activas</strong>: {Number(dash?.activeRoutes ?? 0)}</div>
        <div><strong>Incidencias abiertas</strong>: {Number(dash?.openIncidents ?? 0)}</div>
      </section>
      <section className="panel">
        <h3>Despachos por estado</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {Object.entries(byStatus).map(([k, v]) => (
            <div key={k}>{k}: {v}</div>
          ))}
        </div>
      </section>
      <section className="panel">
        <h3>Rutas por estado</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {Object.entries(routes).map(([k, v]) => (
            <div key={k}>{k}: {v}</div>
          ))}
        </div>
      </section>
    </>
  );
}
