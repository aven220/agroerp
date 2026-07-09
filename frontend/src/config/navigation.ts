export type NavCategoryId =
  | 'home'
  | 'favorites'
  | 'my-work'
  | 'agriculture'
  | 'logistics'
  | 'commercial'
  | 'production'
  | 'assets'
  | 'hr'
  | 'finance'
  | 'intelligence'
  | 'ecosystem'
  | 'admin';

export type SearchResultType = 'screen' | 'module' | 'process' | 'report' | 'config';

export interface NavItem {
  id: string;
  to: string;
  label: string;
  icon: string;
  permission?: string;
  keywords?: string[];
  searchType?: SearchResultType;
  exact?: boolean;
}

export interface NavCategory {
  id: NavCategoryId;
  label: string;
  icon: string;
  items: NavItem[];
}

const item = (
  id: string,
  to: string,
  label: string,
  icon: string,
  opts?: Partial<NavItem>,
): NavItem => ({ id, to, label, icon, ...opts });

export const NAV_CATEGORIES: NavCategory[] = [
  {
    id: 'home',
    label: 'Inicio',
    icon: '🏠',
    items: [
      item('home-dashboard', '/', 'Inicio', '◫', { exact: true, keywords: ['dashboard', 'inicio', 'home'] }),
    ],
  },
  {
    id: 'favorites',
    label: 'Favoritos',
    icon: '⭐',
    items: [],
  },
  {
    id: 'my-work',
    label: 'Mi Trabajo',
    icon: '📋',
    items: [
      item('work-inbox', '/procesos/bandeja', 'Bandeja de tareas', '📥', { permission: 'workflow:read', keywords: ['bandeja', 'aprobaciones', 'tareas'] }),
      item('work-bpms-inbox', '/bpms/bandeja', 'Bandeja de procesos', '📬', { permission: 'bpms:read', keywords: ['bpms', 'procesos'] }),
      item('work-notifications', '/notificaciones', 'Notificaciones', '🔔', { keywords: ['alertas', 'notificaciones'] }),
      item('work-tasks', '/tareas', 'Tareas programadas', '⏱', { permission: 'scheduler:read', keywords: ['jobs', 'tareas', 'programador'] }),
      item('work-forms', '/formularios/recoleccion', 'Recolección', '📥', { permission: 'form:read', keywords: ['formularios', 'envíos', 'recolección'] }),
      item('work-forms-data', '/formularios/centro-datos', 'Centro de Datos', '📊', { permission: 'form:read', keywords: ['formularios', 'análisis', 'datos'] }),
      item('work-portal', '/portal', 'Portal empleado', '🏠', { keywords: ['portal', 'empleado'] }),
      item('work-portal-dash', '/portal/mi-dashboard', 'Mi dashboard', '🧭', { keywords: ['personal', 'dashboard'] }),
    ],
  },
  {
    id: 'agriculture',
    label: 'Operación Agrícola',
    icon: '🌱',
    items: [
      item('ag-producers', '/productores', 'Productores', '👤', { permission: 'producer:read', keywords: ['productores', 'agricultores'] }),
      item('ag-farms', '/fincas', 'Fincas', '🌿', { permission: 'farm:read', keywords: ['fincas', 'predios'] }),
      item('ag-lots', '/lotes', 'Lotes', '📍', { permission: 'lot:read', keywords: ['lotes', 'parcelas'] }),
      item('ag-gis', '/gis', 'Mapas', '🗺', { permission: 'gis:read', keywords: ['mapas', 'gis', 'geografía'] }),
      item('ag-eatp', '/plataforma-agritech', 'Plataforma AgriTech', '🌾', { permission: 'eatp:read', keywords: ['agritech', 'cultivos', 'campañas'] }),
      item('ag-eapp', '/plataforma-agritech/precision', 'Agricultura de precisión', '🛰', { permission: 'eapp:read', keywords: ['precisión', 'drones', 'telemetría'] }),
      item('ag-eiwp', '/plataforma-agritech/riego', 'Riego inteligente', '💧', { permission: 'eiwp:read', keywords: ['riego', 'agua', 'clima'] }),
      item('ag-ephp', '/plataforma-agritech/sanidad', 'Sanidad vegetal', '🦠', { permission: 'ephp:read', keywords: ['plagas', 'enfermedades', 'fitosanitario'] }),
      item('ag-eatr', '/plataforma-agritech/trazabilidad', 'Trazabilidad', '🔗', { permission: 'eatr:read', keywords: ['trazabilidad', 'cosecha'] }),
      item('ag-eacc', '/plataforma-agritech/cumplimiento', 'Cumplimiento', '✓', { permission: 'eacc:read', keywords: ['certificaciones', 'esg'] }),
      item('ag-effm', '/plataforma-agritech/maquinaria', 'Maquinaria', '🚜', { permission: 'effm:read', keywords: ['flota', 'maquinaria'] }),
      item('ag-eaip', '/plataforma-agritech/inteligencia', 'Inteligencia agrícola', '🧠', { permission: 'eaip:read', keywords: ['ia agrícola', 'predicción'] }),
      item('ag-coffee', '/compras', 'Compras café', '☕', { permission: 'coffee:read', keywords: ['compras', 'café', 'pesaje'] }),
      item('ag-forms', '/formularios', 'Mis Formularios', '📋', { permission: 'form:read', keywords: ['formularios', 'campo', 'mis formularios'] }),
      item('ag-forms-tpl', '/formularios/plantillas', 'Plantillas', '📚', { permission: 'form:read', keywords: ['plantillas', 'formularios'] }),
      item('ag-forms-camp', '/formularios/campanas', 'Campañas', '🎯', { permission: 'form:read', keywords: ['campañas', 'recolección'] }),
    ],
  },
  {
    id: 'logistics',
    label: 'Logística',
    icon: '📦',
    items: [
      item('log-inventory', '/inventario', 'Inventario EIMS', '📦', { permission: 'inventory:read', keywords: ['inventario', 'bodega', 'stock'] }),
      item('log-scm', '/cadena-suministro', 'Cadena de suministro', '🔗', { permission: 'supply_chain:read', keywords: ['scm', 'suministro', 'wms', 'tms'] }),
      item('log-wms', '/cadena-suministro/wms', 'WMS', '🏭', { permission: 'supply_chain:read', keywords: ['almacén', 'picking'] }),
      item('log-tms', '/cadena-suministro/tms', 'TMS', '🚛', { permission: 'supply_chain:read', keywords: ['transporte', 'flota'] }),
      item('log-collab', '/cadena-suministro/colaboracion', 'Colaboración proveedores', '🤝', { permission: 'supply_chain:read', keywords: ['proveedores', 'sla'] }),
    ],
  },
  {
    id: 'commercial',
    label: 'Comercial',
    icon: '💰',
    items: [
      item('com-sales', '/comercial', 'Ventas ESCM', '💼', { permission: 'sales:read', keywords: ['ventas', 'comercial', 'crm'] }),
      item('com-crm', '/comercial/crm', 'CRM', '🎯', { permission: 'sales:read', keywords: ['clientes', 'oportunidades'] }),
      item('com-orders', '/comercial/pedidos', 'Pedidos', '📦', { permission: 'sales:read', keywords: ['pedidos', 'órdenes'] }),
      item('com-billing', '/comercial/facturacion', 'Facturación', '🧾', { permission: 'sales:read', keywords: ['facturas', 'billing'] }),
      item('com-ar', '/comercial/cartera', 'Cartera', '💳', { permission: 'sales:read', keywords: ['cartera', 'cobranza'] }),
      item('com-ops', '/comercial/ops', 'Operaciones comerciales', '📊', { permission: 'sales:read', searchType: 'report', keywords: ['reportes comerciales'] }),
    ],
  },
  {
    id: 'production',
    label: 'Producción',
    icon: '🏭',
    items: [
      item('prd-mfg', '/manufactura', 'Manufactura EMFG', '⚙', { permission: 'manufacturing:read', keywords: ['manufactura', 'producción'] }),
      item('prd-mes', '/manufactura/mes', 'MES Ejecución', '🏭', { permission: 'manufacturing:read', keywords: ['mes', 'planta'] }),
      item('prd-qms', '/manufactura/calidad', 'QMS Calidad', '✓', { permission: 'manufacturing:read', keywords: ['calidad', 'inspección'] }),
      item('prd-resources', '/manufactura/recursos', 'Recursos', '🔧', { permission: 'manufacturing:read', keywords: ['recursos', 'centros'] }),
      item('prd-costs', '/manufactura/costos', 'Costos producción', '💰', { permission: 'manufacturing:read', keywords: ['costos', 'wip'] }),
      item('prd-intel', '/manufactura/inteligencia', 'Inteligencia manufactura', '🧠', { permission: 'manufacturing:read', searchType: 'report', keywords: ['oee', 'kpis'] }),
    ],
  },
  {
    id: 'assets',
    label: 'Activos',
    icon: '🔧',
    items: [
      item('ast-eam', '/gestion-activos', 'Gestión de activos', '🏗', { permission: 'asset_management:read', keywords: ['activos', 'eam'] }),
      item('ast-cmms', '/gestion-activos/mantenimiento', 'Mantenimiento CMMS', '🔩', { permission: 'asset_management:read', keywords: ['mantenimiento', 'ordenes'] }),
      item('ast-reliability', '/gestion-activos/confiabilidad', 'Confiabilidad', '📈', { permission: 'asset_management:read', keywords: ['confiabilidad', 'energía'] }),
      item('ast-iot', '/gestion-activos/confiabilidad/iot', 'IoT activos', '📡', { permission: 'asset_management:read', keywords: ['iot', 'sensores'] }),
    ],
  },
  {
    id: 'hr',
    label: 'Talento Humano',
    icon: '👥',
    items: [
      item('hr-hcm', '/rrhh', 'Talento Humano HCM', '👥', { permission: 'hcm:read', keywords: ['rrhh', 'empleados'] }),
      item('hr-rc', '/rrhh/reclutamiento', 'Reclutamiento', '🎯', { permission: 'hcm:read', keywords: ['vacantes', 'candidatos'] }),
      item('hr-ta', '/rrhh/asistencia', 'Asistencia', '⏱', { permission: 'hcm:read', keywords: ['marcaciones', 'turnos'] }),
      item('hr-py', '/rrhh/nomina', 'Nómina', '💵', { permission: 'hcm:read', keywords: ['nómina', 'liquidación'] }),
      item('hr-td', '/rrhh/talento', 'Desarrollo talento', '🎓', { permission: 'hcm:read', keywords: ['cursos', 'evaluaciones'] }),
      item('hr-ss', '/rrhh/sst', 'SST', '🛡', { permission: 'hcm:read', keywords: ['seguridad', 'salud'] }),
      item('hr-exec', '/rrhh/dashboard-ejecutivo', 'Dashboard RRHH', '📊', { permission: 'hcm:read', searchType: 'report', keywords: ['dashboard rrhh'] }),
      item('hr-portal', '/portal', 'Portal empleado', '🏠', { keywords: ['portal', 'autoservicio'] }),
    ],
  },
  {
    id: 'finance',
    label: 'Finanzas',
    icon: '💳',
    items: [
      item('fin-efm', '/finanzas', 'Finanzas EFM', '💰', { permission: 'finance:read', keywords: ['finanzas', 'contabilidad'] }),
      item('fin-ap', '/finanzas/cxp', 'Cuentas por pagar', '📤', { permission: 'finance:read', keywords: ['proveedores', 'pagos'] }),
      item('fin-tr', '/finanzas/tesoreria', 'Tesorería', '🏦', { permission: 'finance:read', keywords: ['bancos', 'caja', 'flujo'] }),
      item('fin-fa', '/finanzas/activos-fijos', 'Activos fijos', '🏢', { permission: 'finance:read', keywords: ['depreciación', 'activos fijos'] }),
      item('fin-bg', '/finanzas/presupuestos', 'Presupuesto', '📊', { permission: 'finance:read', keywords: ['presupuesto', 'budget'] }),
      item('fin-fo', '/finanzas/foc', 'Cierre y reportes', '📉', { permission: 'finance:read', keywords: ['cierre', 'estados financieros'] }),
    ],
  },
  {
    id: 'intelligence',
    label: 'Inteligencia',
    icon: '📊',
    items: [
      item('int-bi', '/bi', 'Inteligencia de negocio', '📊', { permission: 'analytics:read', keywords: ['bi', 'dashboards', 'reportes'] }),
      item('int-ai', '/ia', 'Inteligencia Artificial', '🤖', { permission: 'ai:read', keywords: ['ia', 'copilotos', 'chat'] }),
      item('int-eint', '/plataforma-empresarial/eint', 'Plataforma Enterprise AI/BI', '🧠', { permission: 'eint:read', keywords: ['enterprise', 'dwh', 'etl'] }),
      item('int-eaip', '/plataforma-agritech/inteligencia', 'IA Agrícola', '🌾', { permission: 'eaip:read', keywords: ['predicción', 'simulación'] }),
      item('int-rules', '/reglas', 'Business Rules', '⚖', { permission: 'bre:read', keywords: ['reglas', 'decisiones'] }),
    ],
  },
  {
    id: 'ecosystem',
    label: 'Ecosistema',
    icon: '🌐',
    items: [
      item('eco-eace', '/plataforma-agritech/ecosistema', 'Ecosistema colaborativo', '🤝', { permission: 'eace:read', keywords: ['cooperativas', 'contratos', 'marketplace'] }),
      item('eco-integrations', '/integraciones', 'Integration Hub', '🔗', { permission: 'integration:read', keywords: ['integraciones', 'conectores'] }),
      item('eco-eip', '/plataforma-empresarial/eip', 'Enterprise Integration', '🔌', { permission: 'eip:read', keywords: ['esb', 'apis'] }),
      item('eco-plugins', '/plugins', 'Plugins & Marketplace', '🧩', { permission: 'plugin:read', keywords: ['plugins', 'extensiones'] }),
      item('eco-iot', '/iot', 'IoT & Edge', '📡', { permission: 'iot:read', keywords: ['iot', 'dispositivos'] }),
      item('eco-docs', '/documentos', 'Documentos', '📄', { keywords: ['documentos', 'archivos'] }),
    ],
  },
  {
    id: 'admin',
    label: 'Administración',
    icon: '⚙',
    items: [
      item('adm-users', '/administracion/usuarios', 'Usuarios del sistema', '👥', {
        permission: 'user:read',
        keywords: ['usuarios', 'crear usuario', 'editar usuario', 'eliminar usuario', 'administrar usuarios'],
      }),
      item('adm-admin', '/administracion', 'Administración (roles)', '⚙', { permission: 'organization:read', keywords: ['admin', 'configuración', 'roles', 'permisos'] }),
      item('adm-iam', '/iam', 'Seguridad y accesos', '🔐', { permission: 'iam:read', keywords: ['usuarios', 'roles', 'permisos'] }),
      item('adm-apis', '/apis', 'API Management', '🔌', { permission: 'api:read', keywords: ['apis', 'desarrolladores'] }),
      item('adm-bpms', '/bpms', 'BPMS', '⚡', { permission: 'bpms:read', keywords: ['procesos', 'automatización'] }),
      item('adm-workflows', '/procesos', 'Procesos BPM', '⚡', { permission: 'workflow:read', keywords: ['workflows', 'bpm'] }),
      item('adm-eops', '/plataforma-empresarial/eops', 'Plataforma de operaciones', '🛰', { permission: 'eops:read', keywords: ['devops', 'observabilidad'] }),
      item('adm-ops', '/operaciones', 'Centro de operaciones', '🛰', { keywords: ['operaciones', 'infraestructura'] }),
      item('adm-perf', '/rendimiento', 'Performance', '⚡', { keywords: ['rendimiento', 'benchmarks'] }),
    ],
  },
];

