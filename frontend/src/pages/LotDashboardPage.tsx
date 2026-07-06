import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getLotDashboard, getLotMap } from '../api/fmdt';
import { LoadingState } from '../components/ux/LoadingState';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activo',
  fallow: 'Barbecho',
  renovation: 'Renovación',
  inactive: 'Inactivo',
  abandoned: 'Abandonado',
};

export function LotDashboardPage() {
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof getLotDashboard>> | null>(null);
  const [mapPoints, setMapPoints] = useState<Array<{
    id: string;
    lotCode: string;
    lotName: string;
    status: string;
    latitude: number;
    longitude: number;
    totalAreaHa?: number | null;
    farmName: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getLotDashboard(), getLotMap()])
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
        title="Dashboard FMDT"
        subtitle="KPIs de lotes y gemelo digital"
        actions={
          <Link to="/lotes" className="btn">
            Listado
          </Link>
        }
      />

      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary">
          <span className="kpi-label">Total lotes</span>
          <span className="kpi-value">{dashboard.kpis.total}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Activos</span>
          <span className="kpi-value">{dashboard.kpis.active}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Georreferenciados</span>
          <span className="kpi-value">{dashboard.kpis.georeferenced}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">% Georef.</span>
          <span className="kpi-value">{dashboard.kpis.georefRatePct}%</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Prod. YTD (kg)</span>
          <span className="kpi-value">{Number(dashboard.kpis.totalProductionYtdKg).toLocaleString('es-CO')}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Rend. prom. (kg/ha)</span>
          <span className="kpi-value">{dashboard.kpis.avgYieldKgHa}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Calidad prom.</span>
          <span className="kpi-value">{dashboard.kpis.avgQualityScore}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Riesgos activos</span>
          <span className="kpi-value">{dashboard.kpis.activeRisks}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Costo YTD</span>
          <span className="kpi-value">${Number(dashboard.kpis.totalCostYtd).toLocaleString('es-CO')}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Costo/ha prom.</span>
          <span className="kpi-value">${Number(dashboard.kpis.avgCostPerHa).toLocaleString('es-CO')}</span>
        </div>
      </div>

      <div className="dashboard-panels">
        <div className="panel">
          <h3>Por estado</h3>
          <ul className="stat-list">
            {dashboard.byStatus.map((s) => (
              <li key={s.status}>
                <span>{STATUS_LABELS[s.status] ?? s.status}</span>
                <strong>{s.count}</strong>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <h3>Por cultivo</h3>
          <ul className="stat-list">
            {dashboard.byCrop.map((c) => (
              <li key={c.cropCode}>
                <span>{c.cropCode}</span>
                <strong>{c.count}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="panel map-panel">
        <h3>Mapa de lotes ({mapPoints.length} georreferenciados)</h3>
        <div className="map-embed">
          <iframe
            title="Mapa lotes"
            width="100%"
            height="400"
            style={{ border: 0, borderRadius: 8 }}
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${center.lng - 0.1}%2C${center.lat - 0.1}%2C${center.lng + 0.1}%2C${center.lat + 0.1}&layer=mapnik&marker=${center.lat}%2C${center.lng}`}
          />
        </div>
        <ul className="map-legend">
          {mapPoints.slice(0, 20).map((p) => (
            <li key={p.id}>
              <Link to={`/lotes/${p.id}`}>
                {p.lotCode} — {p.lotName} ({p.farmName})
                {p.totalAreaHa != null ? ` · ${Number(p.totalAreaHa).toFixed(1)} ha` : ''}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
