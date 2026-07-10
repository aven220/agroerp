import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageActions,
  PageSection,
  PageState,
} from '../components/page';
import { EnterpriseDataGrid } from '../components/data-workspace/EnterpriseDataGrid';
import type { GridColumnDef } from '../lib/data-grid/types';
import { listIamUsers } from '../api/iam';
import { USER_STATUS_LABELS } from '../lib/adminLabels';

type IamUserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  mfaEnabled: boolean;
  lastLoginAt?: string;
};

const columns: GridColumnDef<IamUserRow>[] = [
  { key: 'email', label: 'Correo', getValue: (u) => u.email },
  {
    key: 'name',
    label: 'Nombre',
    getValue: (u) => `${u.firstName} ${u.lastName}`,
    render: (u) => `${u.firstName} ${u.lastName}`,
  },
  {
    key: 'status',
    label: 'Estado',
    getValue: (u) => USER_STATUS_LABELS[u.status] ?? u.status,
    render: (u) => USER_STATUS_LABELS[u.status] ?? u.status,
  },
  {
    key: 'mfa',
    label: 'Autenticación 2 pasos',
    getValue: (u) => (u.mfaEnabled ? 'Activada' : 'No configurada'),
    render: (u) => (u.mfaEnabled ? 'Activada' : 'No configurada'),
  },
  {
    key: 'lastLogin',
    label: 'Último acceso',
    getValue: (u) => (u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('es-CO') : 'Sin registro'),
    render: (u) =>
      u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('es-CO') : 'Sin registro',
  },
];

export function IamUsersPage() {
  const [users, setUsers] = useState<IamUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listIamUsers()
      .then((u) => {
        setUsers(
          (u as Array<Record<string, unknown>>).map((row) => ({
            id: String(row.id),
            email: String(row.email ?? ''),
            firstName: String(row.firstName ?? ''),
            lastName: String(row.lastName ?? ''),
            status: String(row.status ?? ''),
            mfaEnabled: Boolean(row.mfaEnabled),
            lastLoginAt: row.lastLoginAt ? String(row.lastLoginAt) : undefined,
          })),
        );
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
              Usuarios y accesos
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
          <EnterpriseDataGrid
            gridId="iam-users"
            columns={columns}
            data={users}
            selectable={false}
            emptyMessage="No hay usuarios registrados"
          />
        </PageSection>
      )}
    </PageLayout>
  );
}
