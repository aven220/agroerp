/**
 * PM-25 — Arquitectura de experiencia por centros (no por módulos).
 * Navegación dinámica según centro, paquete e industria.
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
    description: 'Trabajo del día: colas, recepción, calidad e inventario',
    homePath: '/operacion',
  },
  {
    id: 'management',
    label: 'Centro de Gerencia',
    shortLabel: 'Gerencia',
    description: 'Indicadores, alertas y visión ejecutiva',
    homePath: '/gerencia',
  },
  {
    id: 'implementation',
    label: 'Centro de Implementación',
    shortLabel: 'Implementación',
    description: 'Configuración, checklist y go-live',
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
        keywords: ['inicio', 'mi día', 'operación', 'cola'],
      }),
    ],
  },
  {
    id: 'favorites',
    label: 'Favoritos',
    icon: '★',
    hideCount: true,
    defaultCollapsed: false,
    items: [],
  },
  {
    id: 'purchases',
    label: 'Operación',
    icon: '☕',
    defaultCollapsed: false,
    items: [
      item('eoc-compras', '/compras', 'Compras', '🛒', {
        permission: 'coffee:read',
        keywords: ['compras', 'café'],
      }),
      item('eoc-recepcion', '/compras/recepcion', 'Recepción', '📥', {
        permission: 'coffee:read',
        keywords: ['recepción'],
      }),
      item('eoc-pesaje', '/compras/pesaje', 'Pesaje', '⚖', {
        permission: 'coffee:read',
        keywords: ['pesaje', 'balanza'],
      }),
      item('eoc-calidad', '/compras/calidad', 'Calidad', '✓', {
        permission: 'coffee:read',
        keywords: ['calidad'],
      }),
      item('eoc-liquidaciones', '/compras/liquidaciones', 'Liquidaciones', '💵', {
        permission: 'coffee:read',
        keywords: ['liquidaciones'],
      }),
    ],
  },
  {
    id: 'agriculture',
    label: 'Maestros',
    icon: '🌱',
    defaultCollapsed: false,
    items: [
      item('eoc-productores', '/productores', 'Productores', '👤', {
        permission: 'producer:read',
        keywords: ['productores'],
      }),
      item('eoc-fincas', '/fincas', 'Fincas', '🌿', {
        permission: 'farm:read',
        keywords: ['fincas'],
      }),
      item('eoc-lotes', '/lotes', 'Lotes', '📍', {
        permission: 'lot:read',
        keywords: ['lotes'],
      }),
    ],
  },
  {
    id: 'inventory',
    label: 'Inventario',
    icon: '📦',
    defaultCollapsed: true,
    items: [
      item('eoc-inventario', '/inventario', 'Inventario', '📦', {
        permission: 'inventory:read',
        keywords: ['inventario', 'bodega'],
      }),
      item('eoc-movimientos', '/inventario/movimientos', 'Movimientos', '🔄', {
        permission: 'inventory:read',
        keywords: ['movimientos'],
      }),
      item('eoc-docs', '/documentos', 'Documentos', '📄', {
        permission: 'document:read',
        keywords: ['documentos'],
      }),
    ],
  },
  {
    id: 'processes',
    label: 'Procesos',
    icon: '⚙',
    defaultCollapsed: true,
    items: [
      item('eoc-procesos', '/procesos/bandeja', 'Aprobaciones', '📥', {
        permission: 'workflow:read',
        keywords: ['procesos', 'aprobaciones'],
      }),
      item('eoc-reportes', '/bi', 'Reportes', '📊', {
        permission: 'analytics:read',
        keywords: ['reportes', 'analítica'],
      }),
      item('eoc-config', '/compras/config', 'Configuración', '⚙', {
        permission: 'coffee:read',
        keywords: ['configuración', 'compras'],
      }),
    ],
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
        keywords: ['gerencia', 'ejecutivo', 'kpis'],
      }),
    ],
  },
  {
    id: 'favorites',
    label: 'Favoritos',
    icon: '★',
    hideCount: true,
    defaultCollapsed: false,
    items: [],
  },
  {
    id: 'reports',
    label: 'Analítica',
    icon: '📊',
    defaultCollapsed: false,
    items: [
      item('emc-compras', '/compras/ops/ejecutivo', 'Compras', '☕', {
        permission: 'coffee:read',
        keywords: ['compras', 'ejecutivo'],
      }),
      item('emc-inventario', '/inventario/ops', 'Inventario', '📦', {
        permission: 'inventory:read',
        keywords: ['inventario'],
      }),
      item('emc-bi', '/bi', 'Reportes', '📈', {
        permission: 'analytics:read',
        keywords: ['reportes', 'bi'],
      }),
      item('emc-calidad', '/compras/calidad/indicadores', 'Calidad', '✓', {
        permission: 'coffee:read',
        keywords: ['calidad', 'indicadores'],
      }),
    ],
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
        keywords: ['implementación', 'go live', 'checklist'],
      }),
    ],
  },
  {
    id: 'favorites',
    label: 'Favoritos',
    icon: '★',
    hideCount: true,
    defaultCollapsed: false,
    items: [],
  },
  {
    id: 'admin',
    label: 'Implementación',
    icon: '🧭',
    defaultCollapsed: false,
    items: [
      item('eic-empresa', '/implementacion/empresa', 'Empresa', '🏢', {
        keywords: ['empresa', 'fiscal'],
      }),
      item('eic-config', '/implementacion/configuracion', 'Configuración', '⚙', {
        keywords: ['configuración'],
      }),
      item('eic-usuarios', '/implementacion/usuarios', 'Usuarios', '👥', {
        keywords: ['usuarios', 'accesos'],
      }),
      item('eic-modulos', '/implementacion/modulos', 'Módulos', '▦', {
        keywords: ['módulos', 'paquete'],
      }),
      item('eic-procesos', '/implementacion/procesos', 'Procesos', '⚡', {
        keywords: ['procesos', 'workflow'],
      }),
      item('eic-docs', '/implementacion/documentos', 'Documentos', '📄', {
        keywords: ['documentos', 'numeración'],
      }),
      item('eic-integ', '/implementacion/integraciones', 'Integraciones', '🔗', {
        keywords: ['integraciones', 'balanzas'],
      }),
      item('eic-estado', '/implementacion/estado', 'Estado', '📊', {
        keywords: ['estado', 'preparación'],
      }),
      item('eic-golive', '/implementacion/go-live', 'Go Live', '✓', {
        keywords: ['go live', 'empresa lista'],
      }),
    ],
  },
];

/** Plataforma completa — conserva navegación legacy por centro (fallback) */
export function getExperienceNav(
  center: ExperienceCenterId,
  packageId: IndustryPackageId,
): NavCategory[] {
  if (packageId === 'coop-cafe-co') {
    if (center === 'operation') return COOP_OPERATION;
    if (center === 'management') return COOP_MANAGEMENT;
    return COOP_IMPLEMENTATION;
  }
  /* full-platform: operación usa menú reducido + acceso a legacy vía búsqueda */
  if (center === 'operation') return COOP_OPERATION;
  if (center === 'management') return COOP_MANAGEMENT;
  return COOP_IMPLEMENTATION;
}

export function getCenterMeta(id: ExperienceCenterId): ExperienceCenterMeta {
  return EXPERIENCE_CENTERS.find((c) => c.id === id) ?? EXPERIENCE_CENTERS[0];
}

export function resolveDefaultCenter(roles: string[]): ExperienceCenterId {
  const lower = roles.map((r) => r.toLowerCase());
  if (lower.some((r) => r.includes('admin') || r.includes('implement'))) {
    return 'implementation';
  }
  if (lower.some((r) => r.includes('gerencia') || r.includes('manager') || r.includes('executive'))) {
    return 'management';
  }
  return 'operation';
}
