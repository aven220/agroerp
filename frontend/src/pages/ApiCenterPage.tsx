import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getApiCenter, type ApiCenter } from '../api/apim';
import { LoadingState } from '../components/ux/LoadingState';

export function ApiCenterPage() {
  const [center, setCenter] = useState<ApiCenter | null>(null);

  useEffect(() => { getApiCenter().then(setCenter); }, []);

  if (!center) return <LoadingState variant="dashboard" message="Cargando Centro de APIs..." />;

  return (
    <>
      <Header
        title="Centro de APIs — EAMIP"
        subtitle="Gestión empresarial de APIs e integraciones"
        actions={
          <div className="row-actions">
            <Link to="/apis/catalogo" className="btn btn-primary">Catálogo</Link>
            <Link to="/apis/clientes" className="btn">Clientes</Link>
            <Link to="/apis/desarrolladores" className="btn">Portal Dev</Link>
            <Link to="/apis/metricas" className="btn">Métricas</Link>
            <Link to="/apis/versiones" className="btn">Versiones</Link>
          </div>
        }
      />

      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary">
          <span className="kpi-label">APIs registradas</span>
          <span className="kpi-value">{center.apiCount}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Publicadas</span>
          <span className="kpi-value">{center.publishedCount}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Conectores</span>
          <span className="kpi-value">{center.connectorCount}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Módulos</span>
          <span className="kpi-value">{center.discoveredModules}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Solicitudes 24h</span>
          <span className="kpi-value">{center.metrics.kpis.requests24h}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Latencia prom.</span>
          <span className="kpi-value">{center.metrics.kpis.avgLatencyMs}ms</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Disponibilidad</span>
          <span className="kpi-value">{center.metrics.kpis.availabilityPct}%</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Tasa éxito</span>
          <span className="kpi-value">{center.metrics.kpis.successRatePct}%</span>
        </div>
      </div>

      <section className="panel">
        <h3>Health checks recientes</h3>
        <table className="data-table data-table-compact">
          <thead><tr><th>Target</th><th>Estado</th><th>Latencia</th></tr></thead>
          <tbody>
            {center.health.map((h, i) => (
              <tr key={i}>
                <td>{h.targetRef}</td>
                <td>{h.status}</td>
                <td>{h.latencyMs ?? '-'}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
