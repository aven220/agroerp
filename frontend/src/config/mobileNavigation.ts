import type { DashboardRole } from './navigation';
import { canAccessPath } from './routePermissions';
import { ROLE_LABELS } from './widgetRegistry';

export interface MobileTab {
  id: string;
  label: string;
  icon: string;
  to: string;
  exact?: boolean;
  permission?: string;
}

export interface MobileQuickTile {
  id: string;
  label: string;
  icon: string;
  to: string;
  roles?: DashboardRole[];
  permission?: string;
}

const TAB_HOME: MobileTab = { id: 'home', label: 'Inicio', icon: '🏠', to: '/', exact: true };
const TAB_WORK: MobileTab = { id: 'work', label: 'Tareas', icon: '📥', to: '/procesos/bandeja', permission: 'workflow:read' };
const TAB_FORMS: MobileTab = { id: 'forms', label: 'Captura', icon: '📝', to: '/formularios', permission: 'form:read' };
const TAB_SEARCH: MobileTab = { id: 'search', label: 'Buscar', icon: '🔍', to: '#search' };
const TAB_MORE: MobileTab = { id: 'more', label: 'Más', icon: '☰', to: '#more' };

export const MOBILE_TABS_BY_ROLE: Record<DashboardRole, MobileTab[]> = {
  admin: [
    { id: 'home', label: 'Mi día', icon: '🏠', to: '/operacion', exact: true },
    { id: 'recv', label: 'Recepción', icon: '📥', to: '/compras/recepcion', permission: 'coffee:read' },
    { id: 'stock', label: 'Stock', icon: '📦', to: '/inventario', permission: 'inventory:read' },
    TAB_SEARCH,
    TAB_MORE,
  ],
  executive: [
    { id: 'home', label: 'Gerencia', icon: '🏠', to: '/gerencia', exact: true },
    { id: 'bi', label: 'Indicadores', icon: '📊', to: '/compras/ops/ejecutivo', permission: 'coffee:read' },
    TAB_SEARCH,
    TAB_MORE,
  ],
  cfo: [TAB_HOME, { id: 'finance', label: 'Finanzas', icon: '💰', to: '/finanzas' }, { id: 'reports', label: 'Reportes', icon: '📈', to: '/bi/reportes' }, TAB_SEARCH, TAB_MORE],
  purchasing: [
    { id: 'home', label: 'Mi día', icon: '🏠', to: '/operacion', exact: true },
    { id: 'recv', label: 'Recepción', icon: '📥', to: '/compras/recepcion', permission: 'coffee:read' },
    { id: 'weigh', label: 'Pesaje', icon: '⚖', to: '/compras/pesaje', permission: 'coffee:read' },
    TAB_SEARCH,
    TAB_MORE,
  ],
  sales: [TAB_HOME, { id: 'crm', label: 'Clientes', icon: '🎯', to: '/comercial/crm' }, { id: 'orders', label: 'Pedidos', icon: '📦', to: '/comercial/pedidos' }, TAB_SEARCH, TAB_MORE],
  crm: [TAB_HOME, { id: 'clients', label: 'Clientes', icon: '👥', to: '/comercial/clientes' }, { id: 'pipeline', label: 'Pipeline', icon: '📊', to: '/comercial' }, TAB_SEARCH, TAB_MORE],
  inventory: [
    { id: 'home', label: 'Mi día', icon: '🏠', to: '/operacion', exact: true },
    { id: 'stock', label: 'Stock', icon: '📦', to: '/inventario', permission: 'inventory:read' },
    { id: 'movements', label: 'Movimientos', icon: '🔄', to: '/inventario/movimientos', permission: 'inventory:read' },
    TAB_SEARCH,
    TAB_MORE,
  ],
  logistics: [TAB_HOME, { id: 'scm', label: 'Suministro', icon: '🔗', to: '/cadena-suministro' }, { id: 'wms', label: 'Almacén', icon: '🏭', to: '/cadena-suministro/wms' }, TAB_SEARCH, TAB_MORE],
  finance: [TAB_HOME, { id: 'accounting', label: 'Contabilidad', icon: '📒', to: '/finanzas' }, { id: 'ar', label: 'Cartera', icon: '💳', to: '/comercial/cartera' }, TAB_SEARCH, TAB_MORE],
  production: [TAB_HOME, { id: 'mfg', label: 'Producción', icon: '🏭', to: '/manufactura' }, TAB_WORK, TAB_SEARCH, TAB_MORE],
  quality: [
    { id: 'home', label: 'Mi día', icon: '🏠', to: '/operacion', exact: true },
    { id: 'q', label: 'Calidad', icon: '✓', to: '/compras/calidad', permission: 'coffee:read' },
    TAB_WORK,
    TAB_SEARCH,
    TAB_MORE,
  ],
  agricultural: [
    { id: 'home', label: 'Mi día', icon: '🏠', to: '/operacion', exact: true },
    { id: 'producers', label: 'Productores', icon: '👤', to: '/productores', permission: 'producer:read' },
    { id: 'lots', label: 'Lotes', icon: '📍', to: '/lotes', permission: 'lot:read' },
    TAB_SEARCH,
    TAB_MORE,
  ],
  hr: [TAB_HOME, { id: 'portal', label: 'Mi portal', icon: '🏠', to: '/portal' }, { id: 'hr', label: 'Personal', icon: '👥', to: '/rrhh' }, TAB_SEARCH, TAB_MORE],
  maintenance: [TAB_HOME, { id: 'assets', label: 'Activos', icon: '🏗', to: '/gestion-activos' }, { id: 'workorders', label: 'Órdenes', icon: '🔧', to: '/gestion-activos/ordenes' }, TAB_SEARCH, TAB_MORE],
  audit: [TAB_HOME, { id: 'audit', label: 'Auditoría', icon: '🔍', to: '/iam/auditoria' }, { id: 'reports', label: 'Reportes', icon: '📋', to: '/bi/reportes' }, TAB_SEARCH, TAB_MORE],
  default: [
    { id: 'home', label: 'Mi día', icon: '🏠', to: '/operacion', exact: true },
    { id: 'recv', label: 'Recepción', icon: '📥', to: '/compras/recepcion', permission: 'coffee:read' },
    TAB_WORK,
    TAB_SEARCH,
    TAB_MORE,
  ],
};

