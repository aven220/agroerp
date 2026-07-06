import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { listIamUsers } from '../api/iam';

export function IamUsersPage() {
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { listIamUsers().then((u) => setUsers(u as Array<Record<string, unknown>>)); }, []);

  return (
    <>
      <Header
        title="Administrador de Usuarios (IAM)"
        subtitle="Vista de seguridad — solo lectura"
        actions={
          <div className="row-actions">
            <Link to="/administracion/usuarios" className="btn btn-primary">
              Gestionar usuarios
            </Link>
            <Link to="/iam" className="btn">
              Centro Seguridad
            </Link>
          </div>
        }
      />
      <p className="text-muted" style={{ marginBottom: '1rem' }}>
        Para crear, editar o eliminar cuentas use{' '}
        <Link to="/administracion/usuarios">Administración → Usuarios del sistema</Link>.
      </p>
      <table className="data-table">
        <thead><tr><th>Email</th><th>Nombre</th><th>Estado</th><th>MFA</th><th>Último acceso</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={String(u.id)}>
              <td>{String(u.email)}</td>
              <td>{String(u.firstName)} {String(u.lastName)}</td>
              <td>{String(u.status)}</td>
              <td>{u.mfaEnabled ? 'Sí' : 'No'}</td>
              <td>{u.lastLoginAt ? new Date(String(u.lastLoginAt)).toLocaleString('es-CO') : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
