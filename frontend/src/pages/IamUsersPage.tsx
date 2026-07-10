import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageState,
} from '../components/page';
import { listIamUsers } from '../api/iam';
import { USER_STATUS_LABELS } from '../lib/adminLabels';

export function IamUsersPage() {
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listIamUsers()
      .then((u) => {
        setUsers(u as Array<Record<string, unknown>>);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageLayout>
      <PageHeader
        title="Consulta de usuarios"
        subtitle="Vista de solo lectura para auditoría de accesos. Para crear o editar, use Administración."
        actions={
          <PageActions>
            <Link to="/administracion/usuarios" className="btn btn-primary">
              Gestionar usuarios
            </Link>
            <Link to="/iam" className="btn">
              Centro de seguridad
            </Link>
          </PageActions>
        }
      />

      <PageSection title="Información">
        <p className="page-help">
          Esta pantalla es informativa. Para altas, cambios de rol o desactivación use{' '}
          <Link to="/administracion/usuarios">Administración → Usuarios</Link>.
        </p>
      </PageSection>

      {error ? <PageState variant="error" message={error} /> : null}

      {loading ? (
        <PageState variant="loading" message="Cargando usuarios…" loadingVariant="table" />
      ) : !error && users.length === 0 ? (
        <PageState
          variant="empty"
          title="No hay usuarios registrados"
          message="Cuando existan cuentas en la organización, aparecerán aquí con su estado de seguridad."
          action={{ label: 'Crear primer usuario', to: '/administracion/usuarios' }}
        />
      ) : (
        <PageSection title="Usuarios">
          <div className="table-wrap">
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
          </div>
        </PageSection>
      )}
    </PageLayout>
  );
}
