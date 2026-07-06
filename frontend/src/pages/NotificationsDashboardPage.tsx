import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEneacDashboard, type EneacDashboard } from '../api/eneac';
import { LoadingState } from '../components/ux/LoadingState';

export function NotificationsDashboardPage() {
  const [dashboard, setDashboard] = useState<EneacDashboard | null>(null);

  useEffect(() => {
    getEneacDashboard().then(setDashboard);
  }, []);

  if (!dashboard) return <LoadingState variant="dashboard" message="Cargando dashboard ENEAC..." />;

  return (
    <>
      <Header
        title="Dashboard ENEAC"
        subtitle="KPIs · observabilidad · entregas"
        actions={
          <div className="row-actions">
            <Link to="/notificaciones" className="btn">Bandeja</Link>
            <Link to="/notificaciones/eventos" className="btn">Timeline</Link>
            <Link to="/notificaciones/reglas" className="btn">Reglas</Link>
          </div>
        }
      />

      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary">
          <span className="kpi-label">No leídas</span>
          <span className="kpi-value">{dashboard.kpis.unread}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Importantes</span>
          <span className="kpi-value">{dashboard.kpis.important}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Entregadas (24h)</span>
          <span className="kpi-value">{dashboard.kpis.deliveredLast24h}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Fallos entrega</span>
          <span className="kpi-value">{dashboard.kpis.failedDeliveries}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Latencia prom. (ms)</span>
          <span className="kpi-value">{Math.round(dashboard.kpis.avgDeliveryLatencyMs)}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Tiempo lectura (min)</span>
          <span className="kpi-value">{dashboard.kpis.avgReadMinutes.toFixed(1)}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Tiempo atención (min)</span>
          <span className="kpi-value">{dashboard.kpis.avgAttendMinutes.toFixed(1)}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Reglas activas</span>
          <span className="kpi-value">{dashboard.kpis.activeRules}</span>
        </div>
      </div>

      <div className="split-layout">
        <section className="panel">
          <h3>Por severidad (24h)</h3>
          <table className="data-table">
            <tbody>
              {dashboard.bySeverity.map((r) => (
                <tr key={r.severity}>
                  <td>{r.severity}</td>
                  <td>{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <h3>Por canal (24h)</h3>
          <table className="data-table">
            <tbody>
              {dashboard.byChannel.map((r) => (
                <tr key={r.channel}>
                  <td>{r.channel}</td>
                  <td>{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
