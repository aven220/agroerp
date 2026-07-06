import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getGisDashboard, getGisReport, getGisTimeline } from '../api/gis';
import { LoadingState } from '../components/ux/LoadingState';

export function GisDashboardPage() {
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof getGisDashboard>> | null>(null);
  const [coverage, setCoverage] = useState<unknown>(null);
  const [timeline, setTimeline] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getGisDashboard(),
      getGisReport('GTIP-RPT-COVERAGE'),
      getGisTimeline(),
    ])
      .then(([dash, cov, tl]) => {
        setDashboard(dash);
        setCoverage(cov);
        setTimeline(tl);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState variant="dashboard" message="Cargando dashboard GIS..." />;
  if (!dashboard) return null;

  const kpis = dashboard.kpis;

  return (
    <>
      <Header
        title="Dashboard GIS"
        subtitle="KPIs geográficos y timeline territorial"
        actions={<Link to="/gis" className="btn btn-primary">Centro de mapas</Link>}
      />

      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary">
          <span className="kpi-label">Capas activas</span>
          <span className="kpi-value">{kpis.activeLayers}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Features proyectados</span>
          <span className="kpi-value">{kpis.totalProjectedFeatures}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Geocercas</span>
          <span className="kpi-value">{kpis.geofenceCount}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Eventos espaciales</span>
          <span className="kpi-value">{kpis.geoEventCount}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Productores GPS</span>
          <span className="kpi-value">{kpis.producersWithGps}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Fincas con geometría</span>
          <span className="kpi-value">{kpis.farmsWithGeometry}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Lotes con geometría</span>
          <span className="kpi-value">{kpis.lotsWithGeometry}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Rutas planificadas</span>
          <span className="kpi-value">{kpis.routeCount}</span>
        </div>
      </div>

      <div className="panel-grid">
        <section className="panel">
          <h3>Capas por features</h3>
          <table className="data-table">
            <thead>
              <tr><th>Código</th><th>Nombre</th><th>Features</th></tr>
            </thead>
            <tbody>
              {dashboard.layerStats.map((l) => (
                <tr key={l.id}>
                  <td>{l.layerCode}</td>
                  <td>{l.layerName}</td>
                  <td>{l.featureCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <h3>Cobertura territorial</h3>
          <pre className="code-block">{JSON.stringify(coverage, null, 2)}</pre>
        </section>

        <section className="panel">
          <h3>IA — Módulos preparados</h3>
          <ul>
            {Object.entries(dashboard.aiReadiness).map(([k, v]) => (
              <li key={k}>{k}: {v ? '✓' : '—'}</li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h3>Timeline territorial</h3>
          <ul className="gis-history">
            {timeline.slice(0, 15).map((ev, i) => (
              <li key={i}>{JSON.stringify(ev)}</li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
