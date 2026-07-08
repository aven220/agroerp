import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
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
      <Header title="Administrador de Roles" subtitle="Clonar · versionar · exportar" actions={<Link to="/iam" className="btn">Centro Seguridad</Link>} />
      {error ? <div className="alert alert-error">{error}</div> : null}
      <table className="data-table">
        <thead><tr><th>Nombre</th><th>Slug</th><th>Sistema</th><th></th></tr></thead>
        <tbody>
          {roles.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>{r.slug}</td>
              <td>{r.isSystem ? 'Sí' : 'No'}</td>
              <td><button type="button" className="btn btn-sm" onClick={() => exportIamRole(r.id).then((d) => alert(JSON.stringify(d, null, 2))).catch((err) => setError(err instanceof Error ? err.message : 'Exportación fallida'))}>Exportar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!error && roles.length === 0 ? <p className="text-muted">No hay roles para mostrar.</p> : null}
    </>
  );
}
