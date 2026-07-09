import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PermissionMatrix } from '../components/admin/PermissionMatrix';
import { PermissionSummary } from '../components/admin/PermissionSummary';
import { FlowNextActions } from '../components/flow/FlowNextActions';
import { FlowProgress } from '../components/flow/FlowProgress';
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
        title="Catálogo de permisos"
        subtitle="Todos los permisos del sistema, agrupados por área de negocio"
        actions={
          <Link to="/iam" className="btn">
            Centro de seguridad
          </Link>
        }
      />

      <FlowProgress flowId="administration" currentStepId="permissions" />

      <FlowNextActions
        title="¿Necesita asignar permisos?"
        subtitle="Los permisos se asignan a través de roles en Administración."
        actions={[
          {
            label: 'Configurar rol',
            description: 'Defina qué puede hacer cada perfil',
            to: '/administracion',
            primary: true,
            icon: '🔐',
          },
          {
            label: 'Ver auditoría',
            description: 'Revise accesos y sesiones activas',
            to: '/iam/auditoria',
            icon: '📋',
          },
        ]}
      />

      <p className="muted page-help">
        Esta vista es de consulta. Para asignar permisos a un rol, use{' '}
        <Link to="/administracion">Administración → Crear rol</Link>.
      </p>

      {effective ? (
        <section className="panel card" style={{ marginBottom: 'var(--ds-space-4)' }}>
          <div className="card-header">
            <div>
              <h3 className="page-section-title" style={{ margin: 0 }}>
                Sus permisos en esta sesión
              </h3>
              <p className="text-muted" style={{ margin: '0.25rem 0 0' }}>
                Resumen de lo que su cuenta puede hacer actualmente
              </p>
            </div>
            <span className="ds-badge ds-badge-info">{selected.length}</span>
          </div>
          <PermissionSummary permissions={perms} selected={selected} compact />
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
