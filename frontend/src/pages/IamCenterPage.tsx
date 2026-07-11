import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FlowProgress } from '../components/flow/FlowProgress';
import {
  PageLayout,
  PageHeader,
  PageSection,
  PageState,
  PageSummary,
  MetricCard,
  SimpleRecordsTable,
  type SimpleColumn,
} from '../components/page';
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

type AlertRow = {
  id: string;
  severity: string;
  alertType: string;
  description: string;
};

const alertColumns: SimpleColumn<AlertRow>[] = [
  {
    key: 'severity',
    label: 'Prioridad',
    getValue: (r) => SEVERITY_LABELS[r.severity] ?? r.severity,
  },
  { key: 'alertType', label: 'Tipo', getValue: (r) => r.alertType },
  { key: 'description', label: 'Descripción', getValue: (r) => r.description },
];

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
  if (error && !center) return <PageState variant="error" message={error} />;
  if (!center) return null;

  const alerts = center.alerts as AlertRow[];

  return (
    <PageLayout>
      <PageHeader
        title="Usuarios y accesos"
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

      <PageSummary className="kpi-grid-lg">
        <MetricCard label="Usuarios" value={center.userCount} tone="green" />
        <MetricCard label="Roles" value={center.roleCount} />
        <MetricCard label="Sesiones activas" value={center.activeSessions} />
        <MetricCard label="Inicios exitosos (24 h)" value={center.dashboard.loginSuccess24h} tone="green" />
        <MetricCard label="Intentos fallidos (24 h)" value={center.dashboard.loginFailure24h} />
        <MetricCard label="Accesos denegados (24 h)" value={center.dashboard.accessDenied24h} />
        <MetricCard label="Anomalías abiertas" value={center.dashboard.openAnomalies} />
      </PageSummary>

      <PageSection title="Alertas de seguridad" description="Eventos que requieren revisión por el administrador.">
        <SimpleRecordsTable
          gridId="iam-center-alerts"
          columns={alertColumns}
          data={alerts}
          selectable={false}
          emptyMessage="Sin alertas de seguridad"
          emptyDescription="No hay eventos de riesgo pendientes en las últimas 24 horas."
        />
      </PageSection>
    </PageLayout>
  );
}
