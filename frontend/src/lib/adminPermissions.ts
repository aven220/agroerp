import type { Permission } from '../types';

export const ACTION_LABELS: Record<string, string> = {
  read: 'consultar',
  create: 'crear',
  update: 'editar',
  delete: 'eliminar',
  submit: 'enviar',
  publish: 'publicar',
  approve: 'aprobar',
  execute: 'ejecutar',
  assign: 'asignar',
  import: 'importar',
  export: 'exportar',
  admin: 'administrar',
  design: 'diseñar',
  cancel: 'cancelar',
};

export const RESOURCE_LABELS: Record<string, string> = {
  producer: 'productores',
  farm: 'fincas',
  field_lot: 'lotes',
  lot: 'lotes',
  form: 'formularios',
  user: 'usuarios',
  role: 'roles',
  permission: 'permisos',
  workflow: 'procesos',
  bpms: 'procesos',
  resource: 'recursos',
  event: 'eventos',
  sync: 'sincronización',
  audit: 'auditoría',
  notification: 'notificaciones',
  alert: 'alertas',
  analytics: 'análisis',
  dashboard: 'paneles',
  kpi: 'indicadores',
  query: 'consultas',
  ai: 'asistente inteligente',
  gis: 'mapas',
  organization: 'organización',
};

export type ModuleDef = {
  id: string;
  label: string;
  description: string;
  match: (resource: string) => boolean;
};

export const ADMIN_MODULES: ModuleDef[] = [
  {
    id: 'agriculture',
    label: 'Operación agrícola',
    description: 'Productores, fincas, lotes y mapas de la operación en campo.',
    match: (r) =>
      ['producer', 'farm', 'lot', 'field_lot', 'gis'].includes(r) ||
      r.startsWith('producer') ||
      r.startsWith('farm') ||
      r.startsWith('lot') ||
      r.startsWith('ftip') ||
      r.startsWith('fmdt') ||
      r.startsWith('prm') ||
      r.startsWith('gis'),
  },
  {
    id: 'forms',
    label: 'Formularios y captura',
    description: 'Diseño, publicación y recolección de datos en formularios.',
    match: (r) => r === 'form' || r.startsWith('form'),
  },
  {
    id: 'iam',
    label: 'Usuarios y accesos',
    description: 'Cuentas, roles, permisos y configuración de la organización.',
    match: (r) =>
      ['user', 'role', 'permission', 'organization', 'session'].includes(r) ||
      r.startsWith('iam') ||
      r.startsWith('eiamp'),
  },
  {
    id: 'workflow',
    label: 'Procesos y aprobaciones',
    description: 'Bandejas de tareas, flujos de aprobación y procesos de negocio.',
    match: (r) => r === 'workflow' || r === 'bpms' || r.startsWith('workflow') || r.startsWith('bpms'),
  },
  {
    id: 'intel',
    label: 'Reportes e inteligencia',
    description: 'Paneles, indicadores, consultas y análisis.',
    match: (r) =>
      ['analytics', 'dashboard', 'kpi', 'query', 'ai', 'report'].includes(r) ||
      r.startsWith('bi') ||
      r.startsWith('ebiap'),
  },
  {
    id: 'supply',
    label: 'Logística e inventario',
    description: 'Inventario, compras, ventas y cadena de suministro.',
    match: (r) =>
      ['eims', 'epscm', 'escm', 'inventory', 'sales'].includes(r) ||
      r.startsWith('eims') ||
      r.startsWith('epscm') ||
      r.startsWith('escm'),
  },
  {
    id: 'mfg',
    label: 'Producción y activos',
    description: 'Manufactura, mantenimiento, finanzas y recursos humanos.',
    match: (r) =>
      ['emfg', 'eam', 'hcm', 'efm'].includes(r) ||
      r.startsWith('emfg') ||
      r.startsWith('eam') ||
      r.startsWith('hcm') ||
      r.startsWith('efm'),
  },
  {
    id: 'ops',
    label: 'Operaciones del sistema',
    description: 'Sincronización, auditoría, notificaciones y tareas programadas.',
    match: (r) =>
      ['resource', 'event', 'sync', 'audit', 'notification', 'alert', 'scheduler'].includes(r),
  },
  {
    id: 'agritech',
    label: 'AgriTech',
    description: 'Campañas, precisión agrícola, riego y sanidad vegetal.',
    match: (r) =>
      ['eatp', 'eapp', 'eiwp', 'ephp', 'eatr', 'eacc', 'effm', 'eaip', 'coffee'].includes(r) ||
      r.startsWith('eatp') ||
      r.startsWith('eapp'),
  },
];

export function resolveAdminModule(resource: string): ModuleDef {
  return (
    ADMIN_MODULES.find((m) => m.match(resource)) ?? {
      id: 'other',
      label: 'Otros',
      description: 'Permisos adicionales del sistema.',
      match: () => true,
    }
  );
}

export function resourceLabel(resource: string): string {
  return RESOURCE_LABELS[resource] ?? resource.replace(/_/g, ' ');
}

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, ' ');
}

export function permKey(p: Permission): string {
  return `${p.resource}:${p.action}`;
}

export function describePermission(p: Permission): string {
  return `Puede ${actionLabel(p.action)} ${resourceLabel(p.resource)}`;
}

export function slugifyRoleName(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 48) || 'rol_nuevo'
  );
}

export const USER_STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  locked: 'Bloqueado',
  pending: 'Pendiente de activación',
  expired: 'Expirado',
};
