import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { FlowProgress } from '../components/flow/FlowProgress';
import { EmptyState } from '../components/ui/EmptyState';
import { getIamCenter, type IamCenter } from '../api/iam';
import { LoadingState } from '../components/ux/LoadingState';

const SEVERITY_LABELS: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
};

const IAM_SECTIONS = [
  {
    to: '/administracion/usuarios',
    title: 'Gestionar usuarios',
    description: 'Crear cuentas, asignar roles y controlar el acceso diario.',
    primary: true,
  },
  {
    to: '/administracion',
    title: 'Roles y permisos',
    description: 'Definir qué puede hacer cada perfil en la organización.',
  },
  {
    to: '/iam/politicas',
    title: 'Políticas de seguridad',
    description: 'Contraseñas, bloqueos y autenticación en dos pasos.',
  },
  {
    to: '/iam/auditoria',
    title: 'Auditoría y sesiones',
    description: 'Revisar accesos, cerrar sesiones activas y eventos de seguridad.',
  },
  {
    to: '/iam/permisos',
    title: 'Catálogo de permisos',
    description: 'Consultar todos los permisos disponibles en el sistema.',
  },
  {
    to: '/iam/usuarios',
    title: 'Vista avanzada de usuarios',
    description: 'Listado de solo lectura con detalle de MFA y último acceso.',
  },
] as const;

export function IamCenterPage() {
  const [center, setCenter] = useState<IamCenter | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getIamCenter()
      .then((c) => {
        setCenter(c);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el centro de seguridad'));
  }, []);

  if (!center && !error) {
    return <LoadingState variant="dashboard" message="Cargando centro de seguridad…" />;
  }
  if (error && !center) return <div className="alert alert-error">{error}</div>;
  if (!center) return null;

  return (
    <>
      <Header
        title="Centro de seguridad"
        subtitle="Supervise accesos, políticas y actividad de su organización"
      />

      <FlowProgress flowId="administration" currentStepId="permissions" />

      <p className="muted page-help">
        Use este panel para vigilar la salud de la seguridad. Para tareas cotidianas — crear usuarios o roles — vaya a Administración.
      </p>

      <div className="iam-hub-grid">
        {IAM_SECTIONS.map((section) => (
          <Link
            key={section.to}
            to={section.to}
            className={`iam-hub-card${'primary' in section && section.primary ? ' admin-hub-card-active' : ''}`}
          >
            <h3>{section.title}</h3>
            <p className="muted">{section.description}</p>
          </Link>
        ))}
      </div>

      <div className="kpi-grid kpi-grid-lg">
        <div className="kpi-card kpi-card-primary">
          <span className="kpi-label">Usuarios</span>
          <span className="kpi-value">{center.userCount}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Roles</span>
          <span className="kpi-value">{center.roleCount}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Sesiones activas</span>
          <span className="kpi-value">{center.activeSessions}</span>
        </div>
        <div className="kpi-card kpi-green">
          <span className="kpi-label">Inicios exitosos (24 h)</span>
          <span className="kpi-value">{center.dashboard.loginSuccess24h}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Intentos fallidos (24 h)</span>
          <span className="kpi-value">{center.dashboard.loginFailure24h}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Accesos denegados (24 h)</span>
          <span className="kpi-value">{center.dashboard.accessDenied24h}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Anomalías abiertas</span>
          <span className="kpi-value">{center.dashboard.openAnomalies}</span>
        </div>
      </div>

      {center.alerts.length > 0 ? (
        <section className="panel">
          <h3>Alertas de seguridad</h3>
          <p className="muted">Eventos que requieren revisión por el administrador.</p>
          <table className="data-table data-table-compact">
            <thead>
              <tr>
                <th>Prioridad</th>
                <th>Tipo</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {center.alerts.map((a) => (
                <tr key={a.id}>
                  <td>{SEVERITY_LABELS[a.severity] ?? a.severity}</td>
                  <td>{a.alertType}</td>
                  <td>{a.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <EmptyState
          illustration="inbox"
          title="Sin alertas de seguridad"
          description="No hay eventos de riesgo pendientes en las últimas 24 horas."
          hint="Revise la auditoría periódicamente para detectar accesos inusuales."
          action={{ label: 'Ver auditoría', to: '/iam/auditoria' }}
        />
      )}
    </>
  );
}
