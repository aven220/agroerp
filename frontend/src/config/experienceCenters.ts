/**
 * PM-25/28 — Arquitectura de experiencia por centros (no por módulos).
 * Navegación por experiencia: Inicio · Operación · Reportes · Configuración · Ayuda.
 * Módulos no licenciados no se listan (paquete coop oculta el resto).
 */

import type { NavCategory, NavItem } from './navigation';

export type ExperienceCenterId = 'operation' | 'management' | 'implementation';

export type IndustryPackageId = 'coop-cafe-co' | 'full-platform';

export interface ExperienceCenterMeta {
  id: ExperienceCenterId;
  label: string;
  shortLabel: string;
  description: string;
  homePath: string;
}

export const EXPERIENCE_CENTERS: ExperienceCenterMeta[] = [
  {
    id: 'operation',
    label: 'Centro de Operación',
    shortLabel: 'Operación',
    description: 'Trabajo diario: recepción → pesaje → calidad → liquidación e inventario',
    homePath: '/operacion',
  },
  {
    id: 'management',
    label: 'Centro de Gerencia',
    shortLabel: 'Gerencia',
    description: 'Indicadores, alertas y visión ejecutiva de la cooperativa',
    homePath: '/gerencia',
  },
  {
    id: 'implementation',
    label: 'Centro de Implementación',
    shortLabel: 'Implementación',
    description: 'Puesta en marcha paso a paso y certificación Go Live',
    homePath: '/implementacion',
  },
];

export const DEFAULT_PACKAGE: IndustryPackageId = 'coop-cafe-co';

const item = (
  id: string,
  to: string,
  label: string,
  icon: string,
  opts?: Partial<NavItem>,
): NavItem => ({ id, to, label, icon, ...opts });

const HELP_ITEMS: NavItem[] = [
  item('help-center', '/ayuda', 'Centro de ayuda', '?', {
    keywords: ['ayuda', 'qué hago', 'guía', 'soporte'],
    searchType: 'screen',
  }),
  item('help-notifications', '/notificaciones', 'Notificaciones', '🔔', {
    keywords: ['alertas', 'avisos'],
  }),
];

