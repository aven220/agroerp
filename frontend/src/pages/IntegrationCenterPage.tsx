import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEihCenter, type EihCenter } from '../api/integration';
import { LoadingState } from '../components/ux/LoadingState';

export function IntegrationCenterPage() {
  const [center, setCenter] = useState<EihCenter | null>(null);
  useEffect(() => { getEihCenter().then(setCenter); }, []);
  if (!center) return <LoadingState variant="dashboard" message="Cargando Centro de Integraciones..." />;

  const d = center.dashboard;
  return (
    <>
      <Header
        title="Centro de Integraciones — EIH"
        subtitle="Enterprise Integration Hub"
        actions={
          <div className="row-actions">
            <Link to="/integraciones/conectores" className="btn">Conectores</Link>
            <Link to="/integraciones/flujos" className="btn">Flujos</Link>
            <Link to="/integraciones/historial" className="btn">Historial</Link>
            <Link to="/integraciones/errores" className="btn">Errores</Link>
            <Link to="/integraciones/dashboard" className="btn">Dashboard</Link>
          </div>
        }
      />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Conectores</span><span className="kpi-value">{d.totalConnectors}</span></div>
        <div className="kpi-card"><span className="kpi-label">Activos</span><span className="kpi-value">{d.activeConnectors}</span></div>
        <div className="kpi-card"><span className="kpi-label">Flujos publicados</span><span className="kpi-value">{d.publishedFlows}</span></div>
        <div className="kpi-card"><span className="kpi-label">Sync 24h</span><span className="kpi-value">{d.syncs24h}</span></div>
        <div className="kpi-card"><span className="kpi-label">Tasa éxito</span><span className="kpi-value">{d.successRate24h}%</span></div>
        <div className="kpi-card"><span className="kpi-label">Errores pendientes</span><span className="kpi-value">{d.pendingErrors}</span></div>
      </div>
      {center.suggestions.length > 0 && (
        <section className="panel">
          <h3>Análisis IA</h3>
          <table className="data-table data-table-compact">
            <thead><tr><th>Tipo</th><th>Recomendación</th></tr></thead>
            <tbody>
              {center.suggestions.map((s, i) => (
                <tr key={i}>
                  <td>{String((s as { type?: string }).type ?? '')}</td>
                  <td>{String((s as { recommendation?: string }).recommendation ?? '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
