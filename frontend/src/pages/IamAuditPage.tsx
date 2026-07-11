import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FlowNextActions } from '../components/flow/FlowNextActions';
import { FlowProgress } from '../components/flow/FlowProgress';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageState,
  SimpleRecordsTable,
  withRowId,
  type SimpleColumn,
} from '../components/page';
import type { RowAction } from '../lib/data-grid/types';
import { listIamAudit, listIamSessions, revokeIamSession } from '../api/iam';

const EVENT_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: 'Inicio de sesión exitoso',
  LOGIN_FAILURE: 'Intento de acceso fallido',
  LOGOUT: 'Cierre de sesión',
  ACCESS_DENIED: 'Acceso denegado',
  MFA_ENABLED: 'Autenticación en dos pasos activada',
  MFA_VERIFIED: 'Código verificado',
  PASSWORD_CHANGED: 'Contraseña cambiada',
  SESSION_REVOKED: 'Sesión cerrada por administrador',
};

type SessionRow = {
  id: string;
  userId: string;
  ipAddress?: string;
  browser?: string;
  os?: string;
  status: string;
};

type EventRow = Record<string, unknown> & { id: string };

const sessionColumns: SimpleColumn<SessionRow>[] = [
  {
    key: 'userId',
    label: 'Usuario',
    render: (r) => <span title={r.userId}>{r.userId.slice(0, 8)}…</span>,
    getValue: (r) => r.userId,
  },
  { key: 'ipAddress', label: 'Dirección IP', getValue: (r) => r.ipAddress ?? '—' },
  { key: 'browser', label: 'Navegador', getValue: (r) => r.browser ?? '—' },
  { key: 'os', label: 'Sistema', getValue: (r) => r.os ?? '—' },
];

const eventColumns: SimpleColumn<EventRow>[] = [
  {
    key: 'eventType',
    label: 'Evento',
    getValue: (r) => EVENT_LABELS[String(r.eventType)] ?? String(r.eventType),
  },
  {
    key: 'userId',
    label: 'Usuario',
    getValue: (r) => (r.userId ? `${String(r.userId).slice(0, 8)}…` : '—'),
  },
  { key: 'ipAddress', label: 'IP', getValue: (r) => String(r.ipAddress ?? '—') },
  {
    key: 'createdAt',
    label: 'Fecha',
    getValue: (r) => new Date(String(r.createdAt)).toLocaleString('es-CO'),
  },
];

export function IamAuditPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    listIamAudit()
      .then((e) =>
        setEvents((e as Array<Record<string, unknown>>).map((row) => withRowId(row, 'id'))),
      )
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar la auditoría'));
    listIamSessions()
      .then((s) => setSessions(s as SessionRow[]))
      .catch(() => {});
  }

  useEffect(() => {
    reload();
  }, []);

  const activeSessions = sessions.filter((s) => s.status === 'active');

  const sessionActions: RowAction<SessionRow>[] = [
    {
      id: 'revoke',
      label: 'Cerrar sesión',
      variant: 'danger',
      onAction: (s) => {
        if (confirm('¿Cerrar esta sesión? El usuario deberá volver a iniciar sesión en ese dispositivo.')) {
          revokeIamSession(s.id).then(reload);
        }
      },
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Auditoría de seguridad"
        subtitle="Sesiones activas y registro de eventos de acceso"
        actions={
          <PageActions>
            <button type="button" className="btn" onClick={reload}>Actualizar</button>
            <Link to="/iam" className="btn">Usuarios y accesos</Link>
          </PageActions>
        }
      />

      <FlowProgress flowId="administration" currentStepId="audit" />

      <FlowNextActions
        title="Flujo completado"
        subtitle="Su organización tiene usuarios, roles y trazabilidad de accesos."
        actions={[
          {
            label: 'Gestionar usuarios',
            description: 'Crear o editar cuentas de acceso',
            to: '/administracion/usuarios',
            icon: '👤',
          },
          {
            label: 'Volver a roles',
            description: 'Ajustar perfiles y permisos',
            to: '/administracion',
            icon: '🔐',
          },
        ]}
      />

      <PageSection title="Información">
        <p className="page-help">
          Cierre sesiones sospechosas de inmediato. Los eventos se conservan para trazabilidad y cumplimiento.
        </p>
      </PageSection>

      {error ? <PageState variant="error" message={error} onRetry={reload} /> : null}

      <PageSection title="Sesiones activas" description="Dispositivos con sesión abierta en este momento.">
        <SimpleRecordsTable
          gridId="iam-active-sessions"
          columns={sessionColumns}
          data={activeSessions}
          selectable={false}
          rowActions={sessionActions}
          emptyMessage="No hay sesiones activas"
          emptyDescription="Ningún usuario tiene una sesión abierta en este momento, o no tiene permisos para verlas."
        />
      </PageSection>

      <PageSection title="Eventos recientes">
        <SimpleRecordsTable
          gridId="iam-audit-events"
          columns={eventColumns}
          data={events}
          selectable={false}
          emptyMessage="Sin eventos registrados"
          emptyDescription="Los inicios de sesión, bloqueos y cambios de seguridad aparecerán aquí."
        />
      </PageSection>
    </PageLayout>
  );
}
