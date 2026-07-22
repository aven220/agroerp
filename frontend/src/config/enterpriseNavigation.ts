/**
 * PM-46 — Navegación enterprise unificada (un solo ERP).
 * Pilares: Inicio · Operación · Reportes · Configuración · Ayuda
 * Sin módulos técnicos visibles (IAM, EIMS, CPEP, Ops Center, etc.).
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
 * Árbol definitivo del sidebar (PM-46).
 * Inicio = enlace único; el resto son grupos acordeón (colapsados por defecto).
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
        keywords: ['inicio', 'home', 'jornada', 'mi día', 'dashboard'],
      }),
    ],
  },
  {
    id: 'operation',
    label: 'Operación',
    icon: '🚜',
    defaultCollapsed: true,
    items: [
      item('nav-compras', '/compras', 'Compras', '🛒', {
        permission: 'coffee:read',
        keywords: ['compras', 'café', 'recepción', 'pesaje', 'liquidación'],
        searchType: 'process',
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
      item('nav-calidad', '/compras/calidad', 'Calidad', '✓', {
        permission: 'coffee:read',
        keywords: ['calidad', 'muestra', 'catación'],
        searchType: 'process',
      }),
      item('nav-inventario', '/inventario', 'Inventario', '📦', {
        permission: 'inventory:read',
        keywords: ['inventario', 'stock', 'bodega'],
      }),
      item('nav-docs', '/documentos', 'Documentos', '📄', {
        permission: 'document:read',
        keywords: ['documentos', 'archivos', 'evidencia'],
      }),
      item('nav-procesos', '/procesos/bandeja', 'Procesos', '🔄', {
        permission: 'workflow:read',
        keywords: ['procesos', 'aprobaciones', 'bandeja', 'workflow'],
        searchType: 'process',
        breadcrumbLabel: 'Procesos',
      }),
    ],
  },
  {
    id: 'reports',
    label: 'Reportes',
    icon: '📊',
    defaultCollapsed: true,
    items: [
      item('nav-rep-ops', '/compras/ops/reportes', 'Operativos', '📋', {
        permission: 'coffee:read',
        keywords: ['reportes', 'operativos', 'compras', 'día'],
        searchType: 'report',
      }),
      item('nav-rep-mgr', '/gerencia', 'Gerenciales', '◈', {
        exact: true,
        keywords: ['gerencia', 'ejecutivo', 'kpis', 'indicadores'],
        searchType: 'report',
      }),
      item('nav-rep-audit', '/iam/auditoria', 'Auditoría', '🔍', {
        permission: 'iam:read',
        keywords: ['auditoría', 'trazas', 'seguridad', 'accesos'],
        searchType: 'report',
      }),
      item('nav-rep-bi', '/bi', 'BI', '📈', {
        permission: 'analytics:read',
        keywords: ['bi', 'analítica', 'tableros', 'inteligencia'],
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
      item('nav-cfg-empresa', '/implementacion/empresa', 'Empresa', '🏢', {
        keywords: ['empresa', 'organización', 'nit', 'fiscal'],
        searchType: 'config',
      }),
      item('nav-cfg-usuarios', '/implementacion/usuarios', 'Usuarios', '👥', {
        keywords: ['usuarios', 'accesos', 'cuentas'],
        searchType: 'config',
      }),
      item('nav-cfg-roles', '/implementacion/roles', 'Roles', '🔐', {
        keywords: ['roles', 'permisos', 'perfiles'],
        searchType: 'config',
      }),
      item('nav-cfg-numeracion', '/implementacion/documentos', 'Numeraciones', '🔢', {
        keywords: ['numeración', 'series', 'consecutivos'],
        searchType: 'config',
      }),
      item('nav-cfg-compras', '/compras/config', 'Compras', '🛒', {
        permission: 'coffee:read',
        keywords: ['configuración compras', 'parámetros', 'precios', 'centros'],
        searchType: 'config',
      }),
      item('nav-cfg-inventario', '/inventario/parametros', 'Inventario', '📦', {
        permission: 'inventory:read',
        keywords: ['configuración inventario', 'parámetros', 'bodegas'],
        searchType: 'config',
      }),
      item('nav-cfg-workflow', '/procesos', 'Workflow', '🔄', {
        permission: 'workflow:read',
        keywords: ['workflow', 'flujos', 'definiciones', 'aprobaciones'],
        searchType: 'config',
      }),
      item('nav-cfg-documentos', '/implementacion/documentos', 'Documentos', '📄', {
        keywords: ['documentos', 'plantillas', 'evidencias'],
        searchType: 'config',
      }),
      item('nav-cfg-integ', '/implementacion/integraciones', 'Integraciones', '🔗', {
        keywords: ['integraciones', 'balanzas', 'conexiones'],
        searchType: 'config',
      }),
      item('nav-cfg-prefs', '/configuracion', 'Preferencias', '◫', {
        exact: true,
        keywords: ['preferencias', 'configuración', 'resumen'],
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
      item('nav-help-prep', '/implementacion/estado', 'Preparación', '📡', {
        keywords: ['preparación', 'estado', 'go live', 'checklist'],
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

export const ENTERPRISE_DEFAULT_OPEN: NavCategory['id'] = 'home';

/** Pilares visibles del producto (breadcrumbs / IA). */
export const ENTERPRISE_PILLARS = ['Inicio', 'Operación', 'Reportes', 'Configuración', 'Ayuda'] as const;
