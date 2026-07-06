import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getIamCenter, type IamCenter } from '../api/iam';
import { LoadingState } from '../components/ux/LoadingState';

export function IamCenterPage() {
  const [center, setCenter] = useState<IamCenter | null>(null);
  useEffect(() => { getIamCenter().then(setCenter); }, []);
  if (!center) return <LoadingState variant="dashboard" message="Cargando Centro de Seguridad..." />;

  return (
    <>
      <Header
        title="Centro de Seguridad — EIAMP"
        subtitle="Identity & Access Management"
        actions={
          <div className="row-actions">
            <Link to="/administracion/usuarios" className="btn btn-primary">Gestionar usuarios</Link>
            <Link to="/iam/usuarios" className="btn">Vista IAM</Link>
            <Link to="/iam/roles" className="btn">Roles</Link>
            <Link to="/iam/politicas" className="btn">Políticas</Link>
            <Link to="/iam/auditoria" className="btn">Auditoría</Link>
            <Link to="/iam/permisos" className="btn">Permisos</Link>
          </div>
        }
      />
      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary"><span className="kpi-label">Usuarios</span><span className="kpi-value">{center.userCount}</span></div>
        <div className="kpi-card"><span className="kpi-label">Roles</span><span className="kpi-value">{center.roleCount}</span></div>
        <div className="kpi-card"><span className="kpi-label">Sesiones activas</span><span className="kpi-value">{center.activeSessions}</span></div>
        <div className="kpi-card"><span className="kpi-label">Login OK 24h</span><span className="kpi-value">{center.dashboard.loginSuccess24h}</span></div>
        <div className="kpi-card"><span className="kpi-label">Fallos 24h</span><span className="kpi-value">{center.dashboard.loginFailure24h}</span></div>
        <div className="kpi-card"><span className="kpi-label">Acceso denegado</span><span className="kpi-value">{center.dashboard.accessDenied24h}</span></div>
        <div className="kpi-card"><span className="kpi-label">Anomalías</span><span className="kpi-value">{center.dashboard.openAnomalies}</span></div>
      </div>
      {center.alerts.length > 0 && (
        <section className="panel">
          <h3>Alertas de riesgo (IA)</h3>
          <table className="data-table data-table-compact">
            <tbody>
              {center.alerts.map((a) => (
                <tr key={a.id}><td>{a.severity}</td><td>{a.alertType}</td><td>{a.description}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
