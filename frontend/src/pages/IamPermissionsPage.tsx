import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { getEffectivePermissions, listIamPermissions } from '../api/iam';

export function IamPermissionsPage() {
  const [perms, setPerms] = useState<Array<{ resource: string; action: string }>>([]);
  const [effective, setEffective] = useState<{ permissions?: string[] } | null>(null);
  useEffect(() => {
    listIamPermissions().then((p) => setPerms(p as typeof perms));
    getEffectivePermissions().then((e) => setEffective(e as typeof effective));
  }, []);

  return (
    <>
      <Header title="Administrador de Permisos" actions={<Link to="/iam" className="btn">Centro Seguridad</Link>} />
      {effective && (
        <section className="panel">
          <h3>Permisos efectivos (su sesión)</h3>
          <p>{effective.permissions?.join(', ')}</p>
        </section>
      )}
      <table className="data-table data-table-compact">
        <thead><tr><th>Recurso</th><th>Acción</th></tr></thead>
        <tbody>
          {perms.map((p, i) => (
            <tr key={i}><td>{p.resource}</td><td>{p.action}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