/** Navegación Cooperativa cafetera — Centro de Operación */
const COOP_OPERATION: NavCategory[] = [
  {
    id: 'home',
    label: 'Inicio',
    icon: '⌂',
    defaultCollapsed: false,
    items: [
      item('eoc-home', '/operacion', 'Mi día', '◫', {
        exact: true,
        keywords: ['inicio', 'mi día', 'operación', 'cola', 'pendientes'],
      }),
    ],
  },
  {
    id: 'favorites',
    label: 'Favoritos',
    icon: '★',
    hideCount: true,
    defaultCollapsed: true,
    items: [],
  },
  {
    id: 'purchases',
    label: 'Flujo de compras',
    icon: '☕',
    defaultCollapsed: false,
    items: [
      item('eoc-recepcion', '/compras/recepcion', '1. Recepción', '📥', {
        permission: 'coffee:read',
        keywords: ['recepción', 'compra', 'turno'],
        searchType: 'process',
      }),
      item('eoc-pesaje', '/compras/pesaje', '2. Pesaje', '⚖', {
        permission: 'coffee:read',
        keywords: ['pesaje', 'balanza'],
        searchType: 'process',
      }),
      item('eoc-calidad', '/compras/calidad', '3. Calidad', '✓', {
        permission: 'coffee:read',
        keywords: ['calidad', 'muestra'],
        searchType: 'process',
      }),
      item('eoc-liquidaciones', '/compras/liquidaciones', '4. Liquidación', '💵', {
        permission: 'coffee:read',
        keywords: ['liquidaciones', 'pago'],
        searchType: 'process',
      }),
      item('eoc-compras', '/compras', 'Compras del día', '🛒', {
        permission: 'coffee:read',
        keywords: ['compras', 'café', 'resumen'],
        searchType: 'process',
      }),
      item('eoc-cola', '/compras/cola', 'Cola de espera', '⏳', {
        permission: 'coffee:read',
        keywords: ['cola', 'turnos'],
        searchType: 'process',
      }),
    ],
  },
  {
    id: 'inventory',
    label: 'Inventario',
    icon: '📦',
    defaultCollapsed: false,
    items: [
      item('eoc-inventario', '/inventario', 'Bodegas y stock', '📦', {
        permission: 'inventory:read',
        keywords: ['inventario', 'bodega', 'stock'],
      }),
      item('eoc-movimientos', '/inventario/movimientos', 'Movimientos', '🔄', {
        permission: 'inventory:read',
        keywords: ['movimientos', 'entrada', 'salida'],
        searchType: 'process',
      }),
      item('eoc-reservas', '/inventario/reservas', 'Reservas', '🔖', {
        permission: 'inventory:read',
        keywords: ['reservas'],
        searchType: 'process',
      }),
      item('eoc-compras-inv', '/compras/inventario', 'Café en bodega', '☕', {
        permission: 'coffee:read',
        keywords: ['inventario café', 'kardex'],
        searchType: 'process',
      }),
    ],
  },
  {
    id: 'masters',
    label: 'Maestros',
    icon: '👤',
    defaultCollapsed: false,
    items: [
      item('eoc-productores', '/productores', 'Productores', '👤', {
        permission: 'producer:read',
        keywords: ['productores', 'asociados'],
      }),
      item('eoc-fincas', '/fincas', 'Fincas', '🌿', {
        permission: 'farm:read',
        keywords: ['fincas'],
      }),
      item('eoc-lotes', '/lotes', 'Lotes', '📍', {
        permission: 'lot:read',
        keywords: ['lotes', 'parcelas'],
      }),
    ],
  },
  {
    id: 'processes',
    label: 'Procesos y docs',
    icon: '📋',
    defaultCollapsed: true,
    items: [
      item('eoc-procesos', '/procesos/bandeja', 'Aprobaciones', '📥', {
        permission: 'workflow:read',
        keywords: ['procesos', 'aprobaciones', 'bandeja'],
        searchType: 'process',
      }),
      item('eoc-docs', '/documentos', 'Documentos', '📄', {
        permission: 'document:read',
        keywords: ['documentos', 'firma', 'evidencia'],
      }),
    ],
  },
  {
    id: 'reports',
    label: 'Reportes',
    icon: '📊',
    defaultCollapsed: true,
    items: [
      item('eoc-compras-ops', '/compras/ops', 'Operación de compras', '☕', {
        permission: 'coffee:read',
        keywords: ['ops compras', 'tablero'],
        searchType: 'report',
      }),
      item('eoc-reportes', '/bi', 'Analítica', '📈', {
        permission: 'analytics:read',
        keywords: ['reportes', 'analítica', 'bi'],
        searchType: 'report',
      }),
    ],
  },
  {
    id: 'help',
    label: 'Ayuda',
    icon: '?',
    defaultCollapsed: true,
    items: HELP_ITEMS,
  },
];

/** Navegación Cooperativa cafetera — Centro de Gerencia */
const COOP_MANAGEMENT: NavCategory[] = [
  {
    id: 'home',
    label: 'Inicio',
    icon: '⌂',
    defaultCollapsed: false,
    items: [
      item('emc-home', '/gerencia', 'Resumen ejecutivo', '◫', {
        exact: true,
        keywords: ['gerencia', 'ejecutivo', 'kpis', 'inicio'],
      }),
    ],
  },
  {
    id: 'favorites',
    label: 'Favoritos',
    icon: '★',
    hideCount: true,
    defaultCollapsed: true,
    items: [],
  },
  {
    id: 'reports',
    label: 'Indicadores',
    icon: '📊',
    defaultCollapsed: false,
    items: [
      item('emc-compras', '/compras/ops/ejecutivo', 'Compras', '☕', {
        permission: 'coffee:read',
        keywords: ['compras', 'ejecutivo'],
        searchType: 'report',
      }),
      item('emc-calidad', '/compras/calidad/indicadores', 'Calidad', '✓', {
        permission: 'coffee:read',
        keywords: ['calidad', 'indicadores'],
        searchType: 'report',
      }),
      item('emc-inventario', '/inventario/ops', 'Inventario', '📦', {
        permission: 'inventory:read',
        keywords: ['inventario'],
        searchType: 'report',
      }),
      item('emc-bi', '/bi', 'Analítica general', '📈', {
        permission: 'analytics:read',
        keywords: ['reportes', 'bi', 'analítica'],
        searchType: 'report',
      }),
    ],
  },
  {
    id: 'help',
    label: 'Ayuda',
    icon: '?',
    defaultCollapsed: true,
    items: HELP_ITEMS,
  },
];

