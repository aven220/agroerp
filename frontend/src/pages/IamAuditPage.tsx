import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listIamAudit, listIamSessions, revokeIamSession } from '../api/iam';

export function IamAuditPage() {
  const [events, setEvents] = useState<Array<Record<string, unknown>>>([]);
  const [sessions, setSessions] = useState<Array<{ id: string; userId: string; ipAddress?: string; browser?: string; os?: string; status: string }>>([]);

  function reload() {
    listIamAudit().then((e) => setEvents(e as Array<Record<string, unknown>>));
    listIamSessions().then((s) => setSessions(s as typeof sessions));
  }

  useEffect(() => { reload(); }, []);

  return (
    <>
      <Header title="Centro de Auditoría" actions={<Link to="/iam" className="btn">Centro Seguridad</Link>} />
      <section className="panel">
        <h3>Sesiones activas</h3>
        <table className="data-table data-table-compact">
          <thead><tr><th>Usuario</th><th>IP</th><th>Navegador</th><th>OS</th><th></th></tr></thead>
          <tbody>
            {sessions.filter((s) => s.status === 'active').map((s) => (
              <tr key={s.id}>
                <td>{s.userId.slice(0, 8)}</td>
                <td>{s.ipAddress}</td>
                <td>{s.browser}</td>
                <td>{s.os}</td>
                <td><button type="button" className="btn btn-sm" onClick={() => revokeIamSession(s.id).then(reload)}>Cerrar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel">
        <h3>Eventos de seguridad</h3>
        <table className="data-table">
          <thead><tr><th>Tipo</th><th>Usuario</th><th>IP</th><th>Fecha</th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={String(e.id)}>
                <td>{String(e.eventType)}</td>
                <td>{String(e.userId ?? '-')}</td>
                <td>{String(e.ipAddress ?? '-')}</td>
                <td>{new Date(String(e.createdAt)).toLocaleString('es-CO')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
