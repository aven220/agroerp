import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageSection,
  PageState,
} from '../components/page';
import { EnterpriseDataGrid } from '../components/data-workspace/EnterpriseDataGrid';
import type { GridColumnDef, RowAction } from '../lib/data-grid/types';
import { exportIamRole, listIamRoles } from '../api/iam';

type IamRoleRow = { id: string; name: string; slug: string; isSystem: boolean };

const columns: GridColumnDef<IamRoleRow>[] = [
  { key: 'name', label: 'Nombre del rol', getValue: (r) => r.name },
  {
    key: 'type',
    label: 'Tipo',
    getValue: (r) => (r.isSystem ? 'Rol del sistema' : 'Rol personalizado'),
    render: (r) => (r.isSystem ? 'Rol del sistema' : 'Rol personalizado'),
  },
];

export function IamRolesPage() {
  const [roles, setRoles] = useState<IamRoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listIamRoles()
      .then((r) => {
        setRoles(r as IamRoleRow[]);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar los roles'))
      .finally(() => setLoading(false));
  }, []);

  const rowActions: RowAction<IamRoleRow>[] = [
    {
      id: 'export',
      label: 'Exportar',
      onAction: (r) => {
        exportIamRole(r.id)
          .then((d) => {
            const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rol-${r.name.replace(/\s+/g, '-').toLowerCase()}.json`;
            a.click();
            URL.revokeObjectURL(url);
          })
          .catch((err) => setError(err instanceof Error ? err.message : 'Exportación fallida'));
      },
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Roles de seguridad"
        subtitle="Defina qué puede hacer cada perfil en la organización"
        actions={<Link to="/iam" className="btn">Usuarios y accesos</Link>}
      />

      <PageSection>
        <p className="page-help">
          Los roles agrupan permisos. El identificador interno es un código técnico usado por el sistema; los usuarios solo ven el nombre del rol.
        </p>
      </PageSection>

      {error ? <PageState variant="error" message={error} /> : null}

      {loading ? (
        <PageState variant="loading" message="Cargando roles…" loadingVariant="table" />
      ) : roles.length === 0 && !error ? (
        <PageState
          variant="empty"
          title="No hay roles configurados"
          message="Los roles definen los permisos de cada tipo de usuario en la organización."
          action={{ label: 'Ir a administración', to: '/administracion' }}
        />
      ) : (
        <PageSection title="Roles">
          <EnterpriseDataGrid
            gridId="iam-roles"
            columns={columns}
            data={roles}
            selectable={false}
            rowActions={rowActions}
            emptyMessage="No hay roles configurados"
          />
        </PageSection>
      )}
    </PageLayout>
  );
}