export const EXTRA_SEARCH_ITEMS: NavItem[] = [
  item('search-producer-new', '/productores/nuevo', 'Nuevo productor', '➕', { searchType: 'process', keywords: ['crear productor'] }),
  item('search-farm-new', '/fincas/nueva', 'Nueva finca', '➕', { searchType: 'process', keywords: ['crear finca'] }),
  item('search-lot-new', '/lotes/nuevo', 'Nuevo lote', '➕', { searchType: 'process', keywords: ['crear lote'] }),
  item('search-coffee-wizard', '/compras/wizard', 'Wizard compra café', '☕', { searchType: 'process', keywords: ['registrar compra'] }),
  item('search-invoice', '/comercial/facturas', 'Facturas', '🧾', { searchType: 'screen', keywords: ['facturas', 'billing'] }),
  item('search-orders', '/comercial/pedidos', 'Órdenes de venta', '📦', { searchType: 'screen', keywords: ['órdenes', 'pedidos'] }),
  item('search-customers', '/comercial/clientes', 'Clientes', '👥', { searchType: 'screen', keywords: ['clientes', 'crm'] }),
  item('search-iam-users', '/administracion/usuarios', 'Usuarios del sistema', '👤', { permission: 'user:read', searchType: 'config', keywords: ['usuarios', 'administrar usuarios'] }),
  item('search-bi-reports', '/bi/reportes', 'Reportes BI', '📊', { permission: 'analytics:read', searchType: 'report', keywords: ['reportes'] }),
  item('search-ai-chat', '/ia/chat', 'Chat IA', '💬', { permission: 'ai:read', searchType: 'screen', keywords: ['chat', 'asistente'] }),
];

