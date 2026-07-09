import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getFarmDashboard, getFarmMap } from '../api/ftip';
import { LoadingState } from '../components/ux/LoadingState';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  under_validation: 'En validación',
  active: 'Activa',
  inactive: 'Inactiva',
  abandoned: 'Abandonada',
};

export function FarmDashboardPage() {
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof getFarmDashboard>> | null>(null);
  const [mapPoints, setMapPoints] = useState<Array<{
    id: string;
    farmCode: string;
    farmName: string;
    status: string;
    latitude: number;
    longitude: number;
    totalAreaHa?: number | null;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getFarmDashboard(), getFarmMap()])
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
        title="Indicadores de fincas"
        subtitle="KPIs territoriales y gemelo digital"
        actions={
          <Link to="/fincas" className="btn">
            Listado
          </Link>
        }
      />

      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary">
          <span className="kpi-label">Total fincas</span>
          <span className="kpi-value">{dashboard.kpis.total}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Activas</span>
          <span className="kpi-value">{dashboard.kpis.active}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Georreferenciadas</span>
          <span className="kpi-value">{dashboard.kpis.georeferenced}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">% Georef.</span>
          <span className="kpi-value">{dashboard.kpis.georefRatePct}%</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Área prom. (ha)</span>
          <span className="kpi-value">{dashboard.kpis.avgTotalAreaHa}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Área agrícola total</span>
          <span className="kpi-value">{dashboard.kpis.totalAgriculturalAreaHa}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Pend. validación</span>
          <span className="kpi-value">{dashboard.kpis.pendingValidation}</span>
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
        <h3>Mapa territorial ({mapPoints.length} georreferenciadas)</h3>
        <div className="map-embed">
          <iframe
            title="Mapa fincas"
            width="100%"
            height="400"
            style={{ border: 0, borderRadius: 8 }}
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${center.lng - 0.1}%2C${center.lat - 0.1}%2C${center.lng + 0.1}%2C${center.lat + 0.1}&layer=mapnik&marker=${center.lat}%2C${center.lng}`}
          />
        </div>
        <ul className="map-legend">
          {mapPoints.slice(0, 15).map((p) => (
            <li key={p.id}>
              <Link to={`/fincas/${p.id}`}>
                {p.farmCode} — {p.farmName}
                {p.totalAreaHa != null ? ` (${Number(p.totalAreaHa).toFixed(1)} ha)` : ''}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
