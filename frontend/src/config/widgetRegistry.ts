import type { DashboardRole } from './navigation';

export type WidgetKind =
  | 'kpi-overview'
  | 'kpi-bi'
  | 'quick-actions'
  | 'continue-work'
  | 'pending-work'
  | 'favorites'
  | 'notifications'
  | 'activity'
  | 'pending'
  | 'calendar'
  | 'search'
  | 'ai-assistant'
  | 'links'
  | 'reports'
  | 'gis'
  | 'inventory'
  | 'sales'
  | 'purchases'
  | 'production'
  | 'tasks'
  | 'team-activity';

export interface WidgetDefinition {
  id: string;
  kind: WidgetKind;
  label: string;
  icon: string;
  description: string;
  defaultW: number;
  defaultH: number;
  minW: number;
  maxW: number;
  roles?: DashboardRole[];
  refreshMs?: number;
  links?: { to: string; label: string }[];
  kpiKey?: string;
}

export interface PlacedWidget {
  instanceId: string;
  widgetId: string;
  w: number;
  h: number;
}

export interface WorkspaceView {
  id: string;
  name: string;
  widgets: PlacedWidget[];
}

const w = (
  id: string,
  kind: WidgetKind,
  label: string,
  icon: string,
  opts?: Partial<WidgetDefinition>,
): WidgetDefinition => ({
  id,
  kind,
  label,
  icon,
  description: opts?.description ?? label,
  defaultW: opts?.defaultW ?? 6,
  defaultH: opts?.defaultH ?? 2,
  minW: opts?.minW ?? 3,
  maxW: opts?.maxW ?? 12,
  refreshMs: opts?.refreshMs,
  roles: opts?.roles,
  links: opts?.links,
  kpiKey: opts?.kpiKey,
});

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  w('widget-search', 'search', 'Búsqueda global', '⌕', { defaultW: 12, defaultH: 1, description: 'Acceso rápido al buscador empresarial' }),
  w('widget-quick-actions', 'quick-actions', '¿Qué desea hacer hoy?', '⚡', { defaultW: 12, defaultH: 2 }),
  w('widget-continue-work', 'continue-work', 'Continuar donde quedó', '↩', { defaultW: 12, defaultH: 2 }),
  w('widget-pending-work', 'pending-work', 'Trabajo pendiente', '📥', { defaultW: 12, defaultH: 2, refreshMs: 45000 }),
  w('widget-activity', 'activity', 'Actividad reciente', '🕐', { defaultW: 12, defaultH: 2, refreshMs: 60000 }),
  w('widget-team-activity', 'team-activity', 'Actividad del equipo', '👥', { defaultW: 12, defaultH: 2, roles: ['admin', 'executive', 'hr'], refreshMs: 60000 }),
  w('widget-notifications', 'notifications', 'Notificaciones', '🔔', { defaultW: 6, defaultH: 2, refreshMs: 30000 }),
  w('widget-pending', 'pending', 'Aprobaciones rápidas', '📬', { defaultW: 6, defaultH: 2, refreshMs: 45000 }),
  w('widget-favorites', 'favorites', 'Favoritos', '⭐', { defaultW: 6, defaultH: 2 }),
  w('widget-kpi-overview', 'kpi-overview', 'Indicadores operativos', '📊', { kpiKey: 'overview', defaultW: 12, defaultH: 2, refreshMs: 60000 }),
  w('widget-kpi-purchases', 'kpi-overview', 'Indicadores de compras', '☕', { kpiKey: 'purchases', defaultW: 6, defaultH: 2, roles: ['purchasing', 'agricultural'], refreshMs: 60000 }),
  w('widget-kpi-inventory', 'kpi-overview', 'Indicadores de inventario', '📦', { kpiKey: 'inventory', defaultW: 6, defaultH: 2, roles: ['inventory', 'logistics'], refreshMs: 60000 }),
  w('widget-kpi-bi', 'kpi-bi', 'Indicadores de negocio', '📈', { defaultW: 12, defaultH: 2, refreshMs: 120000 }),
  w('widget-calendar', 'calendar', 'Calendario y agenda', '📅', { defaultW: 6, defaultH: 2, refreshMs: 120000 }),
  w('widget-tasks', 'tasks', 'Tareas programadas', '⏱', { defaultW: 6, defaultH: 2, refreshMs: 120000 }),
  w('widget-ai', 'ai-assistant', 'Asistente inteligente', '🤖', { defaultW: 6, defaultH: 3, description: 'Consultas, KPIs y resúmenes' }),
  w('widget-reports', 'reports', 'Reportes', '📋', { defaultW: 4, defaultH: 2, links: [
    { to: '/bi/reportes', label: 'Reportes BI' }, { to: '/bi/dashboards', label: 'Dashboards BI' },
  ]}),
  w('widget-gis', 'gis', 'Mapa GIS', '🗺', { defaultW: 6, defaultH: 2, roles: ['agricultural', 'admin', 'logistics'], links: [
    { to: '/gis', label: 'Centro GIS' }, { to: '/gis/mapa', label: 'Mapa' }, { to: '/fincas/mapa', label: 'Fincas' },
  ]}),
  w('widget-inventory', 'inventory', 'Inventario', '📦', { defaultW: 6, defaultH: 2, roles: ['inventory', 'logistics', 'purchasing'], links: [
    { to: '/inventario', label: 'Inventario' }, { to: '/inventario/movimientos', label: 'Movimientos' }, { to: '/inventario/conteos', label: 'Conteos' },
  ]}),
  w('widget-sales', 'sales', 'Ventas', '💼', { defaultW: 6, defaultH: 2, roles: ['sales', 'crm', 'executive'], links: [
    { to: '/comercial', label: 'Centro comercial' }, { to: '/comercial/pedidos', label: 'Pedidos' }, { to: '/comercial/facturas', label: 'Facturas' },
  ]}),
  w('widget-purchases', 'purchases', 'Compras', '☕', { defaultW: 6, defaultH: 2, roles: ['purchasing', 'agricultural'], links: [
    { to: '/compras', label: 'Centro café' }, { to: '/compras/wizard', label: 'Wizard' }, { to: '/compras/pesaje', label: 'Pesaje' },
  ]}),
  w('widget-production', 'production', 'Producción', '🏭', { defaultW: 6, defaultH: 2, roles: ['production', 'quality'], links: [
    { to: '/manufactura', label: 'Manufactura' }, { to: '/manufactura/mes', label: 'Planta' }, { to: '/manufactura/calidad', label: 'Calidad' },
  ]}),
  w('widget-links-admin', 'links', 'Administración', '⚙', { defaultW: 4, defaultH: 2, roles: ['admin'], links: [
    { to: '/iam', label: 'Seguridad' }, { to: '/administracion', label: 'Administración' }, { to: '/operaciones', label: 'Operaciones' },
  ]}),
  w('widget-links-exec', 'links', 'Paneles ejecutivos', '🎯', { defaultW: 6, defaultH: 2, roles: ['executive', 'cfo'], links: [
    { to: '/compras/ops/ejecutivo', label: 'Café' }, { to: '/comercial/ops/ejecutivo', label: 'Comercial' },
    { to: '/rrhh/dashboard-ejecutivo', label: 'RRHH' }, { to: '/bi', label: 'BI' },
  ]}),
  w('widget-links-finance', 'links', 'Finanzas', '💳', { defaultW: 6, defaultH: 2, roles: ['finance', 'cfo'], links: [
    { to: '/finanzas', label: 'Centro financiero' }, { to: '/finanzas/cxp', label: 'CXP' },
    { to: '/finanzas/tesoreria', label: 'Tesorería' }, { to: '/comercial/cartera', label: 'Cartera' },
  ]}),
  w('widget-links-hr', 'links', 'Talento humano', '👥', { defaultW: 6, defaultH: 2, roles: ['hr'], links: [
    { to: '/rrhh', label: 'Personal' }, { to: '/rrhh/nomina', label: 'Nómina' }, { to: '/portal', label: 'Portal' },
  ]}),
  w('widget-links-agri', 'links', 'AgriTech', '🌱', { defaultW: 6, defaultH: 2, roles: ['agricultural'], links: [
    { to: '/plataforma-agritech', label: 'AgriTech' }, { to: '/lotes', label: 'Lotes' }, { to: '/gis', label: 'GIS' },
  ]}),
  w('widget-links-crm', 'links', 'CRM', '🎯', { defaultW: 6, defaultH: 2, roles: ['crm', 'sales'], links: [
    { to: '/comercial/crm', label: 'CRM' }, { to: '/comercial/oportunidades', label: 'Oportunidades' },
    { to: '/comercial/clientes', label: 'Clientes' },
  ]}),
  w('widget-links-quality', 'links', 'Calidad', '✓', { defaultW: 6, defaultH: 2, roles: ['quality', 'production'], links: [
    { to: '/manufactura/calidad', label: 'QMS' }, { to: '/compras/calidad', label: 'Calidad café' },
  ]}),
  w('widget-links-audit', 'links', 'Auditoría', '🔍', { defaultW: 6, defaultH: 2, roles: ['audit', 'admin'], links: [
    { to: '/iam/auditoria', label: 'Auditoría' }, { to: '/bi', label: 'Reportes' },
  ]}),
  w('widget-links-logistics', 'links', 'Logística', '🚛', { defaultW: 6, defaultH: 2, roles: ['logistics'], links: [
    { to: '/cadena-suministro', label: 'Suministro' }, { to: '/cadena-suministro/wms', label: 'Almacén' },
    { to: '/cadena-suministro/tms', label: 'TMS' },
  ]}),
  w('widget-links-maintenance', 'links', 'Mantenimiento', '🔧', { defaultW: 6, defaultH: 2, roles: ['maintenance'], links: [
    { to: '/gestion-activos', label: 'EAM' }, { to: '/gestion-activos/mantenimiento', label: 'CMMS' },
  ]}),
  w('widget-links-default', 'links', 'Accesos rápidos', '🔗', { defaultW: 6, defaultH: 2, roles: ['default'], links: [
    { to: '/productores', label: 'Productores' }, { to: '/compras', label: 'Compras' },
    { to: '/inventario', label: 'Inventario' }, { to: '/documentos', label: 'Documentos' },
  ]}),
];

