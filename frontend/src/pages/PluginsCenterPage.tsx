import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEppmCenter, type EppmCenter } from '../api/plugins';
import { LoadingState } from '../components/ux/LoadingState';

export function PluginsCenterPage() {
  const [center, setCenter] = useState<EppmCenter | null>(null);
  useEffect(() => { getEppmCenter().then(setCenter); }, []);
  if (!center) return <LoadingState variant="dashboard" message="Cargando Centro de Plugins..." />;

  const d = center.dashboard;
  return (
    <>
      <Header
        title="Centro de Plugins — EPPM"
        subtitle="Enterprise Plugin Platform & Marketplace"
        actions={
          <div className="row-actions">
            <Link to="/plugins/marketplace" className="btn btn-primary">Marketplace</Link>
            <Link to="/plugins/admin" className="btn">Extensiones</Link>
            <Link to="/plugins/actualizaciones" className="btn">Actualizaciones</Link>
            <Link to="/plugins/desarrolladores" className="btn">Desarrolladores</Link>
          </div>
        }
      />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Publicados</span><span className="kpi-value">{d.totalPublished}</span></div>
        <div className="kpi-card"><span className="kpi-label">Instalados</span><span className="kpi-value">{d.installedCount}</span></div>
        <div className="kpi-card"><span className="kpi-label">Habilitados</span><span className="kpi-value">{d.enabledCount}</span></div>
        <div className="kpi-card"><span className="kpi-label">Deshabilitados</span><span className="kpi-value">{d.disabledCount}</span></div>
        <div className="kpi-card"><span className="kpi-label">Fallos</span><span className="kpi-value">{d.failedInstalls}</span></div>
        <div className="kpi-card"><span className="kpi-label">Updates pendientes</span><span className="kpi-value">{d.pendingUpdates}</span></div>
        <div className="kpi-card"><span className="kpi-label">Auditoría 24h</span><span className="kpi-value">{d.audit24h}</span></div>
      </div>
      {center.suggestions.length > 0 && (
        <section className="panel">
          <h3>Sugerencias IA</h3>
          <table className="data-table data-table-compact">
            <thead><tr><th>Tipo</th><th>Recomendación</th></tr></thead>
            <tbody>
              {center.suggestions.map((s, i) => (
                <tr key={i}>
                  <td>{String((s as { type?: string }).type ?? '')}</td>
                  <td>{String((s as { recommendation?: string }).recommendation ?? JSON.stringify(s))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {center.installs.length > 0 && (
        <section className="panel">
          <h3>Extensiones activas</h3>
          <table className="data-table data-table-compact">
            <thead><tr><th>Plugin</th><th>Versión</th><th>Estado</th><th>Tipo</th></tr></thead>
            <tbody>
              {center.installs.map((i) => (
                <tr key={i.id}>
                  <td>{i.plugin.name}</td>
                  <td>{i.installedVersion}</td>
                  <td>{i.status}</td>
                  <td>{i.plugin.pluginType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
