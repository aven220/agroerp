import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { FlowNextActions } from '../components/flow/FlowNextActions';
import { FlowProgress } from '../components/flow/FlowProgress';
import { getBiCenter, getBiRealtime, type BiCenter } from '../api/bi';
import { LoadingState } from '../components/ux/LoadingState';

export function BiCenterPage() {
  const [center, setCenter] = useState<BiCenter | null>(null);
  const [realtime, setRealtime] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    getBiCenter().then(setCenter);
    getBiRealtime().then(setRealtime);
    const iv = setInterval(() => getBiRealtime().then(setRealtime), 30000);
    return () => clearInterval(iv);
  }, []);

  if (!center) return <LoadingState variant="dashboard" message="Cargando reportes e indicadores..." />;

  const kpis = center.executive.kpis as Record<string, number> | undefined;

  return (
    <>
      <Header
        title="Reportes e indicadores"
        subtitle="Tableros, KPIs y análisis para la toma de decisiones"
        actions={
          <div className="row-actions">
            <Link to="/bi/dashboards" className="btn">Dashboards</Link>
            <Link to="/bi/disenar" className="btn btn-primary">Constructor</Link>
            <Link to="/bi/reportes" className="btn">Reportes</Link>
            <Link to="/bi/kpis" className="btn">KPIs</Link>
            <Link to="/bi/consultas" className="btn">Consultas</Link>
          </div>
        }
      />

      <FlowProgress flowId="reports" currentStepId="hub" />

      <FlowNextActions
        title="Recorrido de reportes"
        subtitle="Del tablero ejecutivo al detalle analítico."
        actions={[
          { label: 'Ver tableros', description: 'Indicadores visuales por área', to: '/bi/dashboards', primary: true, icon: '📈' },
          { label: 'Generar reporte', description: 'Exporte datos con filtros', to: '/bi/reportes', icon: '📄' },
          { label: 'Consulta avanzada', description: 'Cruce de datos personalizado', to: '/bi/consultas', icon: '🔍' },
        ]}
      />

      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary">
          <span className="kpi-label">Productores</span>
          <span className="kpi-value">{kpis?.totalProducers ?? 0}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Fincas</span>
          <span className="kpi-value">{kpis?.totalFarms ?? 0}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Lotes</span>
          <span className="kpi-value">{kpis?.totalLots ?? 0}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Procesos activos</span>
          <span className="kpi-value">{kpis?.activeWorkflows ?? 0}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Dashboards</span>
          <span className="kpi-value">{center.dashboardCount}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">KPIs</span>
          <span className="kpi-value">{center.kpiCount}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Reportes</span>
          <span className="kpi-value">{center.reportCount}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Eventos 24h</span>
          <span className="kpi-value">{kpis?.eventsLast24h ?? 0}</span>
        </div>
      </div>

      {realtime && (
        <section className="panel bi-realtime-panel">
          <h3>Indicadores en tiempo real</h3>
          <div className="kpi-grid">
            {((realtime.indicators as Record<string, number>) ?? {}) &&
              Object.entries(realtime.indicators as Record<string, number>).map(([k, v]) => (
                <div key={k} className="kpi-card">
                  <span className="kpi-label">{k}</span>
                  <span className="kpi-value">{v}</span>
                </div>
              ))}
          </div>
        </section>
      )}

      <div className="bi-category-grid">
        {Object.entries(center.categories).map(([cat, count]) => (
          <Link key={cat} to={`/bi/dashboards?category=${cat}`} className="bi-category-card">
            <strong>{cat}</strong>
            <span>{count} dashboard{count !== 1 ? 's' : ''}</span>
          </Link>
        ))}
      </div>

      <section className="panel">
        <h3>IA — Preparación</h3>
        <ul className="stat-list">
          {Object.entries(center.aiReadiness ?? {}).map(([k, v]) => (
            <li key={k}><span>{k}</span><strong>{v ? '✓' : '—'}</strong></li>
          ))}
        </ul>
      </section>
    </>
  );
}
