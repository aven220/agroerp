/**
 * PM-41B / PM-46 — Navegación enterprise unificada.
 * Grupos: Inicio · Operación · Gestión · Reportes · Configuración · Ayuda
 * icon = clave Lucide (ver navIcons.tsx). Sin emojis.
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
 * Árbol del sidebar (PM-41B).
 * Inicio = enlace único; el resto son grupos (cerrados por defecto, un solo abierto).
 */
export const ENTERPRISE_NAV_CATEGORIES: NavCategory[] = [
  {
    id: 'home',
    label: 'Inicio',
    icon: 'home',
    defaultCollapsed: false,
    hideCount: true,
    items: [
      item('nav-inicio', '/operacion', 'Inicio', 'home', {
        exact: true,
        keywords: ['inicio', 'home', 'jornada', 'mi día', 'dashboard'],
      }),
    ],
  },
  {
    id: 'operation',
    label: 'Operación',
    icon: 'operation',
    defaultCollapsed: true,
    hideCount: true,
    items: [
      item('nav-compras', '/compras', 'Compras', 'shopping-cart', {
        permission: 'coffee:read',
        keywords: ['compras', 'café', 'recepción', 'pesaje', 'liquidación'],
        searchType: 'process',
      }),
      item('nav-calidad', '/compras/calidad', 'Calidad', 'clipboard-check', {
        permission: 'coffee:read',
        keywords: ['calidad', 'muestra', 'catación'],
        searchType: 'process',
      }),
      item('nav-inventario', '/inventario', 'Inventario', 'package', {
        permission: 'inventory:read',
        keywords: ['inventario', 'stock', 'bodega'],
      }),
      item('nav-docs', '/documentos', 'Documentos', 'file-text', {
        permission: 'document:read',
        keywords: ['documentos', 'archivos', 'evidencia'],
      }),
      item('nav-procesos', '/procesos/bandeja', 'Procesos', 'workflow', {
        permission: 'workflow:read',
        keywords: ['procesos', 'aprobaciones', 'bandeja', 'workflow'],
        searchType: 'process',
        breadcrumbLabel: 'Procesos',
      }),
    ],
  },
  {
    id: 'gestion',
    label: 'Gestión',
    icon: 'gestion',
    defaultCollapsed: true,
    hideCount: true,
    items: [
      item('nav-productores', '/productores', 'Productores', 'user', {
        permission: 'producer:read',
        keywords: ['productores', 'asociados'],
      }),
      item('nav-fincas', '/fincas', 'Fincas', 'trees', {
        permission: 'farm:read',
        keywords: ['fincas', 'predios'],
      }),
      item('nav-lotes', '/lotes', 'Lotes', 'map-pin', {
        permission: 'lot:read',
        keywords: ['lotes', 'parcelas'],
      }),
    ],
  },
  {
    id: 'reports',
    label: 'Reportes',
    icon: 'reports',
    defaultCollapsed: true,
    hideCount: true,
    items: [
      item('nav-rep-ops', '/compras/ops/reportes', 'Operativos', 'clipboard-list', {
        permission: 'coffee:read',
        keywords: ['reportes', 'operativos', 'compras', 'día'],
        searchType: 'report',
      }),
      item('nav-rep-mgr', '/gerencia', 'Gerenciales', 'bar-chart-3', {
        exact: true,
        keywords: ['gerencia', 'ejecutivo', 'kpis', 'indicadores'],
        searchType: 'report',
      }),
      item('nav-rep-audit', '/iam/auditoria', 'Auditoría', 'search', {
        permission: 'iam:read',
        keywords: ['auditoría', 'trazas', 'seguridad', 'accesos'],
        searchType: 'report',
      }),
      item('nav-rep-bi', '/bi', 'BI', 'activity', {
        permission: 'analytics:read',
        keywords: ['bi', 'analítica', 'tableros', 'inteligencia'],
        searchType: 'report',
      }),
    ],
  },
  {
    id: 'configuration',
    label: 'Configuración',
    icon: 'configuration',
    defaultCollapsed: true,
    hideCount: true,
    items: [
      item('nav-cfg-empresa', '/implementacion/empresa', 'Empresa', 'building-2', {
        keywords: ['empresa', 'organización', 'nit', 'fiscal'],
        searchType: 'config',
      }),
      item('nav-cfg-usuarios', '/implementacion/usuarios', 'Usuarios', 'users', {
        keywords: ['usuarios', 'accesos', 'cuentas'],
        searchType: 'config',
      }),
      item('nav-cfg-roles', '/implementacion/roles', 'Roles', 'shield', {
        keywords: ['roles', 'permisos', 'perfiles'],
        searchType: 'config',
      }),
      item('nav-cfg-numeracion', '/implementacion/documentos', 'Numeraciones', 'clipboard-list', {
        keywords: ['numeración', 'series', 'consecutivos'],
        searchType: 'config',
      }),
      item('nav-cfg-compras', '/compras/config', 'Compras', 'shopping-cart', {
        permission: 'coffee:read',
        keywords: ['configuración compras', 'parámetros', 'precios', 'centros'],
        searchType: 'config',
      }),
      item('nav-cfg-inventario', '/inventario/parametros', 'Inventario', 'boxes', {
        permission: 'inventory:read',
        keywords: ['configuración inventario', 'parámetros', 'bodegas'],
        searchType: 'config',
      }),
      item('nav-cfg-workflow', '/procesos', 'Workflow', 'workflow', {
        permission: 'workflow:read',
        keywords: ['workflow', 'flujos', 'definiciones', 'aprobaciones'],
        searchType: 'config',
      }),
      item('nav-cfg-documentos', '/implementacion/documentos', 'Documentos', 'file-text', {
        keywords: ['documentos', 'plantillas', 'evidencias'],
        searchType: 'config',
      }),
      item('nav-cfg-integ', '/implementacion/integraciones', 'Integraciones', 'link', {
        keywords: ['integraciones', 'balanzas', 'conexiones'],
        searchType: 'config',
      }),
      item('nav-cfg-prefs', '/configuracion', 'Preferencias', 'settings', {
        exact: true,
        keywords: ['preferencias', 'configuración', 'resumen'],
        searchType: 'config',
      }),
      item('nav-cfg-paquete', '/implementacion/modulos', 'Paquete / Pro', 'package', {
        keywords: ['paquete', 'pro', 'plataforma', 'piloto', 'licencia'],
        searchType: 'config',
      }),
    ],
  },
  {
    id: 'help',
    label: 'Ayuda',
    icon: 'help',
    defaultCollapsed: true,
    hideCount: true,
    items: [
      item('nav-help-center', '/ayuda', 'Centro de ayuda', 'help-circle', {
        keywords: ['ayuda', 'soporte', 'guía'],
        searchType: 'screen',
      }),
      item('nav-help-prep', '/implementacion/estado', 'Documentación', 'folder-open', {
        keywords: ['preparación', 'documentación', 'estado', 'go live', 'checklist'],
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
export const ENTERPRISE_PILLARS = [
  'Inicio',
  'Operación',
  'Gestión',
  'Reportes',
  'Configuración',
  'Ayuda',
] as const;
