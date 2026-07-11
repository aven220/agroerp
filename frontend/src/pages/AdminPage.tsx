import { LoadingState } from '../components/ux/LoadingState';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { RoleWizard } from '../components/admin/RoleWizard';
import { UserWizardModal, type UserWizardFormData } from '../components/admin/UserWizardModal';
import { FlowNextActions } from '../components/flow/FlowNextActions';
import { Header } from '../components/layout/Header';
import { DataTable } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
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
import { friendlyAdminError } from '../lib/adminErrorMessages';
import { USER_STATUS_LABELS } from '../lib/adminLabels';
import { useAuth } from '../context/AuthContext';
import type { Permission, Role, SystemUser } from '../types';

type AdminTab = 'roles' | 'users';

function userDocumentNumber(u: SystemUser): string {
  const doc = u.profile?.documentNumber;
  return typeof doc === 'string' && doc.trim() ? doc : '—';
}

function userStatusLabel(u: SystemUser): string {
  if (u.lockedAt) {
    const reason = u.lockedReason ? ` — ${u.lockedReason}` : '';
    return `Cuenta bloqueada${reason}`;
  }
  return USER_STATUS_LABELS[u.status] ?? u.status;
}

interface AdminPageProps {
  defaultTab?: AdminTab;
  /** Base de rutas para pestañas. En EIC: `/implementacion`. */
  basePath?: '/administracion' | '/implementacion';
  /** Sin Header propio (ya envuelto por EicShell). */
  embedded?: boolean;
}

