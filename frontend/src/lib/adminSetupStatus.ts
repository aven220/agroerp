import type { Role, SystemUser } from '../types';

export type StatusLight = 'green' | 'yellow' | 'red';

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  detail: string;
  to?: string;
  action?: 'createRole' | 'createUser' | 'viewRoles';
}

export interface NextAction {
  label: string;
  description: string;
  to?: string;
  action?: 'createRole' | 'createUser' | 'viewRoles';
}

export interface AdminSetupSnapshot {
  progressPercent: number;
  progressLabel: string;
  checklist: ChecklistItem[];
  pendingItems: ChecklistItem[];
  singleAdminWarning: boolean;
  adminCount: number;
  nextAction: NextAction;
}

function countAdmins(users: SystemUser[]): number {
  return users.filter((u) =>
    u.userRoles?.some(
      (ur) =>
        ur.role.slug === 'admin' ||
        ur.role.slug === 'administrator' ||
        ur.role.name.toLowerCase().includes('admin'),
    ),
  ).length;
}

function rolesWithPermissions(roles: Role[]): boolean {
  return roles.some((r) => (r.rolePermissions?.length ?? 0) > 0);
}

export function computeAdminSetup(
  roles: Role[],
  users: SystemUser[],
): AdminSetupSnapshot {
  const adminCount = countAdmins(users);
  const hasRoles = roles.length > 0;
  const hasUsers = users.length > 0;
  const hasPerms = rolesWithPermissions(roles);
  const hasBackupAdmin = adminCount >= 2;

  const checklist: ChecklistItem[] = [
    {
      id: 'roles',
      label: 'Roles',
      done: hasRoles,
      detail: hasRoles ? `${roles.length} rol${roles.length === 1 ? '' : 'es'} definido${roles.length === 1 ? '' : 's'}` : 'Cree su primer perfil de acceso',
      action: hasRoles ? 'viewRoles' : 'createRole',
    },
    {
      id: 'users',
      label: 'Usuarios',
      done: hasUsers,
      detail: hasUsers ? `${users.length} persona${users.length === 1 ? '' : 's'} con acceso` : 'Invite a su equipo',
      to: hasUsers ? '/administracion/usuarios' : undefined,
      action: hasUsers ? undefined : 'createUser',
    },
    {
      id: 'permissions',
      label: 'Permisos',
      done: hasPerms,
      detail: hasPerms ? 'Capacidades asignadas a roles' : 'Defina qué puede hacer cada rol',
      action: 'viewRoles',
    },
    {
      id: 'mfa',
      label: 'MFA',
      done: false,
      detail: 'Active autenticación en dos pasos',
      to: '/iam',
    },
    {
      id: 'policies',
      label: 'Políticas',
      done: false,
      detail: 'Configure contraseñas y sesiones',
      to: '/iam/politicas',
    },
    {
      id: 'audit',
      label: 'Auditoría',
      done: hasUsers,
      detail: hasUsers ? 'Registro de accesos disponible' : 'Revise tras el primer acceso',
      to: '/iam/auditoria',
    },
    {
      id: 'forms',
      label: 'Formularios',
      done: false,
      detail: 'Diseñe o revise formularios de captura',
      to: '/formularios',
    },
    {
      id: 'workflow',
      label: 'Workflow',
      done: false,
      detail: 'Configure procesos y aprobaciones',
      to: '/procesos',
    },
    {
      id: 'masterdata',
      label: 'Datos maestros',
      done: false,
      detail: 'Registre productores, fincas y lotes',
      to: '/productores',
    },
  ];

  const doneCount = checklist.filter((c) => c.done).length;
  const progressPercent = Math.round((doneCount / checklist.length) * 100);
  const pendingItems = checklist.filter((c) => !c.done);

  let progressLabel = 'Comenzando configuración';
  if (progressPercent >= 90) progressLabel = 'Organización casi lista';
  else if (progressPercent >= 70) progressLabel = 'Buen progreso';
  else if (progressPercent >= 40) progressLabel = 'Configuración en curso';
  else if (progressPercent >= 20) progressLabel = 'Primeros pasos completados';

  let nextAction: NextAction;
  if (!hasRoles) {
    nextAction = {
      label: 'Crear primer rol',
      description: 'Defina qué podrá hacer cada perfil antes de invitar usuarios.',
      action: 'createRole',
    };
  } else if (!hasUsers) {
    nextAction = {
      label: 'Crear usuario',
      description: 'Invite a la primera persona y asígnele un rol.',
      action: 'createUser',
    };
  } else if (!hasPerms) {
    nextAction = {
      label: 'Configurar permisos',
      description: 'Revise qué puede hacer cada rol en el sistema.',
      action: 'viewRoles',
    };
  } else if (!hasBackupAdmin) {
    nextAction = {
      label: 'Crear administrador de respaldo',
      description: 'Evite perder acceso si la cuenta principal queda bloqueada.',
      action: 'createUser',
    };
  } else {
    nextAction = {
      label: 'Revisar políticas de seguridad',
      description: 'Configure MFA, contraseñas y sesiones en el centro de seguridad.',
      to: '/iam/politicas',
    };
  }

  return {
    progressPercent,
    progressLabel,
    checklist,
    pendingItems,
    singleAdminWarning: adminCount === 1 && hasUsers,
    adminCount,
    nextAction,
  };
}
