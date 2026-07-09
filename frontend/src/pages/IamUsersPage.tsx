import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { EmptyState } from '../components/ui/EmptyState';
import { listIamUsers } from '../api/iam';
import { USER_STATUS_LABELS } from '../lib/adminLabels';

export function IamUsersPage() {
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listIamUsers()
      .then((u) => {
        setUsers(u as Array<Record<string, unknown>>);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios'));
  }, []);

  return (
    <>
      <Header
        title="Consulta de usuarios"
        subtitle="Vista de solo lectura para auditoría de accesos. Para crear o editar, use Administración."
        actions={
          <div className="row-actions">
            <Link to="/administracion/usuarios" className="btn btn-primary">
              Gestionar usuarios
            </Link>
            <Link to="/iam" className="btn">
              Centro de seguridad
            </Link>
          </div>
        }
      />

      <div className="admin-help-card" style={{ marginBottom: '1rem' }}>
        <strong>¿Necesita crear o editar usuarios?</strong>
        <p className="muted" style={{ margin: '0.35rem 0 0' }}>
          Esta pantalla es informativa. Para altas, cambios de rol o desactivación use{' '}
          <Link to="/administracion/usuarios">Administración → Usuarios</Link>.
        </p>
      </div>

      {error ? <div className="alert alert-error">{error}</div> : null}

      {!error && users.length === 0 ? (
        <EmptyState
          illustration="data"
          title="No hay usuarios registrados"
          description="Cuando existan cuentas en la organización, aparecerán aquí con su estado de seguridad."
          action={{ label: 'Crear primer usuario', to: '/administracion/usuarios' }}
        />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Correo</th>
              <th>Nombre</th>
              <th>Estado</th>
              <th>Autenticación 2 pasos</th>
              <th>Último acceso</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={String(u.id)}>
                <td>{String(u.email)}</td>
                <td>{String(u.firstName)} {String(u.lastName)}</td>
                <td>{USER_STATUS_LABELS[String(u.status)] ?? String(u.status)}</td>
                <td>{u.mfaEnabled ? 'Activada' : 'No configurada'}</td>
                <td>
                  {u.lastLoginAt
                    ? new Date(String(u.lastLoginAt)).toLocaleString('es-CO')
                    : 'Sin registro'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
