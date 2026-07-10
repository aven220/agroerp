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
  EmptyPanel,
} from '../components/page';
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

export function IamAuditPage() {
  const [events, setEvents] = useState<Array<Record<string, unknown>>>([]);
  const [sessions, setSessions] = useState<
    Array<{ id: string; userId: string; ipAddress?: string; browser?: string; os?: string; status: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    listIamAudit()
      .then((e) => setEvents(e as Array<Record<string, unknown>>))
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar la auditoría'));
    listIamSessions()
      .then((s) => setSessions(s as typeof sessions))
      .catch(() => {});
  }

  useEffect(() => {
    reload();
  }, []);

  const activeSessions = sessions.filter((s) => s.status === 'active');

  return (
    <PageLayout>
      <PageHeader
        title="Auditoría de seguridad"
        subtitle="Sesiones activas y registro de eventos de acceso"
        actions={
          <PageActions>
            <button type="button" className="btn" onClick={reload}>Actualizar</button>
            <Link to="/iam" className="btn">Centro de seguridad</Link>
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
        {activeSessions.length === 0 ? (
          <EmptyPanel
            title="No hay sesiones activas"
            description="Ningún usuario tiene una sesión abierta en este momento, o no tiene permisos para verlas."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table data-table-compact">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Dirección IP</th>
                  <th>Navegador</th>
                  <th>Sistema</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {activeSessions.map((s) => (
                  <tr key={s.id}>
                    <td title={s.userId}>{s.userId.slice(0, 8)}…</td>
                    <td>{s.ipAddress ?? '—'}</td>
                    <td>{s.browser ?? '—'}</td>
                    <td>{s.os ?? '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        title="Cierra la sesión en ese dispositivo"
                        onClick={() => {
                          if (confirm('¿Cerrar esta sesión? El usuario deberá volver a iniciar sesión en ese dispositivo.')) {
                            revokeIamSession(s.id).then(reload);
                          }
                        }}
                      >
                        Cerrar sesión
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      <PageSection title="Eventos recientes">
        {events.length === 0 ? (
          <EmptyPanel
            title="Sin eventos registrados"
            description="Los inicios de sesión, bloqueos y cambios de seguridad aparecerán aquí."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Usuario</th>
                  <th>IP</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={String(e.id)}>
                    <td>{EVENT_LABELS[String(e.eventType)] ?? String(e.eventType)}</td>
                    <td>{e.userId ? `${String(e.userId).slice(0, 8)}…` : '—'}</td>
                    <td>{String(e.ipAddress ?? '—')}</td>
                    <td>{new Date(String(e.createdAt)).toLocaleString('es-CO')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>
    </PageLayout>
  );
}
