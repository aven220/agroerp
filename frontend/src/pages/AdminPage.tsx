import { LoadingState } from '../components/ux/LoadingState';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AdminHub } from '../components/admin/AdminHub';
import { FlowNextActions } from '../components/flow/FlowNextActions';
import { FlowProgress } from '../components/flow/FlowProgress';
import { RoleWizardModal } from '../components/admin/RoleWizardModal';
import { UserWizardModal, type UserWizardFormData } from '../components/admin/UserWizardModal';
import { Header } from '../components/layout/Header';
import { DataTable } from '../components/ui/DataTable';
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
      status: (u.status as UserWizardFormData['status']) || 'active',
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
    setRoleError(null);
    setRoleModal(true);
  }

  function openRoleEdit(role: Role) {
    setEditingRole(role);
    setRoleError(null);
    setRoleModal(true);
  }

  async function saveRole(data: { name: string; slug: string; permissionKeys: string[] }) {
    setRoleSaving(true);
    setRoleError(null);
    try {
      if (editingRole) {
        await updateRole(editingRole.id, data);
      } else {
        await createRole(data);
      }
      setRoleModal(false);
      if (!editingRole) {
        setFlowHint('role-created');
        setTab('users');
        if (!usersRoute) navigate('/administracion/usuarios');
      }
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
      setUserModal(false);
      setUserForm(emptyUserForm());
      if (userModalMode === 'create') {
        setFlowHint('user-created');
      }
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
      canCreateRole ? (
        <button type="button" className="btn btn-primary" onClick={openRoleCreate}>
          Crear rol
        </button>
      ) : null
    ) : canCreateUser ? (
      <button type="button" className="btn btn-primary" onClick={openUserCreate}>
        Crear usuario
      </button>
    ) : null;

  return (
    <>
      <Header
        title="Administración"
        subtitle="Gestione usuarios, roles y accesos de su organización"
        actions={headerActions}
      />

      <FlowProgress
        flowId="organization"
        currentStepId={
          flowHint === 'user-created'
            ? 'onboarding'
            : flowHint === 'role-created'
              ? 'user'
              : usersRoute
                ? 'user'
                : tab === 'roles'
                  ? 'role'
                  : undefined
        }
        className="admin-hub-flow"
      />

      {flowHint === 'role-created' ? (
        <FlowNextActions
          title="Rol creado — siguiente paso"
          subtitle="Invite a la primera persona de su equipo y asígnele el rol recién definido."
          dismissible
          onDismiss={() => setFlowHint(null)}
          actions={[
            {
              label: 'Crear usuario',
              description: 'Asigne el nuevo rol a una cuenta de acceso',
              onClick: () => {
                setFlowHint(null);
                openUserCreate();
              },
              primary: true,
              icon: '👤',
            },
            {
              label: 'Revisar permisos del rol',
              description: 'Ajuste qué módulos puede usar este perfil',
              onClick: () => {
                setFlowHint(null);
                setTab('roles');
                navigate('/administracion');
              },
              icon: '🔐',
            },
          ]}
        />
      ) : null}

      {flowHint === 'user-created' ? (
        <FlowNextActions
          title="Usuario creado — siguiente paso"
          subtitle="El usuario ya puede ingresar. Revise la auditoría tras el primer acceso."
          dismissible
          onDismiss={() => setFlowHint(null)}
          actions={[
            {
              label: 'Ver auditoría de accesos',
              description: 'Confirme el primer inicio de sesión',
              to: '/iam/auditoria',
              primary: true,
              icon: '📋',
            },
            {
              label: 'Crear otro usuario',
              description: 'Invite más personas a la organización',
              onClick: () => {
                setFlowHint(null);
                openUserCreate();
              },
              icon: '➕',
            },
            {
              label: 'Centro de seguridad',
              description: 'Políticas MFA y sesiones activas',
              to: '/iam',
              icon: '🛡️',
            },
          ]}
        />
      ) : null}

      {!loading && (canReadRoles || canReadUsers) ? (
        <AdminHub
          roles={roles}
          users={users}
          canCreateRole={canCreateRole}
          canCreateUser={canCreateUser}
          onCreateRole={openRoleCreate}
          onCreateUser={openUserCreate}
          activeTab={tab}
        />
      ) : null}

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

      {userError && !userModal && !roleModal ? (
        <div className="alert alert-error">{userError}</div>
      ) : null}

      {!canReadRoles && !canReadUsers ? (
        <div className="alert alert-error">No tiene permisos para administrar roles o usuarios.</div>
      ) : loading ? (
        <LoadingState variant="table" message="Cargando administración…" />
      ) : tab === 'roles' ? (
        <DataTable<Role>
          gridId="admin-roles"
          data={roles}
          emptyMessage="No hay roles definidos. Use «Crear rol» para definir el primer perfil de acceso."
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
              render: (r) => (
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
                ) : null
              ),
            },
          ]}
        />
      ) : (
        <DataTable<SystemUser>
          gridId="admin-users"
          data={users}
          emptyMessage="No hay usuarios. Use «Crear usuario» para dar acceso a la primera persona."
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
              render: (r) =>
                r.userRoles?.map((ur) => ur.role.name).join(', ') ?? '—',
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

      <RoleWizardModal
        open={roleModal}
        editingRole={editingRole}
        permissions={permissions}
        saving={roleSaving}
        error={roleError}
        onClose={() => !roleSaving && setRoleModal(false)}
        onSave={saveRole}
      />

      <UserWizardModal
        open={userModal}
        mode={userModalMode}
        roles={roles}
        initial={userForm}
        locked={editingUserLocked}
        saving={userSaving}
        error={userError}
        onClose={() => !userSaving && setUserModal(false)}
        onSave={saveUser}
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
