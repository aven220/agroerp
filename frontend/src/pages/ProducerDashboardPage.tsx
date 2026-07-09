import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getProducerDashboard, getProducerMap } from '../api/prm';
import { LoadingState } from '../components/ux/LoadingState';

export function ProducerDashboardPage() {
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof getProducerDashboard>> | null>(null);
  const [mapPoints, setMapPoints] = useState<Array<{
    id: string;
    producerNumber: string;
    legalName: string;
    lifecycleStatus: string;
    latitude: number;
    longitude: number;
    qualityScore: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProducerDashboard(), getProducerMap()])
      .then(([dash, map]) => {
        setDashboard(dash);
        setMapPoints(map.items);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState variant="dashboard" message="Cargando dashboard..." />;
  if (!dashboard) return null;

  const center = mapPoints.length > 0
    ? { lat: mapPoints[0].latitude, lng: mapPoints[0].longitude }
    : { lat: 6.2442, lng: -75.5812 };

  return (
    <>
      <Header
        title="Indicadores de productores"
        subtitle="KPIs y cartera de productores"
        actions={
          <Link to="/productores" className="btn">
            Listado
          </Link>
        }
      />

      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary">
          <span className="kpi-label">Total productores</span>
          <span className="kpi-value">{dashboard.kpis.total}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Activos</span>
          <span className="kpi-value">{dashboard.kpis.active}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Pend. aprobación</span>
          <span className="kpi-value">{dashboard.kpis.pendingApproval}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Suspendidos</span>
          <span className="kpi-value">{dashboard.kpis.suspended}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Altas 30 días</span>
          <span className="kpi-value">{dashboard.kpis.recentActivations}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Cert. por vencer</span>
          <span className="kpi-value">{dashboard.kpis.expiringCertifications}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Score calidad prom.</span>
          <span className="kpi-value">{dashboard.kpis.avgQualityScore}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Score riesgo prom.</span>
          <span className="kpi-value">{dashboard.kpis.avgRiskScore}</span>
        </div>
      </div>

      <div className="dashboard-panels">
        <div className="panel">
          <h3>Por estado lifecycle</h3>
          <ul className="stat-list">
            {dashboard.byStatus.map((s) => (
              <li key={s.status}>
                <span>{s.status}</span>
                <strong>{s.count}</strong>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <h3>Top municipios</h3>
          <ul className="stat-list">
            {dashboard.byMunicipality.map((m) => (
              <li key={m.municipalityCode ?? 'unknown'}>
                <span>{m.municipalityCode ?? 'Sin municipio'}</span>
                <strong>{m.count}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="panel map-panel">
        <h3>Mapa de cartera ({mapPoints.length} georreferenciados)</h3>
        <div className="map-embed">
          <iframe
            title="Mapa productores"
            width="100%"
            height="400"
            style={{ border: 0, borderRadius: 8 }}
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${center.lng - 0.1}%2C${center.lat - 0.1}%2C${center.lng + 0.1}%2C${center.lat + 0.1}&layer=mapnik&marker=${center.lat}%2C${center.lng}`}
          />
        </div>
        <ul className="map-legend">
          {mapPoints.slice(0, 10).map((p) => (
            <li key={p.id}>
              <Link to={`/productores/${p.id}`}>
                {p.producerNumber} — {p.legalName} (Q:{p.qualityScore})
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
