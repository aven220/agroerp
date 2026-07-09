import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { EmptyState } from '../components/ui/EmptyState';
import { exportIamRole, listIamRoles } from '../api/iam';

export function IamRolesPage() {
  const [roles, setRoles] = useState<Array<{ id: string; name: string; slug: string; isSystem: boolean }>>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    listIamRoles()
      .then((r) => {
        setRoles(r as typeof roles);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar los roles'));
  }, []);

  return (
    <>
      <Header
        title="Roles de seguridad"
        subtitle="Defina qué puede hacer cada perfil en la organización"
        actions={<Link to="/iam" className="btn">Centro de seguridad</Link>}
      />
      <p className="muted page-help">
        Los roles agrupan permisos. El identificador interno es un código técnico usado por el sistema; los usuarios solo ven el nombre del rol.
      </p>
      {error ? <div className="alert alert-error">{error}</div> : null}
      {roles.length === 0 && !error ? (
        <EmptyState
          illustration="data"
          title="No hay roles configurados"
          description="Los roles definen los permisos de cada tipo de usuario en la organización."
          action={{ label: 'Ir a administración', to: '/administracion' }}
        />
      ) : (
      <table className="data-table">
        <thead><tr><th>Nombre del rol</th><th>Tipo</th><th></th></tr></thead>
        <tbody>
          {roles.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>{r.isSystem ? 'Rol del sistema' : 'Rol personalizado'}</td>
              <td>
                <button
                  type="button"
                  className="btn btn-sm"
                  title="Descargar definición del rol para respaldo o migración"
                  onClick={() =>
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
                      .catch((err) => setError(err instanceof Error ? err.message : 'Exportación fallida'))
                  }
                >
                  Exportar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
    </>
  );
}