export const WIDGET_MAP = new Map(WIDGET_REGISTRY.map((d) => [d.id, d]));

export function getWidgetsForRole(role: DashboardRole): WidgetDefinition[] {
  return WIDGET_REGISTRY.filter((wd) => !wd.roles || wd.roles.includes(role));
}

export function createPlacedWidget(widgetId: string): PlacedWidget | null {
  const def = WIDGET_MAP.get(widgetId);
  if (!def) return null;
  return {
    instanceId: `${widgetId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    widgetId,
    w: def.defaultW,
    h: def.defaultH,
  };
}

function place(widgetIds: string[]): PlacedWidget[] {
  return widgetIds.map((id) => createPlacedWidget(id)).filter(Boolean) as PlacedWidget[];
}

export const ROLE_WORKSPACE_DEFAULTS: Record<DashboardRole, WorkspaceView[]> = {
  admin: [
    { id: 'ws-main', name: 'Centro de trabajo', widgets: place([
      'widget-search', 'widget-quick-actions', 'widget-continue-work', 'widget-pending-work',
      'widget-activity', 'widget-team-activity', 'widget-notifications',
      'widget-kpi-overview', 'widget-kpi-bi', 'widget-links-admin', 'widget-ai',
    ])},
    { id: 'ws-ops', name: 'Operaciones', widgets: place(['widget-calendar', 'widget-tasks', 'widget-gis']) },
  ],
  executive: [
    { id: 'ws-main', name: 'Centro de trabajo', widgets: place([
      'widget-search', 'widget-quick-actions', 'widget-continue-work', 'widget-pending-work',
      'widget-activity', 'widget-notifications', 'widget-links-exec',
      'widget-kpi-overview', 'widget-kpi-bi', 'widget-ai',
    ])},
  ],
  cfo: [
    { id: 'ws-main', name: 'Centro de trabajo', widgets: place([
      'widget-search', 'widget-quick-actions', 'widget-continue-work', 'widget-pending-work',
      'widget-activity', 'widget-notifications', 'widget-links-finance', 'widget-reports',
      'widget-kpi-bi', 'widget-ai',
    ])},
  ],
  purchasing: [
    { id: 'ws-main', name: 'Centro de trabajo', widgets: place([
      'widget-quick-actions', 'widget-continue-work', 'widget-pending-work',
      'widget-activity', 'widget-purchases', 'widget-calendar', 'widget-notifications',
      'widget-kpi-purchases',
    ])},
  ],
  sales: [
    { id: 'ws-main', name: 'Centro de trabajo', widgets: place([
      'widget-quick-actions', 'widget-continue-work', 'widget-pending-work',
      'widget-activity', 'widget-sales', 'widget-notifications', 'widget-favorites',
      'widget-kpi-bi', 'widget-ai',
    ])},
  ],
  crm: [
    { id: 'ws-main', name: 'Centro de trabajo', widgets: place([
      'widget-quick-actions', 'widget-continue-work', 'widget-pending-work',
      'widget-activity', 'widget-links-crm', 'widget-sales', 'widget-notifications', 'widget-calendar',
      'widget-kpi-bi',
    ])},
  ],
  inventory: [
    { id: 'ws-main', name: 'Centro de trabajo', widgets: place([
      'widget-quick-actions', 'widget-continue-work', 'widget-pending-work',
      'widget-inventory', 'widget-notifications', 'widget-tasks',
      'widget-kpi-inventory',
    ])},
  ],
  logistics: [
    { id: 'ws-main', name: 'Centro de trabajo', widgets: place([
      'widget-quick-actions', 'widget-continue-work', 'widget-pending-work',
      'widget-links-logistics', 'widget-inventory', 'widget-gis', 'widget-calendar',
      'widget-kpi-inventory',
    ])},
  ],
  finance: [
    { id: 'ws-main', name: 'Centro de trabajo', widgets: place([
      'widget-quick-actions', 'widget-continue-work', 'widget-pending-work',
      'widget-activity', 'widget-links-finance', 'widget-reports', 'widget-notifications',
      'widget-kpi-bi',
    ])},
  ],
  production: [
    { id: 'ws-main', name: 'Centro de trabajo', widgets: place([
      'widget-quick-actions', 'widget-continue-work', 'widget-pending-work',
      'widget-production', 'widget-calendar', 'widget-tasks',
      'widget-kpi-bi',
    ])},
  ],
  quality: [
    { id: 'ws-main', name: 'Centro de trabajo', widgets: place([
      'widget-quick-actions', 'widget-continue-work', 'widget-pending-work',
      'widget-links-quality', 'widget-production', 'widget-activity', 'widget-reports',
    ])},
  ],
  agricultural: [
    { id: 'ws-main', name: 'Centro de trabajo', widgets: place([
      'widget-quick-actions', 'widget-continue-work', 'widget-pending-work',
      'widget-activity', 'widget-links-agri', 'widget-gis', 'widget-favorites',
      'widget-kpi-overview', 'widget-ai',
    ])},
  ],
  hr: [
    { id: 'ws-main', name: 'Centro de trabajo', widgets: place([
      'widget-quick-actions', 'widget-continue-work', 'widget-pending-work',
      'widget-links-hr', 'widget-team-activity', 'widget-calendar', 'widget-notifications',
    ])},
  ],
  maintenance: [
    { id: 'ws-main', name: 'Centro de trabajo', widgets: place([
      'widget-quick-actions', 'widget-continue-work', 'widget-pending-work',
      'widget-links-maintenance', 'widget-calendar', 'widget-tasks',
    ])},
  ],
  audit: [
    { id: 'ws-main', name: 'Centro de trabajo', widgets: place([
      'widget-continue-work', 'widget-pending-work',
      'widget-activity', 'widget-team-activity', 'widget-links-audit', 'widget-reports',
      'widget-kpi-bi',
    ])},
  ],
  default: [
    { id: 'ws-main', name: 'Centro de trabajo', widgets: place([
      'widget-search', 'widget-quick-actions', 'widget-continue-work', 'widget-pending-work',
      'widget-activity', 'widget-favorites', 'widget-notifications', 'widget-links-default',
      'widget-kpi-overview',
    ])},
  ],
};

/** Acciones principales — filtradas por rol y permisos; máx. 6 visibles */
export const QUICK_ACTIONS: Array<{
  id: string;
  label: string;
  to: string;
  icon: string;
  roles?: DashboardRole[];
  permission?: string;
}> = [
  { id: 'qa-producer', label: 'Registrar productor', to: '/productores/nuevo', icon: '👤', roles: ['agricultural', 'purchasing', 'admin', 'default'], permission: 'producer:create' },
  { id: 'qa-farm', label: 'Registrar finca', to: '/fincas/nueva', icon: '🌿', roles: ['agricultural', 'admin', 'default'], permission: 'farm:create' },
  { id: 'qa-lot', label: 'Registrar lote', to: '/lotes/nuevo', icon: '📍', roles: ['agricultural', 'admin', 'default'], permission: 'lot:create' },
  { id: 'qa-form', label: 'Crear formulario', to: '/formularios/nuevo', icon: '📝', roles: ['agricultural', 'quality', 'admin', 'default'], permission: 'form:create' },
  { id: 'qa-my-forms', label: 'Mis formularios', to: '/formularios', icon: '📋', roles: ['agricultural', 'quality', 'default'], permission: 'form:read' },
  { id: 'qa-capture', label: 'Nueva captura', to: '/formularios/recoleccion', icon: '📥', roles: ['agricultural', 'default'], permission: 'form:read' },
  { id: 'qa-inbox', label: 'Bandeja de tareas', to: '/procesos/bandeja', icon: '📥', roles: ['admin', 'default', 'executive', 'production'], permission: 'workflow:read' },
  { id: 'qa-purchase', label: 'Registrar compra', to: '/compras/wizard', icon: '☕', roles: ['purchasing', 'agricultural', 'admin'], permission: 'coffee:read' },
  { id: 'qa-user', label: 'Nuevo usuario', to: '/administracion/usuarios', icon: '👥', roles: ['admin'], permission: 'user:read' },
  { id: 'qa-role', label: 'Configurar roles', to: '/administracion', icon: '🔐', roles: ['admin'], permission: 'organization:read' },
  { id: 'qa-security', label: 'Seguridad y accesos', to: '/iam', icon: '🛡', roles: ['admin'], permission: 'iam:read' },
  { id: 'qa-sale', label: 'Nueva venta', to: '/comercial/pedidos', icon: '💼', roles: ['sales', 'crm', 'executive'], permission: 'sales:read' },
  { id: 'qa-customer', label: 'Nuevo cliente', to: '/comercial/clientes', icon: '👤', roles: ['sales', 'crm'], permission: 'sales:read' },
  { id: 'qa-product', label: 'Nuevo artículo', to: '/inventario/articulos', icon: '📦', roles: ['inventory', 'logistics'], permission: 'inventory:read' },
  { id: 'qa-order', label: 'Nueva orden', to: '/comercial/pedidos', icon: '📋', roles: ['sales', 'production'], permission: 'sales:read' },
  { id: 'qa-labor', label: 'Actividad de campo', to: '/formularios/recoleccion', icon: '🌱', roles: ['agricultural'], permission: 'form:read' },
  { id: 'qa-asset', label: 'Nuevo activo', to: '/gestion-activos', icon: '🏗', roles: ['maintenance'], permission: 'asset_management:read' },
  { id: 'qa-employee', label: 'Nuevo empleado', to: '/rrhh', icon: '👥', roles: ['hr', 'admin'], permission: 'hcm:read' },
];

const QUICK_ACTIONS_LIMIT = 6;

export function getQuickActionsForRole(
  role: DashboardRole,
  hasPermission: (permission: string) => boolean = () => true,
  limit = QUICK_ACTIONS_LIMIT,
) {
  return QUICK_ACTIONS
    .filter((a) => (!a.roles || a.roles.includes(role)) && (!a.permission || hasPermission(a.permission)))
    .slice(0, limit);
}

export const ROLE_LABELS: Record<DashboardRole, string> = {
  admin: 'Administrador',
  executive: 'Gerencia General',
  cfo: 'Director Financiero',
  purchasing: 'Compras',
  sales: 'Ventas',
  crm: 'CRM',
  inventory: 'Inventario',
  logistics: 'Logística',
  finance: 'Finanzas',
  production: 'Manufactura',
  quality: 'Calidad',
  agricultural: 'Agrícola',
  hr: 'RRHH',
  maintenance: 'Mantenimiento',
  audit: 'Auditoría',
  default: 'General',
};
