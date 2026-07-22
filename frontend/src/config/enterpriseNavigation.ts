/**
 * PM-42 — Navegación enterprise por experiencia (no por módulos técnicos).
 * Solo reorganiza el menú lateral; rutas y permisos existentes se reutilizan.
 */

import type { NavCategory, NavItem } from './navigation';

const item = (
  id: string,
  to: string,
  label: string,
  icon: string,
  opts?: Partial<NavItem>,
): NavItem => ({ id, to, label, icon, ...opts });

/**
 * Árbol definitivo del sidebar (PM-42).
 * Inicio es enlace único; el resto son grupos acordeón (uno abierto a la vez).
 */
export const ENTERPRISE_NAV_CATEGORIES: NavCategory[] = [
  {
    id: 'home',
    label: 'Inicio',
    icon: '🏠',
    defaultCollapsed: false,
    hideCount: true,
    items: [
      item('nav-inicio', '/operacion', 'Inicio', '🏠', {
        exact: true,
        keywords: ['inicio', 'home', 'jornada', 'mi día'],
      }),
    ],
  },
  {
    id: 'company',
    label: 'Empresa',
    icon: '🏢',
    defaultCollapsed: true,
    items: [
      item('nav-org', '/implementacion/empresa', 'Organización', '🏛', {
        keywords: ['organización', 'empresa', 'nit', 'fiscal'],
        searchType: 'config',
      }),
      item('nav-users', '/implementacion/usuarios', 'Usuarios', '👥', {
        keywords: ['usuarios', 'accesos', 'cuentas'],
        searchType: 'config',
      }),
      item('nav-roles', '/implementacion/roles', 'Roles', '🔐', {
        keywords: ['roles', 'permisos', 'perfiles'],
        searchType: 'config',
      }),
      item('nav-branches', '/inventario/bodegas', 'Sucursales', '🏬', {
        permission: 'inventory:read',
        keywords: ['sucursales', 'bodegas', 'sedes', 'ubicaciones'],
        breadcrumbLabel: 'Sucursales',
      }),
      item('nav-op-centers', '/compras/config/centros', 'Centros de operación', '📍', {
        permission: 'coffee:read',
        keywords: ['centros', 'acopio', 'compra', 'balanzas'],
        searchType: 'config',
      }),
    ],
  },
  {
    id: 'operation',
    label: 'Operación',
    icon: '🚜',
    defaultCollapsed: false,
    items: [
      item('nav-mi-dia', '/operacion', 'Mi Día', '◫', {
        exact: true,
        keywords: ['mi día', 'pendientes', 'cola', 'trabajo'],
      }),
      item('nav-compras', '/compras', 'Compras', '🛒', {
        permission: 'coffee:read',
        keywords: ['compras', 'café', 'recepción', 'pesaje'],
        searchType: 'process',
      }),
      item('nav-calidad', '/compras/calidad', 'Calidad', '✓', {
        permission: 'coffee:read',
        keywords: ['calidad', 'muestra', 'catación'],
        searchType: 'process',
      }),
      item('nav-inventario', '/inventario', 'Inventario', '📦', {
        permission: 'inventory:read',
        keywords: ['inventario', 'stock', 'bodega'],
      }),
      item('nav-productores', '/productores', 'Productores', '👤', {
        permission: 'producer:read',
        keywords: ['productores', 'asociados'],
      }),
      item('nav-fincas', '/fincas', 'Fincas', '🌿', {
        permission: 'farm:read',
        keywords: ['fincas', 'predios'],
      }),
      item('nav-lotes', '/lotes', 'Lotes', '📍', {
        permission: 'lot:read',
        keywords: ['lotes', 'parcelas'],
      }),
      item('nav-docs', '/documentos', 'Documentos', '📄', {
        permission: 'document:read',
        keywords: ['documentos', 'archivos', 'evidencia'],
      }),
    ],
  },
  {
    id: 'analytics',
    label: 'Analítica',
    icon: '📈',
    defaultCollapsed: true,
    items: [
      item('nav-exec-dash', '/gerencia', 'Dashboard Ejecutivo', '◈', {
        exact: true,
        keywords: ['dashboard', 'ejecutivo', 'gerencia', 'kpis'],
        searchType: 'report',
      }),
      item('nav-reportes', '/bi', 'Reportes', '📋', {
        permission: 'analytics:read',
        keywords: ['reportes', 'informes', 'centro'],
        searchType: 'report',
      }),
      item('nav-indicadores', '/compras/ops/ejecutivo', 'Indicadores', '📊', {
        permission: 'coffee:read',
        keywords: ['indicadores', 'métricas', 'compras'],
        searchType: 'report',
      }),
      item('nav-bi', '/bi/dashboards', 'BI', '📈', {
        permission: 'analytics:read',
        keywords: ['bi', 'analítica', 'tableros'],
        searchType: 'report',
      }),
    ],
  },
  {
    id: 'configuration',
    label: 'Configuración',
    icon: '⚙',
    defaultCollapsed: true,
    items: [
      item('nav-cfg-hub', '/configuracion', 'Resumen', '◫', {
        exact: true,
        keywords: ['configuración', 'setup', 'centro'],
        searchType: 'config',
      }),
      item('nav-cfg-empresa', '/implementacion/configuracion', 'Empresa', '🏢', {
        keywords: ['configuración', 'empresa', 'setup'],
        searchType: 'config',
      }),
      item('nav-cfg-procesos', '/implementacion/procesos', 'Procesos', '⚡', {
        keywords: ['procesos', 'flujos', 'aprobaciones'],
        searchType: 'config',
      }),
      item('nav-cfg-workflow', '/procesos', 'Workflow', '🔄', {
        permission: 'workflow:read',
        keywords: ['workflow', 'flujos', 'definiciones'],
        searchType: 'config',
      }),
      item('nav-cfg-numeracion', '/implementacion/documentos', 'Numeración', '🔢', {
        keywords: ['numeración', 'documentos', 'series'],
        searchType: 'config',
      }),
      item('nav-cfg-params', '/compras/config/parametros', 'Parámetros', '🎛', {
        permission: 'coffee:read',
        keywords: ['parámetros', 'reglas', 'compras'],
        searchType: 'config',
      }),
      item('nav-cfg-integ', '/implementacion/integraciones', 'Integraciones', '🔗', {
        keywords: ['integraciones', 'balanzas', 'conexiones'],
        searchType: 'config',
      }),
    ],
  },
  {
    id: 'help',
    label: 'Ayuda',
    icon: '❓',
    defaultCollapsed: true,
    items: [
      item('nav-help-center', '/ayuda', 'Centro de ayuda', '?', {
        keywords: ['ayuda', 'soporte', 'guía'],
        searchType: 'screen',
      }),
      item('nav-help-manual', '/ayuda', 'Manual', '📖', {
        keywords: ['manual', 'documentación', 'cómo'],
        searchType: 'screen',
      }),
      item('nav-help-status', '/implementacion/estado', 'Estado del sistema', '📡', {
        keywords: ['estado', 'sistema', 'preparación', 'salud'],
        searchType: 'config',
      }),
    ],
  },
];

/** Todos los ítems del menú enterprise (búsqueda, breadcrumbs, paquete). */
export function getEnterpriseNavItems(): NavItem[] {
  const seen = new Set<string>();
  const items: NavItem[] = [];
  for (const cat of ENTERPRISE_NAV_CATEGORIES) {
    for (const navItem of cat.items) {
      if (seen.has(navItem.id)) continue;
      seen.add(navItem.id);
      items.push(navItem);
    }
  }
  return items;
}

export const ENTERPRISE_DEFAULT_OPEN: NavCategory['id'] = 'operation';
