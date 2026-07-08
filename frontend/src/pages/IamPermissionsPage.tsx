import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PermissionMatrix } from '../components/admin/PermissionMatrix';
import { Header } from '../components/layout/Header';
import { getEffectivePermissions, listIamPermissions } from '../api/iam';
import type { Permission } from '../types';

export function IamPermissionsPage() {
  const [perms, setPerms] = useState<Permission[]>([]);
  const [effective, setEffective] = useState<{ permissions?: string[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([listIamPermissions(), getEffectivePermissions()])
      .then(([list, eff]) => {
        const normalized = (list as Array<{ id?: string; resource: string; action: string }>).map(
          (p, i) =>
            ({
              id: p.id ?? `${p.resource}:${p.action}:${i}`,
              resource: p.resource,
              action: p.action,
              scope: 'org',
              description: undefined,
            }) satisfies Permission,
        );
        setPerms(normalized);
        setEffective(eff as typeof effective);
      })
      .catch(() => {
        setPerms([]);
        setEffective(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const selected = useMemo(() => effective?.permissions ?? [], [effective]);

  return (
    <>
      <Header
        title="Administrador de Permisos"
        subtitle="Catálogo IAM agrupado por módulo y recurso"
        actions={
          <Link to="/iam" className="btn">
            Centro Seguridad
          </Link>
        }
      />

      {effective ? (
        <section className="panel card" style={{ marginBottom: 'var(--ds-space-4)' }}>
          <div className="card-header">
            <div>
              <h3 className="page-section-title" style={{ margin: 0 }}>
                Permisos efectivos (su sesión)
              </h3>
              <p className="text-muted" style={{ margin: '0.25rem 0 0' }}>
                {selected.length} permisos activos en esta sesión
              </p>
            </div>
            <span className="ds-badge ds-badge-info">{selected.length}</span>
          </div>
          <div className="ds-cluster" style={{ paddingTop: 0 }}>
            {selected.slice(0, 24).map((p) => (
              <span key={p} className="ds-badge">
                {p}
              </span>
            ))}
            {selected.length > 24 ? (
              <span className="ds-badge">+{selected.length - 24} más</span>
            ) : null}
          </div>
        </section>
      ) : null}

      {loading ? (
        <p className="text-muted">Cargando permisos…</p>
      ) : (
        <section className="panel card">
          <PermissionMatrix
            permissions={perms}
            selected={selected}
            onChange={() => undefined}
            readOnly
          />
        </section>
      )}
    </>
  );
}
