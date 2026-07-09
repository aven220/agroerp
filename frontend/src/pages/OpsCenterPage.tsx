import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEopCenter, type EopDashboard } from '../api/observability';
import { LoadingState } from '../components/ux/LoadingState';

export function OpsCenterPage() {
  const [dash, setDash] = useState<EopDashboard | null>(null);
  useEffect(() => { getEopCenter().then(setDash); }, []);
  if (!dash) return <LoadingState variant="dashboard" message="Cargando monitoreo de operaciones..." />;

  return (
    <>
      <Header
        title="Monitoreo de operaciones"
        subtitle="Estado de servicios, incidentes y salud de la plataforma"
        actions={
          <div className="row-actions">
            <Link to="/operaciones/infraestructura" className="btn">Infraestructura</Link>
            <Link to="/operaciones/servicios" className="btn">Servicios</Link>
            <Link to="/operaciones/dependencias" className="btn">Dependencias</Link>
            <Link to="/operaciones/incidentes" className="btn">Incidentes</Link>
            <Link to="/operaciones/timeline" className="btn">Timeline</Link>
          </div>
        }
      />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Salud</span><span className="kpi-value">{dash.health}</span></div>
        <div className="kpi-card"><span className="kpi-label">Logs 24h</span><span className="kpi-value">{dash.logs24h}</span></div>
        <div className="kpi-card"><span className="kpi-label">Errores 24h</span><span className="kpi-value">{dash.errors24h}</span></div>
        <div className="kpi-card"><span className="kpi-label">Alertas abiertas</span><span className="kpi-value">{dash.openAlerts}</span></div>
        <div className="kpi-card"><span className="kpi-label">Incidentes</span><span className="kpi-value">{dash.openIncidents}</span></div>
        <div className="kpi-card"><span className="kpi-label">Traces 24h</span><span className="kpi-value">{dash.traces24h}</span></div>
        <div className="kpi-card"><span className="kpi-label">Nodos mapa</span><span className="kpi-value">{dash.serviceMap.nodes}</span></div>
        <div className="kpi-card"><span className="kpi-label">IA requests</span><span className="kpi-value">{dash.ai.requests}</span></div>
      </div>
    </>
  );
}