export function AdminPage({
  defaultTab = 'roles',
  basePath = '/administracion',
  embedded = false,
}: AdminPageProps) {
  const { user: currentUser, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const usersRoute = location.pathname.endsWith('/usuarios');
  const rolesPath = basePath === '/implementacion' ? `${basePath}/roles` : basePath;
  const usersPath = `${basePath}/usuarios`;

  const [tab, setTab] = useState<AdminTab>(defaultTab);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const [roleWizard, setRoleWizard] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
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
  const [flowHint, setFlowHint] = useState<'role-created' | 'user-created' | null>(null);
  const [userForm, setUserForm] = useState<UserWizardFormData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    documentNumber: '',
    roleSlug: 'viewer',
    status: 'active',
  });

  const canCreateUser = hasPermission('user:create');
  const canUpdateUser = hasPermission('user:update');
  const canDeleteUser = hasPermission('user:delete');
  const canReadRoles = hasPermission('role:read');
  const canCreateRole = hasPermission('role:create');
  const canUpdateRole = hasPermission('role:update');
  const canReadUsers = hasPermission('user:read');

  const wizardOpen = roleWizard || userModal;

  const emptyUserForm = (defaultRoleSlug?: string): UserWizardFormData => ({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    documentNumber: '',
    roleSlug: defaultRoleSlug ?? roles[0]?.slug ?? 'viewer',
    status: 'active',
  });

  function switchTab(next: AdminTab) {
    setTab(next);
    navigate(next === 'users' ? usersPath : rolesPath);
  }

  function openUserCreate(roleSlug?: string) {
    setUserError(null);
    setUserModalMode('create');
    setEditingUserId(null);
    setEditingUserLocked(false);
    setUserForm(emptyUserForm(roleSlug));
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
      status: (u.status as UserWizardFormData['status']) || 'active',
    });
    setUserModal(true);
  }

  async function load() {
    setLoading(true);
    setUserError(null);
    try {
      const [r, u, p] = await Promise.all([listRoles(), listUsers(), listPermissions()]);
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
    setRoleError(null);
    setRoleWizard(true);
  }

  function openRoleEdit(role: Role) {
    setEditingRole(role);
    setRoleError(null);
    setRoleWizard(true);
  }

  async function saveRole(data: {
    name: string;
    slug: string;
    description?: string;
    permissionKeys: string[];
  }) {
    setRoleSaving(true);
    setRoleError(null);
    try {
      if (editingRole) {
        await updateRole(editingRole.id, data);
      } else {
        await createRole(data);
      }
      await load();
    } catch (err) {
      const msg = friendlyAdminError(
        err,
        editingRole ? 'No se pudo actualizar el rol' : 'No se pudo crear el rol',
      );
      setRoleError(msg);
      throw err;
    } finally {
      setRoleSaving(false);
    }
  }

  async function saveUser(data: UserWizardFormData) {
    setUserSaving(true);
    setUserError(null);
    try {
      if (userModalMode === 'edit' && editingUserId) {
        const payload: Parameters<typeof updateUser>[1] = {
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          status: data.status,
          documentNumber: data.documentNumber.trim(),
          roleSlugs: data.roleSlug ? [data.roleSlug] : undefined,
        };
        if (data.password.trim()) {
          payload.password = data.password;
        }
        await updateUser(editingUserId, payload);
      } else {
        await createUser({
          email: data.email.trim(),
          password: data.password,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          documentNumber: data.documentNumber.trim() || undefined,
          roleSlugs: data.roleSlug ? [data.roleSlug] : undefined,
        });
      }
      await load();
    } catch (err) {
      const msg = friendlyAdminError(
        err,
        userModalMode === 'edit' ? 'No se pudo actualizar el usuario' : 'No se pudo crear el usuario',
      );
      setUserError(msg);
      throw err;
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

  const headerActions = wizardOpen
    ? null
    : tab === 'roles'
      ? canCreateRole
        ? (
            <button type="button" className="btn btn-primary" onClick={openRoleCreate}>
              {roles.length === 0 ? 'Crear primer rol' : 'Crear rol'}
            </button>
          )
        : null
      : canCreateUser
        ? (
            <button type="button" className="btn btn-primary" onClick={() => openUserCreate()}>
              Crear usuario
            </button>
          )
        : null;

  return (
    <>
      {!wizardOpen ? (
        <>
          {embedded ? (
            <div className="row-actions ds-mb-4" style={{ justifyContent: 'space-between' }}>
              <div className="row-actions">
                <button
                  type="button"
                  className={`btn${tab === 'roles' ? ' btn-primary' : ''}`}
                  onClick={() => switchTab('roles')}
                >
                  Roles y permisos
                </button>
                <button
                  type="button"
                  className={`btn${tab === 'users' ? ' btn-primary' : ''}`}
                  onClick={() => switchTab('users')}
                >
                  Usuarios
                </button>
              </div>
              {headerActions}
            </div>
          ) : (
            <Header
              title="Administración"
              subtitle="Configure su organización paso a paso — sin capacitación previa"
              actions={headerActions}
            />
          )}

          {flowHint === 'role-created' ? (
            <FlowNextActions
              title="Rol creado — siguiente paso"
              subtitle="El perfil de acceso ya está listo. Continúe con la invitación de usuarios."
              dismissible
              onDismiss={() => setFlowHint(null)}
              actions={[
                {
                  label: 'Crear usuario',
                  description: 'Asigne el nuevo rol a una persona de su equipo',
                  onClick: () => {
                    setFlowHint(null);
                    openUserCreate();
                  },
                  primary: true,
                  icon: '👤',
                },
                {
                  label: 'Crear otro rol',
                  description: 'Defina otro perfil de acceso',
                  onClick: () => {
                    setFlowHint(null);
                    openRoleCreate();
                  },
                  icon: '🔐',
                },
                {
                  label: 'Volver al panel',
                  description: 'Revise el progreso de configuración',
                  onClick: () => setFlowHint(null),
                  icon: '🏠',
                },
              ]}
            />
          ) : null}

          {flowHint === 'user-created' ? (
            <FlowNextActions
              title="Usuario creado — siguiente paso"
              subtitle="La cuenta ya puede ingresar. Continúe con la seguridad de la organización."
              dismissible
              onDismiss={() => setFlowHint(null)}
              actions={[
                {
                  label: 'Asignar o revisar permisos',
                  description: 'Confirme que el rol tiene las capacidades correctas',
                  onClick: () => {
                    setFlowHint(null);
                    switchTab('roles');
                  },
                  primary: true,
                  icon: '⚙️',
                },
                {
                  label: 'Volver a implementación',
                  description: 'Continúe el checklist de la cooperativa',
                  to: '/implementacion',
                  icon: '📋',
                },
                {
                  label: 'Volver al panel',
                  description: 'Revise el checklist de configuración',
                  onClick: () => setFlowHint(null),
                  icon: '🏠',
                },
              ]}
            />
          ) : null}

          {userError ? <div className="alert alert-error">{userError}</div> : null}

          {!canReadRoles && !canReadUsers ? (
            <div className="alert alert-error">
              No tiene permisos para administrar roles o usuarios.
            </div>
          ) : loading ? (
            <LoadingState variant="table" message="Cargando administración…" />
          ) : (
            <>
              <AdminDashboard
                roles={roles}
                users={users}
                canCreateRole={canCreateRole}
                canCreateUser={canCreateUser}
                onCreateRole={openRoleCreate}
                onCreateUser={() => openUserCreate()}
                onViewRoles={() => switchTab('roles')}
                onViewUsers={() => switchTab('users')}
                onChecklistAction={(action) => {
                  if (action === 'createRole') openRoleCreate();
                  else if (action === 'createUser') openUserCreate();
                  else switchTab('roles');
                }}
              />

              <div className="tabs admin-tabs">
                {canReadRoles ? (
                  <button
                    type="button"
                    className={tab === 'roles' ? 'tab active' : 'tab'}
                    onClick={() => switchTab('roles')}
                  >
                    Roles y permisos
                  </button>
                ) : null}
                {canReadUsers ? (
                  <button
                    type="button"
                    className={tab === 'users' ? 'tab active' : 'tab'}
                    onClick={() => switchTab('users')}
                  >
                    Usuarios
                  </button>
                ) : null}
              </div>

              {tab === 'roles' ? (
                roles.length === 0 ? (
                  <EmptyState
                    illustration="permissions"
                    title="Todavía no ha creado ningún rol."
                    description="Los roles permiten controlar qué puede hacer cada usuario. Comience definiendo su primer perfil de acceso."
                    action={
                      canCreateRole
                        ? { label: 'Crear primer rol', onClick: openRoleCreate }
                        : undefined
                    }
                  />
                ) : (
                  <DataTable<Role>
                    gridId="admin-roles"
                    data={roles}
                    columns={[
                      { key: 'name', label: 'Rol', render: (r) => r.name },
                      {
                        key: 'perms',
                        label: 'Permisos',
                        render: (r) => `${r.rolePermissions?.length ?? 0} permisos`,
                      },
                      {
                        key: 'users',
                        label: 'Usuarios asignados',
                        render: (r) => r._count?.userRoles ?? 0,
                      },
                      {
                        key: 'type',
                        label: 'Tipo',
                        render: (r) => (r.isSystem ? 'Sistema' : 'Personalizado'),
                      },
                      {
                        key: 'actions',
                        label: '',
                        render: (r) =>
                          canUpdateRole ? (
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openRoleEdit(r);
                              }}
                            >
                              Configurar permisos
                            </button>
                          ) : null,
                      },
                    ]}
                  />
                )
              ) : users.length === 0 ? (
                <EmptyState
                  illustration="permissions"
                  title="Todavía no hay usuarios registrados."
                  description="Los usuarios son las personas que ingresan al sistema. Créelos después de definir al menos un rol."
                  action={
                    canCreateUser
                      ? { label: 'Crear usuario', onClick: () => openUserCreate() }
                      : undefined
                  }
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
                    { key: 'email', label: 'Correo', render: (r) => r.email },
                    {
                      key: 'roles',
                      label: 'Rol',
                      render: (r) => r.userRoles?.map((ur) => ur.role.name).join(', ') ?? '—',
                    },
                    {
                      key: 'status',
                      label: 'Estado',
                      render: (r) => userStatusLabel(r),
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
            </>
          )}
        </>
      ) : null}

      <RoleWizard
        open={roleWizard}
        editingRole={editingRole}
        permissions={permissions}
        saving={roleSaving}
        error={roleError}
        onClose={() => !roleSaving && setRoleWizard(false)}
        onSave={saveRole}
        onCreateUserWithRole={(slug) => openUserCreate(slug)}
        onCreateAnotherRole={openRoleCreate}
        onViewRoles={() => switchTab('roles')}
        onFlowComplete={() => setFlowHint('role-created')}
      />

      <UserWizardModal
        open={userModal}
        mode={userModalMode}
        roles={roles}
        permissions={permissions}
        initial={userForm}
        locked={editingUserLocked}
        saving={userSaving}
        error={userError}
        onClose={() => !userSaving && setUserModal(false)}
        onSave={saveUser}
        onViewUsers={() => switchTab('users')}
        onBackToDashboard={() => setFlowHint(null)}
        onFlowComplete={() => setFlowHint('user-created')}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar usuario"
        message={
          deleteTarget
            ? `¿Eliminar la cuenta de ${deleteTarget.firstName} ${deleteTarget.lastName} (${deleteTarget.email})?\n\nEl usuario perderá el acceso al sistema. Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel={deleteSaving ? 'Eliminando…' : 'Sí, eliminar usuario'}
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={confirmDeleteUser}
        onCancel={() => !deleteSaving && setDeleteTarget(null)}
      />
    </>
  );
}
