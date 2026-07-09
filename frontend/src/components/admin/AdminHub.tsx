import { Link } from 'react-router-dom';
import type { Role, SystemUser } from '../../types';
import { FlowProgress } from '../flow/FlowProgress';

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
      <div className="kpi-grid admin-hub-kpis">
        <div className="kpi-card kpi-card-primary">
          <span className="kpi-label">Usuarios</span>
          <span className="kpi-value">{users.length}</span>
          <span className="kpi-hint">{activeUsers} activos</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Roles</span>
          <span className="kpi-value">{roles.length}</span>
          <span className="kpi-hint">{systemRoles} del sistema</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Cuentas bloqueadas</span>
          <span className="kpi-value">{lockedUsers}</span>
          <span className="kpi-hint">Requieren revisión</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Permisos asignados</span>
          <span className="kpi-value">
            {roles.reduce((acc, r) => acc + (r.rolePermissions?.length ?? 0), 0)}
          </span>
          <span className="kpi-hint">En todos los roles</span>
        </div>
      </div>

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
