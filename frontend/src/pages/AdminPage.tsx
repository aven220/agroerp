import { LoadingState } from '../components/ux/LoadingState';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PermissionMatrix } from '../components/admin/PermissionMatrix';
import { Header } from '../components/layout/Header';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/Drawer';
import {
  createRole,
  createUser,
  deleteUser,
  listPermissions,
  listRoles,
  listUsers,
  updateRole,
  updateUser,
} from '../api/identity';
import { useAuth } from '../context/AuthContext';
import type { Permission, Role, SystemUser } from '../types';

type AdminTab = 'roles' | 'users';

function userDocumentNumber(u: SystemUser): string {
  const doc = u.profile?.documentNumber;
  return typeof doc === 'string' && doc.trim() ? doc : '—';
}

interface AdminPageProps {
  defaultTab?: AdminTab;
}

export function AdminPage({ defaultTab = 'roles' }: AdminPageProps) {
  const { user: currentUser, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const usersRoute = location.pathname.endsWith('/usuarios');

  const [tab, setTab] = useState<AdminTab>(defaultTab);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const [roleModal, setRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleSlug, setRoleSlug] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  const [userModal, setUserModal] = useState(false);
  const [userModalMode, setUserModalMode] = useState<'create' | 'edit'>('create');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserLocked, setEditingUserLocked] = useState(false);
  const [userSaving, setUserSaving] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SystemUser | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    documentNumber: '',
    roleSlug: 'viewer',
    status: 'active' as 'active' | 'inactive' | 'locked' | 'pending' | 'expired',
  });

  const canCreateUser = hasPermission('user:create');
  const canUpdateUser = hasPermission('user:update');
  const canDeleteUser = hasPermission('user:delete');

  const emptyUserForm = (defaultRoleSlug?: string) => ({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    documentNumber: '',
    roleSlug: defaultRoleSlug ?? roles[0]?.slug ?? 'viewer',
    status: 'active' as const,
  });

  function switchTab(next: AdminTab) {
    setTab(next);
    if (next === 'users') {
      navigate('/administracion/usuarios');
    } else {
      navigate('/administracion');
    }
  }

  function openUserCreate() {
    setUserError(null);
    setUserModalMode('create');
    setEditingUserId(null);
    setEditingUserLocked(false);
    setUserForm(emptyUserForm());
    setUserModal(true);
  }

  function openUserEdit(u: SystemUser) {
    setUserError(null);
    setUserModalMode('edit');
    setEditingUserId(u.id);
    setEditingUserLocked(Boolean(u.lockedAt));
    setUserForm({
      email: u.email,
      password: '',
      firstName: u.firstName,
      lastName: u.lastName,
      documentNumber:
        typeof u.profile?.documentNumber === 'string' ? u.profile.documentNumber : '',
      roleSlug: u.userRoles?.[0]?.role.slug ?? roles[0]?.slug ?? 'viewer',
      status: (u.status as typeof userForm.status) || 'active',
    });
    setUserModal(true);
  }

  async function load() {
    setLoading(true);
    setUserError(null);
    try {
      const [r, u, p] = await Promise.all([
        listRoles(),
        listUsers(),
        listPermissions(),
      ]);
      setRoles(r);
      setUsers(u);
      setPermissions(p);
    } catch (err) {
      setUserError(err instanceof Error ? err.message : 'No se pudo cargar administración');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setTab(usersRoute ? 'users' : defaultTab);
  }, [usersRoute, defaultTab]);

  useEffect(() => {
    load();
  }, []);

  function openRoleCreate() {
    setEditingRole(null);
    setRoleName('');
    setRoleSlug('');
    setSelectedPerms([]);
    setRoleError(null);
    setRoleModal(true);
  }

  function openRoleEdit(role: Role) {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleSlug(role.slug);
    setSelectedPerms(
      role.rolePermissions.map(
        (rp) => `${rp.permission.resource}:${rp.permission.action}`,
      ),
    );
    setRoleError(null);
    setRoleModal(true);
  }

  async function saveRole(e: React.FormEvent) {
    e.preventDefault();
    setRoleSaving(true);
    setRoleError(null);
    try {
      if (editingRole) {
        await updateRole(editingRole.id, {
          name: roleName,
          slug: roleSlug,
          permissionKeys: selectedPerms,
        });
      } else {
        await createRole({
          name: roleName,
          slug: roleSlug,
          permissionKeys: selectedPerms,
        });
      }
      setRoleModal(false);
      await load();
    } catch (err) {
      setRoleError(
        err instanceof Error
          ? err.message
          : editingRole
            ? 'No se pudo actualizar el rol'
            : 'No se pudo crear el rol',
      );
    } finally {
      setRoleSaving(false);
    }
  }

  async function saveUser(e: React.FormEvent) {
    e.preventDefault();
    setUserSaving(true);
    setUserError(null);
    try {
      if (userModalMode === 'edit' && editingUserId) {
        const payload: Parameters<typeof updateUser>[1] = {
          firstName: userForm.firstName.trim(),
          lastName: userForm.lastName.trim(),
          status: userForm.status,
          documentNumber: userForm.documentNumber.trim(),
          roleSlugs: userForm.roleSlug ? [userForm.roleSlug] : undefined,
        };
        if (userForm.password.trim()) {
          payload.password = userForm.password;
        }
        await updateUser(editingUserId, payload);
      } else {
        await createUser({
          email: userForm.email.trim(),
          password: userForm.password,
          firstName: userForm.firstName.trim(),
          lastName: userForm.lastName.trim(),
          documentNumber: userForm.documentNumber.trim() || undefined,
          roleSlugs: userForm.roleSlug ? [userForm.roleSlug] : undefined,
        });
      }
      setUserModal(false);
      setUserForm(emptyUserForm());
      await load();
    } catch (err) {
      setUserError(
        err instanceof Error
          ? err.message
          : userModalMode === 'edit'
            ? 'No se pudo actualizar el usuario'
            : 'No se pudo crear el usuario',
      );
    } finally {
      setUserSaving(false);
    }
  }

  async function confirmDeleteUser() {
    if (!deleteTarget) return;
    setDeleteSaving(true);
    try {
      await deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setUserError(err instanceof Error ? err.message : 'No se pudo eliminar el usuario');
      setDeleteTarget(null);
    } finally {
      setDeleteSaving(false);
    }
  }

  const headerActions =
    tab === 'roles' ? (
      <button type="button" className="btn btn-primary" onClick={openRoleCreate}>
        + Nuevo rol
      </button>
    ) : canCreateUser ? (
      <button type="button" className="btn btn-primary" onClick={openUserCreate}>
        + Nuevo usuario
      </button>
    ) : null;

  return (
    <>
      <Header
        title={tab === 'users' ? 'Usuarios del sistema' : 'Roles y permisos'}
        subtitle={
          tab === 'users'
            ? 'Crear, editar y eliminar cuentas de acceso'
            : 'Configuración de roles y permisos de la organización'
        }
        actions={headerActions}
      />

      <div className="tabs">
        <button
          type="button"
          className={tab === 'roles' ? 'tab active' : 'tab'}
          onClick={() => switchTab('roles')}
        >
          Roles y permisos
        </button>
        <button
          type="button"
          className={tab === 'users' ? 'tab active' : 'tab'}
          onClick={() => switchTab('users')}
        >
          Usuarios
        </button>
      </div>

      {loading ? (
        <LoadingState variant="table" message="Cargando administración" />
      ) : tab === 'roles' ? (
        <DataTable<Role>
          gridId="admin-roles"
          data={roles}
          columns={[
            { key: 'name', label: 'Rol', render: (r) => r.name },
            { key: 'slug', label: 'Slug', render: (r) => r.slug },
            {
              key: 'perms',
              label: 'Permisos',
              render: (r) => r.rolePermissions?.length ?? 0,
            },
            {
              key: 'users',
              label: 'Usuarios',
              render: (r) => r._count?.userRoles ?? 0,
            },
            {
              key: 'actions',
              label: '',
              render: (r) => (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    openRoleEdit(r);
                  }}
                >
                  Editar permisos
                </button>
              ),
            },
          ]}
        />
      ) : (
        <DataTable<SystemUser>
          gridId="admin-users"
          data={users}
          columns={[
            {
              key: 'name',
              label: 'Nombre',
              render: (r) => `${r.firstName} ${r.lastName}`,
            },
            {
              key: 'document',
              label: 'Documento',
              render: (r) => userDocumentNumber(r),
            },
            { key: 'email', label: 'Email', render: (r) => r.email },
            {
              key: 'roles',
              label: 'Roles',
              render: (r) =>
                r.userRoles?.map((ur) => ur.role.name).join(', ') ?? '—',
            },
            {
              key: 'status',
              label: 'Estado',
              render: (r) => {
                if (r.lockedAt) {
                  const reason = r.lockedReason ? ` — ${r.lockedReason}` : '';
                  return `Bloqueado (IAM)${reason}`;
                }
                return r.status;
              },
            },
            ...(canUpdateUser || canDeleteUser
              ? [
                  {
                    key: 'actions',
                    label: '',
                    render: (r: SystemUser) => (
                      <div className="row-actions">
                        {canUpdateUser ? (
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openUserEdit(r);
                            }}
                          >
                            Editar
                          </button>
                        ) : null}
                        {canDeleteUser && r.id !== currentUser?.id ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(r);
                            }}
                          >
                            Eliminar
                          </button>
                        ) : null}
                      </div>
                    ),
                  },
                ]
              : []),
          ]}
        />
      )}

      <Modal
        open={roleModal}
        title={editingRole ? 'Editar rol' : 'Nuevo rol'}
        onClose={() => !roleSaving && setRoleModal(false)}
        wide
      >
        <form onSubmit={saveRole} className="form-grid">
          {roleError ? <div className="alert alert-error" style={{ gridColumn: '1 / -1' }}>{roleError}</div> : null}
          {editingRole?.isSystem ? (
            <p className="text-muted" style={{ gridColumn: '1 / -1', margin: 0 }}>
              Rol de sistema: nombre y slug bloqueados. Los permisos pueden ajustarse según política de la organización.
            </p>
          ) : null}
          <label>
            Nombre
            <input
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              required
              disabled={editingRole?.isSystem || roleSaving}
            />
          </label>
          <label>
            Slug
            <input
              value={roleSlug}
              onChange={(e) => setRoleSlug(e.target.value)}
              required
              disabled={editingRole?.isSystem || roleSaving}
            />
          </label>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <span className="ds-field-label">Permisos del rol</span>
            <PermissionMatrix
              permissions={permissions}
              selected={selectedPerms}
              onChange={setSelectedPerms}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setRoleModal(false)} disabled={roleSaving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={roleSaving}>
              {roleSaving ? 'Guardando…' : 'Guardar rol'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={userModal}
        title={userModalMode === 'edit' ? 'Editar usuario' : 'Nuevo usuario'}
        onClose={() => !userSaving && setUserModal(false)}
      >
        <form onSubmit={saveUser} className="form-grid">
          {userError ? (
            <div className="alert alert-error" role="alert">
              {userError}
            </div>
          ) : null}
          {editingUserLocked ? (
            <div className="alert alert-warning" role="alert">
              Este usuario tiene un bloqueo IAM por intentos fallidos de login. Guarde con estado{' '}
              <strong>Activo</strong> para quitar el bloqueo y permitir el acceso.
            </div>
          ) : null}
          <label>
            Nombre
            <input
              value={userForm.firstName}
              onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
              required
            />
          </label>
          <label>
            Apellido
            <input
              value={userForm.lastName}
              onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
              required
            />
          </label>
          <label>
            Documento de identidad
            <input
              value={userForm.documentNumber}
              onChange={(e) => setUserForm({ ...userForm, documentNumber: e.target.value })}
              required={userModalMode === 'create'}
              placeholder="Cédula, NIT, pasaporte…"
            />
          </label>
          {userModalMode === 'create' ? (
            <>
              <label>
                Email
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  required
                />
              </label>
              <label>
                Contraseña
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  required
                  minLength={8}
                />
              </label>
            </>
          ) : (
            <>
              <label>
                Email
                <input type="email" value={userForm.email} disabled />
              </label>
              <label>
                Nueva contraseña
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  minLength={8}
                  placeholder="Dejar vacío para no cambiar"
                  autoComplete="new-password"
                />
              </label>
            </>
          )}
          <label>
            Rol
            <select
              value={userForm.roleSlug}
              onChange={(e) => setUserForm({ ...userForm, roleSlug: e.target.value })}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          {userModalMode === 'edit' ? (
            <label>
              Estado
              <select
                value={userForm.status}
                onChange={(e) =>
                  setUserForm({
                    ...userForm,
                    status: e.target.value as typeof userForm.status,
                  })
                }
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
                <option value="locked">Bloqueado</option>
                <option value="pending">Pendiente</option>
              </select>
            </label>
          ) : null}
          <div className="form-actions">
            <button
              type="button"
              className="btn"
              onClick={() => setUserModal(false)}
              disabled={userSaving}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={userSaving}>
              {userSaving
                ? 'Guardando…'
                : userModalMode === 'edit'
                  ? 'Guardar cambios'
                  : 'Crear usuario'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar usuario"
        message={
          deleteTarget
            ? `¿Eliminar la cuenta de ${deleteTarget.firstName} ${deleteTarget.lastName} (${deleteTarget.email})? Esta acción desactiva el acceso del usuario.`
            : ''
        }
        confirmLabel={deleteSaving ? 'Eliminando…' : 'Eliminar'}
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={confirmDeleteUser}
        onCancel={() => !deleteSaving && setDeleteTarget(null)}
      />
    </>
  );
}
