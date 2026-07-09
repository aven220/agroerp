import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { FlowNextActions } from '../components/flow/FlowNextActions';
import { FlowProgress } from '../components/flow/FlowProgress';
import { EmptyState } from '../components/ui/EmptyState';
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
    <>
      <Header
        title="Auditoría de seguridad"
        subtitle="Sesiones activas y registro de eventos de acceso"
        actions={
          <div className="row-actions">
            <button type="button" className="btn" onClick={reload}>Actualizar</button>
            <Link to="/iam" className="btn">Centro de seguridad</Link>
          </div>
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

      <p className="muted page-help">
        Cierre sesiones sospechosas de inmediato. Los eventos se conservan para trazabilidad y cumplimiento.
      </p>

      {error ? <div className="alert alert-error">{error}</div> : null}

      <section className="panel">
        <h3>Sesiones activas</h3>
        <p className="muted">Dispositivos con sesión abierta en este momento.</p>
        {activeSessions.length === 0 ? (
          <EmptyState
            illustration="inbox"
            title="No hay sesiones activas"
            description="Ningún usuario tiene una sesión abierta en este momento, o no tiene permisos para verlas."
          />
        ) : (
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
        )}
      </section>

      <section className="panel">
        <h3>Eventos recientes</h3>
        {events.length === 0 ? (
          <EmptyState
            illustration="data"
            title="Sin eventos registrados"
            description="Los inicios de sesión, bloqueos y cambios de seguridad aparecerán aquí."
          />
        ) : (
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
        )}
      </section>
    </>
  );
}
