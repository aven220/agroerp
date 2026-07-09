import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEpopCenter, type EpopDashboard } from '../api/performance';
import { LoadingState } from '../components/ux/LoadingState';

export function PerfCenterPage() {
  const [dash, setDash] = useState<EpopDashboard | null>(null);
  useEffect(() => { getEpopCenter().then(setDash); }, []);
  if (!dash) return <LoadingState variant="dashboard" message="Cargando rendimiento del sistema..." />;

  return (
    <>
      <Header
        title="Rendimiento del sistema"
        subtitle="Consultas lentas, caché y optimización de la plataforma"
        actions={
          <div className="row-actions">
            <Link to="/rendimiento/consultas" className="btn">Consultas</Link>
            <Link to="/rendimiento/cache" className="btn">Caché</Link>
            <Link to="/rendimiento/benchmarks" className="btn">Benchmarks</Link>
            <Link to="/rendimiento/frontend" className="btn">Frontend</Link>
            <Link to="/rendimiento/mobile" className="btn">Mobile</Link>
          </div>
        }
      />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Resp. avg</span><span className="kpi-value">{dash.responseTimeAvg.toFixed(1)}ms</span></div>
        <div className="kpi-card"><span className="kpi-label">Slow queries 24h</span><span className="kpi-value">{dash.slowQueries24h}</span></div>
        <div className="kpi-card"><span className="kpi-label">Índices sugeridos</span><span className="kpi-value">{dash.indexRecommendations}</span></div>
        <div className="kpi-card"><span className="kpi-label">Memoria heap</span><span className="kpi-value">{dash.memoryMb.toFixed(0)}MB</span></div>
        <div className="kpi-card"><span className="kpi-label">Benchmarks</span><span className="kpi-value">{dash.benchmarks}</span></div>
        <div className="kpi-card"><span className="kpi-label">Bundle gzip</span><span className="kpi-value">{(dash.bundles.totalGzip / 1024).toFixed(0)}KB</span></div>
        <div className="kpi-card"><span className="kpi-label">FPS móvil avg</span><span className="kpi-value">{dash.mobile.avgFps.toFixed(1)}</span></div>
        <div className="kpi-card"><span className="kpi-label">Jobs mantenimiento</span><span className="kpi-value">{dash.maintenanceJobs}</span></div>
      </div>
      <section className="panel">
        <h3>Capacidades activas</h3>
        <div className="row-actions">
          {Object.entries(dash.features).map(([k, v]) => (
            <span key={k} className="badge">{k}: {v ? 'ON' : 'OFF'}</span>
          ))}
        </div>
      </section>
    </>
  );
}
