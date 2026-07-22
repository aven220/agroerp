import { Link } from 'react-router-dom';
import type { Role, SystemUser } from '../../types';
import { FlowProgress } from '../flow/FlowProgress';
import { PageSummary, MetricCard } from '../page';

interface AdminHubProps {
  roles: Role[];
  users: SystemUser[];
  canCreateRole: boolean;
  canCreateUser: boolean;
  onCreateRole: () => void;
  onCreateUser: () => void;
  activeTab: 'roles' | 'users';
}

export function AdminHub({
  roles,
  users,
  canCreateRole,
  canCreateUser,
  onCreateRole,
  onCreateUser,
  activeTab,
}: AdminHubProps) {
  const activeUsers = users.filter((u) => u.status === 'active' && !u.lockedAt).length;
  const lockedUsers = users.filter((u) => u.lockedAt).length;
  const systemRoles = roles.filter((r) => r.isSystem).length;

  return (
    <section className="admin-hub">
      <FlowProgress flowId="administration" compact showTitle={false} className="admin-hub-flow" />
      <PageSummary className="admin-hub-kpis">
        <MetricCard label="Usuarios" value={users.length} hint={`${activeUsers} activos`} tone="blue" />
        <MetricCard label="Roles" value={roles.length} hint={`${systemRoles} del sistema`} />
        <MetricCard label="Cuentas bloqueadas" value={lockedUsers} hint="Requieren revisión" />
        <MetricCard
          label="Permisos asignados"
          value={roles.reduce((acc, r) => acc + (r.rolePermissions?.length ?? 0), 0)}
          hint="En todos los roles"
        />
      </PageSummary>

      <div className="admin-hub-actions">
        <article className={`admin-hub-card${activeTab === 'users' ? ' admin-hub-card-active' : ''}`}>
          <h3>Usuarios</h3>
          <p className="muted">
            Invite personas a la organización y asígneles un rol para definir qué pueden hacer.
          </p>
          <div className="row-actions">
            {canCreateUser ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={onCreateUser}>
                Crear usuario
              </button>
            ) : null}
            <Link to="/administracion/usuarios" className="btn btn-sm">
              Ver listado
            </Link>
          </div>
        </article>

        <article className={`admin-hub-card${activeTab === 'roles' ? ' admin-hub-card-active' : ''}`}>
          <h3>Roles y permisos</h3>
          <p className="muted">
            Defina perfiles de acceso por función: qué módulos puede ver, crear o aprobar cada rol.
          </p>
          <div className="row-actions">
            {canCreateRole ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={onCreateRole}>
                Crear rol
              </button>
            ) : null}
            <Link to="/administracion" className="btn btn-sm">
              Ver roles
            </Link>
          </div>
        </article>

        <article className="admin-hub-card">
          <h3>Seguridad avanzada</h3>
          <p className="muted">
            Políticas de contraseña, autenticación en dos pasos y auditoría de accesos.
          </p>
          <div className="row-actions">
            <Link to="/iam" className="btn btn-sm btn-primary">
              Centro de seguridad
            </Link>
            <Link to="/iam/auditoria" className="btn btn-sm">
              Auditoría
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