export const ALL_NAV_ITEMS: NavItem[] = [
  ...NAV_CATEGORIES.flatMap((c) => c.items),
  ...EXTRA_SEARCH_ITEMS,
];

export function findNavItemByPath(pathname: string): NavItem | undefined {
  const sorted = [...ALL_NAV_ITEMS].sort((a, b) => b.to.length - a.to.length);
  return sorted.find((item) => {
    if (item.exact) return pathname === item.to;
    return pathname === item.to || pathname.startsWith(`${item.to}/`);
  });
}

export function buildBreadcrumbs(pathname: string): { label: string; to?: string }[] {
  const crumbs: { label: string; to?: string }[] = [{ label: 'Inicio', to: '/' }];
  if (pathname === '/') return crumbs;
  const segments = pathname.split('/').filter(Boolean);
  let acc = '';
  for (const seg of segments) {
    acc += `/${seg}`;
    const match = findNavItemByPath(acc);
    crumbs.push({ label: match?.label ?? seg.replace(/-/g, ' '), to: acc });
  }
  return crumbs;
}

export type DashboardRole =
  | 'admin'
  | 'executive'
  | 'cfo'
  | 'purchasing'
  | 'sales'
  | 'crm'
  | 'inventory'
  | 'logistics'
  | 'finance'
  | 'production'
  | 'quality'
  | 'agricultural'
  | 'hr'
  | 'maintenance'
  | 'audit'
  | 'default';

