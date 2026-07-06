import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEihBusInfo, getEihCenter, type EihDashboard } from '../api/integration';
import { LoadingState } from '../components/ux/LoadingState';

export function IntegrationDashboardPage() {
  const [dashboard, setDashboard] = useState<EihDashboard | null>(null);
  const [bus, setBus] = useState<unknown>(null);

  useEffect(() => {
    getEihCenter().then((c) => setDashboard(c.dashboard));
    getEihBusInfo().then(setBus);
  }, []);

  if (!dashboard) return <LoadingState variant="dashboard" message="Cargando dashboard..." />;

  return (
    <>
      <Header
        title="Dashboard de integraciones"
        subtitle="KPIs y bus de integración"
        actions={<Link to="/integraciones" className="btn">Centro</Link>}
      />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card"><span className="kpi-label">Duración promedio</span><span className="kpi-value">{dashboard.avgDurationMs}ms</span></div>
        <div className="kpi-card"><span className="kpi-label">Webhooks activos</span><span className="kpi-value">{dashboard.webhooks}</span></div>
        <div className="kpi-card"><span className="kpi-label">Sync fallidos 24h</span><span className="kpi-value">{dashboard.failedSyncs24h}</span></div>
        <div className="kpi-card"><span className="kpi-label">Conectores en error</span><span className="kpi-value">{dashboard.errorConnectors}</span></div>
      </div>
      <section className="panel">
        <h3>Integration Bus</h3>
        <pre className="code-block">{JSON.stringify(bus, null, 2)}</pre>
      </section>
      <section className="panel">
        <h3>Últimas ejecuciones</h3>
        <table className="data-table data-table-compact">
          <thead><tr><th>Run</th><th>Estado</th><th>Entrada</th><th>Salida</th><th>Duración</th></tr></thead>
          <tbody>
            {dashboard.recentRuns.map((r) => (
              <tr key={r.runKey}>
                <td>{r.runKey}</td>
                <td>{r.status}</td>
                <td>{r.recordsIn}</td>
                <td>{r.recordsOut}</td>
                <td>{r.durationMs ?? '—'}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