/** Navegación Cooperativa cafetera — Centro de Implementación */
const COOP_IMPLEMENTATION: NavCategory[] = [
  {
    id: 'home',
    label: 'Inicio',
    icon: '⌂',
    defaultCollapsed: false,
    items: [
      item('eic-home', '/implementacion', 'Resumen', '◫', {
        exact: true,
        keywords: ['implementación', 'go live', 'checklist', 'inicio'],
      }),
    ],
  },
  {
    id: 'favorites',
    label: 'Favoritos',
    icon: '★',
    hideCount: true,
    defaultCollapsed: true,
    items: [],
  },
  {
    id: 'admin',
    label: 'Puesta en marcha',
    icon: '🧭',
    defaultCollapsed: false,
    items: [
      item('eic-empresa', '/implementacion/empresa', '1. Empresa', '🏢', {
        keywords: ['empresa', 'fiscal', 'nit'],
        searchType: 'config',
      }),
      item('eic-usuarios', '/implementacion/usuarios', '2. Usuarios', '👥', {
        keywords: ['usuarios', 'accesos'],
        searchType: 'config',
      }),
      item('eic-roles', '/implementacion/roles', '3. Roles', '🔐', {
        keywords: ['roles', 'permisos'],
        searchType: 'config',
      }),
      item('eic-config', '/implementacion/configuracion', '4. Configuración', '⚙', {
        keywords: ['configuración', 'compras', 'inventario', 'precios'],
        searchType: 'config',
      }),
      item('eic-procesos', '/implementacion/procesos', '5. Procesos', '⚡', {
        keywords: ['procesos', 'aprobaciones', 'workflow'],
        searchType: 'config',
      }),
      item('eic-docs', '/implementacion/documentos', '6. Documentos', '📄', {
        keywords: ['documentos', 'numeración'],
        searchType: 'config',
      }),
      item('eic-integ', '/implementacion/integraciones', '7. Integraciones', '🔗', {
        keywords: ['integraciones', 'balanzas'],
        searchType: 'config',
      }),
      item('eic-modulos', '/implementacion/modulos', '8. Paquete', '▦', {
        keywords: ['paquete', 'alcance', 'cooperativa'],
        searchType: 'config',
      }),
    ],
  },
  {
    id: 'reports',
    label: 'Certificación',
    icon: '✓',
    defaultCollapsed: false,
    items: [
      item('eic-estado', '/implementacion/estado', 'Estado', '📊', {
        keywords: ['estado', 'semáforo', 'preparación'],
        searchType: 'config',
      }),
      item('eic-golive', '/implementacion/go-live', 'Go Live', '✓', {
        keywords: ['go live', 'empresa lista', 'certificación'],
        searchType: 'config',
      }),
    ],
  },
  {
    id: 'help',
    label: 'Ayuda',
    icon: '?',
    defaultCollapsed: true,
    items: HELP_ITEMS,
  },
];

/** Ítems de navegación del paquete cooperativa (unión de los 3 centros). */
export function getCoopPackageNavItems(): NavItem[] {
  const seen = new Set<string>();
  const items: NavItem[] = [];
  for (const cats of [COOP_OPERATION, COOP_MANAGEMENT, COOP_IMPLEMENTATION]) {
    for (const cat of cats) {
      for (const navItem of cat.items) {
        if (seen.has(navItem.id)) continue;
        seen.add(navItem.id);
        items.push(navItem);
      }
    }
  }
  return items;
}

/**
 * Navegación por centro. El paquete piloto certificado es cooperativa;
 * `full-platform` no expande menú (evita bypass de licencia en UI).
 */
export function getExperienceNav(
  center: ExperienceCenterId,
  packageId: IndustryPackageId,
): NavCategory[] {
  void packageId;
  if (center === 'operation') return COOP_OPERATION;
  if (center === 'management') return COOP_MANAGEMENT;
  return COOP_IMPLEMENTATION;
}

export function getCenterMeta(id: ExperienceCenterId): ExperienceCenterMeta {
  return EXPERIENCE_CENTERS.find((c) => c.id === id) ?? EXPERIENCE_CENTERS[0];
}

export function resolveDefaultCenter(roles: string[]): ExperienceCenterId {
  const lower = roles.map((r) => r.toLowerCase());
  // Consultores / implementadores entran al centro de puesta en marcha
  if (lower.some((r) => r.includes('implement') || r.includes('consultant') || r.includes('consultor'))) {
    return 'implementation';
  }
  if (lower.some((r) => r.includes('gerencia') || r.includes('manager') || r.includes('executive'))) {
    return 'management';
  }
  // Admin y operación diaria empiezan en Mi día (flujo claro)
  return 'operation';
}
