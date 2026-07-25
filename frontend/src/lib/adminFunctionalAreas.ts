import { actionLabel, resourceLabel } from './adminPermissions';

export const RESOURCE_ICONS: Record<string, string> = {
  producer: '👨‍🌾',
  farm: '🌱',
  field_lot: '📍',
  lot: '📍',
  form: '📝',
  workflow: '⚙️',
  bpms: '⚙️',
  user: '🔐',
  role: '🔐',
  permission: '🔐',
  organization: '🏢',
  analytics: '📊',
  dashboard: '📊',
  audit: '📋',
  notification: '🔔',
  eims: '📦',
  inventory: '📦',
  sync: '🔄',
  gis: '🗺️',
  ai: '🤖',
  coffee: '☕',
  cpep: '☕',
  sales: '🛒',
  finance: '💰',
  efm: '💰',
  effm: '💰',
  eint: '🔌',
  integration: '🔌',
  emfg: '🏭',
  hcm: '👥',
  eatp: '🌿',
  eapp: '📡',
  eiwp: '💧',
  ephp: '🩺',
};

export function resourceIcon(resource: string): string {
  if (RESOURCE_ICONS[resource]) return RESOURCE_ICONS[resource];
  const prefix = Object.keys(RESOURCE_ICONS).find((k) => resource.startsWith(k));
  return prefix ? RESOURCE_ICONS[prefix] : '📁';
}

export function resourceAreaLabel(resource: string): string {
  const label = resourceLabel(resource);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export const ACTION_PHRASES: Record<string, (resource: string) => string> = {
  read: (r) => `Puede consultar ${resourceLabel(r)}`,
  create: (r) => `Puede crear ${resourceLabel(r)}`,
  update: (r) => `Puede editar ${resourceLabel(r)}`,
  delete: (r) => `Puede eliminar ${resourceLabel(r)}`,
  admin: (r) => `Control total sobre ${resourceLabel(r)}`,
  submit: (r) => `Puede enviar ${resourceLabel(r)}`,
  publish: (r) => `Puede publicar ${resourceLabel(r)}`,
  approve: (r) => `Puede aprobar ${resourceLabel(r)}`,
  execute: (r) => `Puede ejecutar ${resourceLabel(r)}`,
  assign: (r) => `Puede asignar ${resourceLabel(r)}`,
  import: (r) => `Puede importar ${resourceLabel(r)}`,
  export: (r) => `Puede exportar ${resourceLabel(r)}`,
  design: (r) => `Puede diseñar ${resourceLabel(r)}`,
  receive: () => 'Puede registrar recepción de café',
  weigh: () => 'Puede pesar café en báscula',
  'weigh:manual': () => 'Puede pesar café manualmente (sin báscula)',
  'weigh:configure': () => 'Puede configurar la báscula',
  quality: () => 'Puede evaluar calidad del café',
  'quality:decide': () => 'Puede decidir aceptación/rechazo por calidad',
  'quality:configure': () => 'Puede configurar parámetros de calidad',
  settle: () => 'Puede liquidar compras de café',
  'settle:void': () => 'Puede anular liquidaciones de café',
  'settle:pay': () => 'Puede marcar liquidaciones como pagadas',
  inventory: (r) =>
    r === 'coffee' ? 'Puede gestionar inventario de café' : `Puede gestionar inventario de ${resourceLabel(r)}`,
  'config:read': (r) => `Puede ver la configuración de ${resourceLabel(r)}`,
  'config:manage': (r) => `Puede cambiar la configuración de ${resourceLabel(r)}`,
  'catalog:manage': (r) => `Puede gestionar catálogos de ${resourceLabel(r)}`,
  'audit:read': (r) => `Puede ver la auditoría de ${resourceLabel(r)}`,
  config: (r) => `Puede configurar ${resourceLabel(r)}`,
};

export function humanPermissionPhrase(resource: string, action: string): string {
  const fn = ACTION_PHRASES[action];
  if (fn) return fn(resource);
  return `Puede ${actionLabel(action)} ${resourceLabel(resource)}`;
}

/** Capacidades sensibles para el resumen «No podrá». */
export const NOTABLE_CAPABILITIES: Array<{ resource: string; action: string; label: string }> = [
  { resource: 'user', action: 'create', label: 'Crear usuarios' },
  { resource: 'user', action: 'update', label: 'Modificar usuarios' },
  { resource: 'user', action: 'delete', label: 'Eliminar usuarios' },
  { resource: 'role', action: 'create', label: 'Crear roles' },
  { resource: 'role', action: 'update', label: 'Modificar roles' },
  { resource: 'permission', action: 'update', label: 'Cambiar permisos' },
  { resource: 'organization', action: 'admin', label: 'Administrar la organización' },
  { resource: 'audit', action: 'read', label: 'Consultar auditoría' },
  { resource: 'workflow', action: 'admin', label: 'Administrar procesos' },
  { resource: 'form', action: 'design', label: 'Diseñar formularios' },
];