export function resolveDashboardRole(roles: string[]): DashboardRole {
  const r = roles.map((x) => x.toLowerCase());
  if (r.includes('admin')) return 'admin';
  if (r.some((x) => x.includes('audit'))) return 'audit';
  if (r.some((x) => x.includes('quality') || x.includes('calidad') || x.includes('qms'))) return 'quality';
  if (r.some((x) => x.includes('crm'))) return 'crm';
  if (r.some((x) => x.includes('logist') || x.includes('wms') || x.includes('tms') || x.includes('scm'))) return 'logistics';
  if (r.some((x) => x.includes('cfo') || x.includes('director') && x.includes('financ'))) return 'cfo';
  if (r.some((x) => x.includes('executive') || x.includes('gerencia'))) return 'executive';
  if (r.some((x) => x.includes('compr') || x.includes('purchase'))) return 'purchasing';
  if (r.some((x) => x.includes('sales') || x.includes('comercial') || x.includes('ventas'))) return 'sales';
  if (r.some((x) => x.includes('invent') || x.includes('warehouse') || x.includes('bodega'))) return 'inventory';
  if (r.some((x) => x.includes('financ') || x.includes('account') || x.includes('contab'))) return 'finance';
  if (r.some((x) => x.includes('manufact') || x.includes('production') || x.includes('mfg'))) return 'production';
  if (r.some((x) => x.includes('agri') || x.includes('campo') || x.includes('farm'))) return 'agricultural';
  if (r.some((x) => x.includes('hr') || x.includes('hcm') || x.includes('rrhh'))) return 'hr';
  if (r.some((x) => x.includes('maint') || x.includes('eam') || x.includes('cmms'))) return 'maintenance';
  return 'default';
}
