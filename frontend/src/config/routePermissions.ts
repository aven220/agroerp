import { findNavItemByPath } from './navigation';

/** Rutas accesibles para cualquier usuario autenticado (sin permiso de módulo). */
const OPEN_AUTHENTICATED = new Set([
  '/',
  '/perfil',
  '/notificaciones',
  '/tareas',
  '/operaciones',
  '/rendimiento',
]);

const ACTION_PERMISSIONS: Array<{ pattern: RegExp; permission: string }> = [
  { pattern: /^\/productores\/nuevo$/, permission: 'producer:create' },
  { pattern: /^\/productores\/[^/]+\/editar$/, permission: 'producer:update' },
  { pattern: /^\/fincas\/nueva$/, permission: 'farm:create' },
  { pattern: /^\/fincas\/[^/]+\/editar$/, permission: 'farm:update' },
  { pattern: /^\/lotes\/nuevo$/, permission: 'lot:create' },
  { pattern: /^\/lotes\/[^/]+\/editar$/, permission: 'lot:update' },
  { pattern: /^\/lotes\/importar$/, permission: 'lot:create' },
  { pattern: /^\/formularios\/nuevo$/, permission: 'form:create' },
  { pattern: /^\/formularios\/[^/]+\/disenar$/, permission: 'form:update' },
  { pattern: /^\/formularios\/[^/]+\/ejecutar$/, permission: 'form:read' },
  { pattern: /^\/formularios\/recoleccion$/, permission: 'form:read' },
  { pattern: /^\/formularios\/campanas$/, permission: 'form:read' },
  { pattern: /^\/formularios\/exportar$/, permission: 'form:export' },
  { pattern: /^\/documentos$/, permission: 'document:read' },
  { pattern: /^\/bpms\/bandeja$/, permission: 'bpms:read' },
  { pattern: /^\/record-explorer\/Producer\//i, permission: 'producer:read' },
  { pattern: /^\/record-explorer\/Farm\//i, permission: 'farm:read' },
  { pattern: /^\/record-explorer\/Lot\//i, permission: 'lot:read' },
  { pattern: /^\/administracion/, permission: 'organization:read' },
  { pattern: /^\/iam\//, permission: 'iam:read' },
  { pattern: /^\/procesos\/bandeja$/, permission: 'workflow:read' },
];

const PREFIX_FALLBACK: Array<{ prefix: string; permission: string }> = [
  { prefix: '/compras', permission: 'coffee:read' },
  { prefix: '/inventario', permission: 'inventory:read' },
  { prefix: '/cadena-suministro', permission: 'supply_chain:read' },
  { prefix: '/comercial', permission: 'supply_chain:read' },
  { prefix: '/productores', permission: 'producer:read' },
  { prefix: '/fincas', permission: 'farm:read' },
  { prefix: '/lotes', permission: 'lot:read' },
  { prefix: '/formularios', permission: 'form:read' },
  { prefix: '/procesos', permission: 'workflow:read' },
  { prefix: '/bpms', permission: 'bpms:read' },
  { prefix: '/bi', permission: 'analytics:read' },
  { prefix: '/ia', permission: 'ai:read' },
  { prefix: '/rrhh', permission: 'hcm:read' },
  { prefix: '/finanzas', permission: 'finance:read' },
  { prefix: '/manufactura', permission: 'manufacturing:read' },
  { prefix: '/gestion-activos', permission: 'asset_management:read' },
  { prefix: '/plataforma-agritech', permission: 'eatp:read' },
  { prefix: '/gis', permission: 'gis:read' },
  { prefix: '/portal', permission: 'portal:read' },
  { prefix: '/integraciones', permission: 'integration:read' },
  { prefix: '/plugins', permission: 'plugin:read' },
  { prefix: '/reglas', permission: 'bre:read' },
  { prefix: '/apis', permission: 'api:read' },
  { prefix: '/iot', permission: 'iot:read' },
];

/**
 * Permiso mínimo requerido para renderizar la ruta.
 * `null` = solo autenticación (backend sigue validando acciones).
 */
export function resolveRoutePermission(pathname: string): string | null {
  const path = pathname.split('?')[0].replace(/\/$/, '') || '/';
  if (OPEN_AUTHENTICATED.has(path)) return null;

  for (const rule of ACTION_PERMISSIONS) {
    if (rule.pattern.test(path)) return rule.permission;
  }

  const nav = findNavItemByPath(path);
  if (nav?.permission) return nav.permission;

  for (const { prefix, permission } of PREFIX_FALLBACK) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return permission;
  }

  return null;
}

/** Ruta sin query string para validación de acceso. */
export function normalizeRoutePath(href: string): string {
  return href.split('?')[0].replace(/\/$/, '') || '/';
}

/**
 * Indica si el usuario puede navegar a la ruta según permisos de módulo/acción.
 */
export function canAccessPath(pathname: string, hasPermission: (p: string) => boolean): boolean {
  const required = resolveRoutePermission(normalizeRoutePath(pathname));
  if (!required) return true;
  return hasPermission(required);
}