export const MOBILE_QUICK_TILES: MobileQuickTile[] = [
  { id: 'mq-producer', label: 'Productor', icon: '👤', to: '/productores/nuevo', roles: ['agricultural', 'purchasing', 'admin', 'default'], permission: 'producer:create' },
  { id: 'mq-purchase', label: 'Compra', icon: '☕', to: '/compras/wizard', roles: ['purchasing', 'agricultural'], permission: 'coffee:receive' },
  { id: 'mq-form', label: 'Formulario', icon: '📝', to: '/formularios', roles: ['agricultural', 'quality', 'default'], permission: 'form:read' },
  { id: 'mq-lot', label: 'Lote', icon: '📍', to: '/lotes/nuevo', roles: ['agricultural'], permission: 'lot:create' },
  { id: 'mq-inbox', label: 'Bandeja', icon: '📥', to: '/procesos/bandeja', permission: 'workflow:read' },
  { id: 'mq-notify', label: 'Alertas', icon: '🔔', to: '/notificaciones' },
  { id: 'mq-scan', label: 'Escanear', icon: '📷', to: '#scan' },
  { id: 'mq-gps', label: 'Ubicación', icon: '📍', to: '#gps' },
];

export function getMobileTabsForRole(role: DashboardRole, hasPermission: (p: string) => boolean): MobileTab[] {
  const tabs = MOBILE_TABS_BY_ROLE[role] ?? MOBILE_TABS_BY_ROLE.default;
  return tabs
    .filter((t) => (!t.permission || hasPermission(t.permission)) && (t.to.startsWith('#') || canAccessPath(t.to, hasPermission)))
    .slice(0, 5);
}

export function getMobileQuickTiles(role: DashboardRole, hasPermission: (p: string) => boolean) {
  return MOBILE_QUICK_TILES.filter((t) => {
    if (t.roles && !t.roles.includes(role)) return false;
    if (t.permission && !hasPermission(t.permission)) return false;
    return canAccessPath(t.to, hasPermission);
  });
}

export { ROLE_LABELS };
