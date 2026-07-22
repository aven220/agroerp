/**
 * PM-01A — Arquitectura de información empresarial.
 * Presentación por procesos de negocio; rutas y permisos internos sin cambios.
 */

export type NavCategoryId =
  | 'home'
  | 'favorites'
  | 'agriculture'
  | 'masters'
  | 'forms'
  | 'processes'
  | 'inventory'
  | 'purchases'
  | 'logistics'
  | 'reports'
  | 'admin'
  | 'advanced'
  | 'help';

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
  /** Etiqueta alternativa para breadcrumbs */
  breadcrumbLabel?: string;
}

export interface NavCategory {
  id: NavCategoryId;
  label: string;
  icon: string;
  items: NavItem[];
  /** Colapsada por defecto al primer ingreso */
  defaultCollapsed?: boolean;
  /** Ocultar contador de ítems (p. ej. favoritos) */
  hideCount?: boolean;
}

const item = (
  id: string,
  to: string,
  label: string,
  icon: string,
  opts?: Partial<NavItem>,
): NavItem => ({ id, to, label, icon, ...opts });

/** Categorías principales — máx. 8 áreas de negocio + inicio, favoritos y plataforma avanzada */
export const NAV_CATEGORIES: NavCategory[] = [
  {
    id: 'home',
    label: 'Inicio',
    icon: '🏠',
    defaultCollapsed: false,
    items: [
      item('home-dashboard', '/', 'Inicio', '◫', {
        exact: true,
        keywords: ['dashboard', 'inicio', 'home', 'panel'],
      }),
    ],
  },
  {
    id: 'favorites',
    label: 'Favoritos',
    icon: '⭐',
    hideCount: true,
    defaultCollapsed: false,
    items: [],
  },
  {
    id: 'agriculture',
    label: 'Operación agrícola',
    icon: '🌱',
    defaultCollapsed: false,
    items: [
      item('ag-producers', '/productores', 'Productores', '👤', {
        permission: 'producer:read',
        keywords: ['productores', 'agricultores', 'prm'],
      }),
      item('ag-farms', '/fincas', 'Fincas', '🌿', {
        permission: 'farm:read',
        keywords: ['fincas', 'predios', 'ftip'],
      }),
      item('ag-lots', '/lotes', 'Lotes', '📍', {
        permission: 'lot:read',
        keywords: ['lotes', 'parcelas', 'fmdt'],
      }),
      item('ag-crops', '/plataforma-agritech/cultivos', 'Cultivos', '🌾', {
        permission: 'eatp:read',
        keywords: ['cultivos', 'variedades', 'cosechas'],
      }),
      item('ag-field-work', '/formularios/recoleccion', 'Actividades de campo', '📋', {
        permission: 'form:read',
        keywords: ['actividades', 'campo', 'visitas', 'recolección'],
      }),
      item('ag-gis', '/gis', 'Mapas', '🗺', {
        permission: 'gis:read',
        keywords: ['mapas', 'geografía', 'gis'],
      }),
      item('ag-indicators', '/productores/dashboard', 'Indicadores agrícolas', '📊', {
        permission: 'producer:read',
        keywords: ['indicadores', 'dashboard', 'kpis', 'seguimiento'],
      }),
      item('ag-record', '/productores', 'Expediente 360°', '📂', {
        permission: 'producer:read',
        breadcrumbLabel: 'Expediente 360°',
        keywords: ['expediente', 'record explorer', '360', 'historial'],
      }),
    ],
  },
  {
    id: 'forms',
    label: 'Formularios',
    icon: '📝',
    defaultCollapsed: true,
    items: [
      item('forms-list', '/formularios', 'Mis formularios', '📋', {
        permission: 'form:read',
        keywords: ['formularios', 'udfe', 'campo'],
      }),
      item('forms-new', '/formularios/nuevo', 'Crear formulario', '➕', {
        permission: 'form:create',
        searchType: 'process',
        keywords: ['crear formulario', 'nuevo'],
      }),
      item('forms-tpl', '/formularios/plantillas', 'Plantillas', '📚', {
        permission: 'form:read',
        keywords: ['plantillas'],
      }),
      item('forms-camp', '/formularios/campanas', 'Campañas', '🎯', {
        permission: 'form:read',
        keywords: ['campañas', 'asignación'],
      }),
      item('forms-collect', '/formularios/recoleccion', 'Recolección', '📥', {
        permission: 'form:read',
        keywords: ['recolección', 'captura', 'envíos'],
      }),
      item('forms-data', '/formularios/centro-datos', 'Centro de datos', '📊', {
        permission: 'form:read',
        keywords: ['datos', 'análisis', 'resultados'],
      }),
    ],
  },
  {
    id: 'processes',
    label: 'Procesos',
    icon: '⚙',
    defaultCollapsed: true,
    items: [
      item('proc-inbox', '/procesos/bandeja', 'Bandeja de aprobaciones', '📥', {
        permission: 'workflow:read',
        keywords: ['bandeja', 'aprobaciones', 'tareas', 'workflow'],
      }),
      item('proc-notify', '/notificaciones', 'Notificaciones', '🔔', {
        keywords: ['alertas', 'notificaciones'],
      }),
      item('proc-tasks', '/tareas', 'Tareas programadas', '⏱', {
        permission: 'scheduler:read',
        keywords: ['tareas', 'programador', 'jobs'],
      }),
      item('proc-defs', '/procesos', 'Procesos y flujos', '⚡', {
        permission: 'workflow:read',
        keywords: ['procesos', 'bpm', 'flujos', 'definiciones'],
      }),
      item('proc-instances', '/procesos/instancias', 'Solicitudes en curso', '📋', {
        permission: 'workflow:read',
        keywords: ['instancias', 'solicitudes', 'en curso'],
      }),
      item('proc-bpms-inbox', '/bpms/bandeja', 'Procesos automatizados', '📬', {
        permission: 'bpms:read',
        keywords: ['bpms', 'automatización'],
      }),
      item('proc-bpms', '/bpms', 'Motor de procesos', '🔧', {
        permission: 'bpms:read',
        keywords: ['bpms', 'diseñador'],
      }),
    ],
  },
  {
    id: 'inventory',
    label: 'Inventario',
    icon: '📦',
    defaultCollapsed: true,
    items: [
      item('inv-center', '/inventario', 'Inventario', '📦', {
        permission: 'inventory:read',
        keywords: ['inventario', 'bodega', 'stock', 'eims'],
      }),
      item('inv-movements', '/inventario/movimientos', 'Movimientos', '🔄', {
        permission: 'inventory:read',
        keywords: ['movimientos', 'entradas', 'salidas'],
      }),
      item('inv-kardex', '/inventario/kardex', 'Kardex', '📒', {
        permission: 'inventory:read',
        keywords: ['kardex', 'valoración'],
      }),
      item('inv-counts', '/inventario/conteos', 'Conteos', '🔢', {
        permission: 'inventory:read',
        keywords: ['conteos', 'inventario físico'],
      }),
      item('inv-supply', '/inventario/abastecimiento', 'Abastecimiento', '📈', {
        permission: 'inventory:read',
        keywords: ['abastecimiento', 'planificación'],
      }),
    ],
  },
  {
    id: 'purchases',
    label: 'Compras',
    icon: '🛒',
    defaultCollapsed: true,
    items: [
      item('pur-center', '/compras', 'Centro de compras', '☕', {
        permission: 'coffee:read',
        keywords: ['compras', 'café', 'abastecimiento'],
      }),
      item('pur-wizard', '/compras/wizard', 'Registrar compra', '➕', {
        permission: 'coffee:read',
        searchType: 'process',
        keywords: ['wizard', 'nueva compra'],
      }),
      item('pur-reception', '/compras/recepcion', 'Recepción', '📥', {
        permission: 'coffee:read',
        keywords: ['recepción', 'ingreso'],
      }),
      item('pur-weighing', '/compras/pesaje', 'Pesaje', '⚖', {
        permission: 'coffee:read',
        keywords: ['pesaje', 'balanza'],
      }),
      item('pur-settlements', '/compras/liquidaciones', 'Liquidaciones', '💵', {
        permission: 'coffee:read',
        keywords: ['liquidaciones', 'pagos'],
      }),
    ],
  },
  {
    id: 'logistics',
    label: 'Logística',
    icon: '🚚',
    defaultCollapsed: true,
    items: [
      item('log-scm', '/cadena-suministro', 'Cadena de suministro', '🔗', {
        permission: 'supply_chain:read',
        keywords: ['suministro', 'scm', 'logística'],
      }),
      item('log-wms', '/cadena-suministro/wms', 'Almacén', '🏭', {
        permission: 'supply_chain:read',
        keywords: ['almacén', 'wms', 'picking'],
      }),
      item('log-tms', '/cadena-suministro/tms', 'Transporte', '🚛', {
        permission: 'supply_chain:read',
        keywords: ['transporte', 'tms', 'flota'],
      }),
      item('log-collab', '/cadena-suministro/colaboracion', 'Colaboración proveedores', '🤝', {
        permission: 'supply_chain:read',
        keywords: ['proveedores', 'colaboración'],
      }),
    ],
  },
  {
    id: 'reports',
    label: 'Reportes',
    icon: '📊',
    defaultCollapsed: true,
    items: [
      item('rep-bi', '/bi', 'Inteligencia de negocio', '📊', {
        permission: 'analytics:read',
        keywords: ['bi', 'reportes', 'dashboards', 'análisis'],
      }),
      item('rep-dashboards', '/bi/dashboards', 'Tableros', '📈', {
        permission: 'analytics:read',
        searchType: 'report',
        keywords: ['dashboards', 'tableros'],
      }),
      item('rep-reports', '/bi/reportes', 'Reportes', '📋', {
        permission: 'analytics:read',
        searchType: 'report',
        keywords: ['reportes'],
      }),
      item('rep-ai', '/ia', 'Asistente inteligente', '🤖', {
        permission: 'ai:read',
        keywords: ['ia', 'asistente', 'chat'],
      }),
      item('rep-rules', '/reglas', 'Reglas de negocio', '⚖', {
        permission: 'bre:read',
        keywords: ['reglas', 'decisiones', 'bre'],
      }),
    ],
  },
  {
    id: 'admin',
    label: 'Administración',
    icon: '🔒',
    defaultCollapsed: true,
    items: [
      item('adm-hub', '/administracion', 'Configuración de empresa', '⚙', {
        permission: 'organization:read',
        keywords: ['admin', 'roles', 'permisos', 'configuración'],
      }),
      item('adm-users', '/administracion/usuarios', 'Usuarios', '👥', {
        permission: 'user:read',
        keywords: ['usuarios', 'cuentas', 'invitar'],
      }),
      item('adm-iam', '/iam', 'Seguridad y accesos', '🔐', {
        permission: 'iam:read',
        keywords: ['seguridad', 'iam', 'accesos'],
      }),
      item('adm-audit', '/iam/auditoria', 'Auditoría', '📋', {
        permission: 'iam:read',
        keywords: ['auditoría', 'sesiones', 'historial'],
      }),
      item('adm-policies', '/iam/politicas', 'Políticas de seguridad', '🛡', {
        permission: 'iam:read',
        keywords: ['políticas', 'contraseñas', 'mfa'],
      }),
    ],
  },
  {
    id: 'advanced',
    label: 'Plataforma avanzada',
    icon: '🧩',
    defaultCollapsed: true,
    items: [
      /* ── Ventas y comercial ── */
      item('adv-sales', '/comercial', 'Ventas y comercial', '💼', {
        permission: 'sales:read',
        keywords: ['ventas', 'escm', 'comercial'],
      }),
      item('adv-crm', '/comercial/crm', 'Gestión de clientes', '🎯', {
        permission: 'sales:read',
        keywords: ['crm', 'clientes'],
      }),
      item('adv-orders', '/comercial/pedidos', 'Pedidos de venta', '📦', {
        permission: 'sales:read',
        keywords: ['pedidos', 'órdenes'],
      }),
      item('adv-billing', '/comercial/facturacion', 'Facturación', '🧾', {
        permission: 'sales:read',
        keywords: ['facturas', 'facturación'],
      }),
      item('adv-ar', '/comercial/cartera', 'Cartera', '💳', {
        permission: 'sales:read',
        keywords: ['cartera', 'cobranza'],
      }),
      /* ── Manufactura ── */
      item('adv-mfg', '/manufactura', 'Manufactura', '🏭', {
        permission: 'manufacturing:read',
        keywords: ['manufactura', 'emfg', 'producción'],
      }),
      item('adv-mes', '/manufactura/mes', 'Ejecución en planta', '⚙', {
        permission: 'manufacturing:read',
        keywords: ['mes', 'planta'],
      }),
      item('adv-qms', '/manufactura/calidad', 'Control de calidad', '✓', {
        permission: 'manufacturing:read',
        keywords: ['calidad', 'qms'],
      }),
      /* ── Activos ── */
      item('adv-eam', '/gestion-activos', 'Gestión de activos', '🏗', {
        permission: 'asset_management:read',
        keywords: ['activos', 'eam'],
      }),
      item('adv-cmms', '/gestion-activos/mantenimiento', 'Mantenimiento', '🔩', {
        permission: 'asset_management:read',
        keywords: ['mantenimiento', 'cmms'],
      }),
      /* ── Talento humano ── */
      item('adv-hr', '/rrhh', 'Recursos humanos', '👥', {
        permission: 'hcm:read',
        keywords: ['rrhh', 'hcm', 'empleados'],
      }),
      item('adv-payroll', '/rrhh/nomina', 'Nómina', '💵', {
        permission: 'hcm:read',
        keywords: ['nómina'],
      }),
      item('adv-portal', '/portal', 'Portal del empleado', '🏠', {
        keywords: ['portal', 'empleado', 'autoservicio'],
      }),
      /* ── Finanzas ── */
      item('adv-finance', '/finanzas', 'Finanzas', '💰', {
        permission: 'finance:read',
        keywords: ['finanzas', 'efm', 'contabilidad'],
      }),
      item('adv-ap', '/finanzas/cxp', 'Cuentas por pagar', '📤', {
        permission: 'finance:read',
        keywords: ['pagos', 'proveedores'],
      }),
      item('adv-treasury', '/finanzas/tesoreria', 'Tesorería', '🏦', {
        permission: 'finance:read',
        keywords: ['tesorería', 'bancos'],
      }),
      /* ── AgriTech avanzado ── */
      item('adv-eatp', '/plataforma-agritech', 'Plataforma agrícola', '🌾', {
        permission: 'eatp:read',
        keywords: ['agritech', 'eatp'],
      }),
      item('adv-precision', '/plataforma-agritech/precision', 'Agricultura de precisión', '🛰', {
        permission: 'eapp:read',
        keywords: ['precisión', 'drones'],
      }),
      item('adv-irrigation', '/plataforma-agritech/riego', 'Riego inteligente', '💧', {
        permission: 'eiwp:read',
        keywords: ['riego', 'agua'],
      }),
      item('adv-phytosanitary', '/plataforma-agritech/sanidad', 'Sanidad vegetal', '🦠', {
        permission: 'ephp:read',
        keywords: ['fitosanitario', 'plagas'],
      }),
      item('adv-trace', '/plataforma-agritech/trazabilidad', 'Trazabilidad', '🔗', {
        permission: 'eatr:read',
        keywords: ['trazabilidad'],
      }),
      item('adv-compliance', '/plataforma-agritech/cumplimiento', 'Cumplimiento', '✓', {
        permission: 'eacc:read',
        keywords: ['certificaciones', 'esg'],
      }),
      item('adv-machinery', '/plataforma-agritech/maquinaria', 'Maquinaria', '🚜', {
        permission: 'effm:read',
        keywords: ['maquinaria', 'flota'],
      }),
      item('adv-ag-ai', '/plataforma-agritech/inteligencia', 'Análisis agrícola', '🧠', {
        permission: 'eaip:read',
        keywords: ['ia agrícola', 'predicción'],
      }),
      /* ── Ecosistema e integración ── */
      item('adv-eace', '/plataforma-agritech/ecosistema', 'Ecosistema colaborativo', '🤝', {
        permission: 'eace:read',
        keywords: ['cooperativas', 'eace'],
      }),
      item('adv-integrations', '/integraciones', 'Integraciones', '🔗', {
        permission: 'integration:read',
        keywords: ['integraciones', 'conectores'],
      }),
      item('adv-eip', '/plataforma-empresarial/eip', 'Integración empresarial', '🔌', {
        permission: 'eip:read',
        keywords: ['eip', 'esb', 'apis'],
      }),
      item('adv-eint', '/plataforma-empresarial/eint', 'Inteligencia empresarial', '🧠', {
        permission: 'eint:read',
        keywords: ['eint', 'dwh', 'etl'],
      }),
      item('adv-plugins', '/plugins', 'Extensiones', '🧩', {
        permission: 'plugin:read',
        keywords: ['plugins', 'marketplace'],
      }),
      item('adv-iot', '/iot', 'Dispositivos e IoT', '📡', {
        permission: 'iot:read',
        keywords: ['iot', 'sensores'],
      }),
      item('adv-docs', '/documentos', 'Documentos', '📄', {
        permission: 'document:read',
        keywords: ['documentos', 'archivos'],
      }),
      /* ── Operaciones técnicas ── */
      item('adv-apis', '/apis', 'Gestión de APIs', '🔌', {
        permission: 'api:read',
        keywords: ['apis', 'desarrolladores'],
      }),
      item('adv-eops', '/plataforma-empresarial/eops', 'Operaciones de plataforma', '🛰', {
        permission: 'eops:read',
        keywords: ['devops', 'eops'],
      }),
      item('adv-ops', '/operaciones', 'Centro de operaciones', '🛰', {
        keywords: ['operaciones', 'infraestructura'],
      }),
      item('adv-perf', '/rendimiento', 'Rendimiento', '⚡', {
        keywords: ['rendimiento', 'performance'],
      }),
      /* ── RRHH extendido ── */
      item('adv-hr-rc', '/rrhh/reclutamiento', 'Reclutamiento', '🎯', {
        permission: 'hcm:read',
        keywords: ['vacantes', 'candidatos'],
      }),
      item('adv-hr-attendance', '/rrhh/asistencia', 'Asistencia', '⏱', {
        permission: 'hcm:read',
        keywords: ['marcaciones', 'turnos'],
      }),
      item('adv-hr-talent', '/rrhh/talento', 'Desarrollo de talento', '🎓', {
        permission: 'hcm:read',
        keywords: ['cursos', 'evaluaciones'],
      }),
      item('adv-hr-sst', '/rrhh/sst', 'Seguridad y salud laboral', '🛡', {
        permission: 'hcm:read',
        keywords: ['sst', 'salud ocupacional'],
      }),
      item('adv-hr-exec', '/rrhh/dashboard-ejecutivo', 'Panel de recursos humanos', '📊', {
        permission: 'hcm:read',
        searchType: 'report',
        keywords: ['dashboard rrhh'],
      }),
      /* ── Finanzas extendido ── */
      item('adv-fa', '/finanzas/activos-fijos', 'Activos fijos', '🏢', {
        permission: 'finance:read',
        keywords: ['activos fijos', 'depreciación'],
      }),
      item('adv-budget', '/finanzas/presupuestos', 'Presupuesto', '📊', {
        permission: 'finance:read',
        keywords: ['presupuesto'],
      }),
      item('adv-close', '/finanzas/foc', 'Cierre y reportes financieros', '📉', {
        permission: 'finance:read',
        keywords: ['cierre', 'estados financieros'],
      }),
      /* ── Manufactura extendido ── */
      item('adv-mfg-resources', '/manufactura/recursos', 'Recursos de producción', '🔧', {
        permission: 'manufacturing:read',
        keywords: ['recursos', 'centros'],
      }),
      item('adv-mfg-costs', '/manufactura/costos', 'Costos de producción', '💰', {
        permission: 'manufacturing:read',
        keywords: ['costos'],
      }),
      item('adv-mfg-intel', '/manufactura/inteligencia', 'Indicadores de manufactura', '🧠', {
        permission: 'manufacturing:read',
        searchType: 'report',
        keywords: ['oee', 'kpis'],
      }),
      /* ── Activos extendido ── */
      item('adv-reliability', '/gestion-activos/confiabilidad', 'Confiabilidad', '📈', {
        permission: 'asset_management:read',
        keywords: ['confiabilidad'],
      }),
      item('adv-asset-iot', '/gestion-activos/confiabilidad/iot', 'Sensores de activos', '📡', {
        permission: 'asset_management:read',
        keywords: ['iot activos'],
      }),
      /* ── Comercial extendido ── */
      item('adv-com-ops', '/comercial/ops', 'Operaciones comerciales', '📊', {
        permission: 'sales:read',
        searchType: 'report',
        keywords: ['reportes comerciales'],
      }),
      item('adv-portal-dash', '/portal/mi-dashboard', 'Mi panel personal', '🧭', {
        keywords: ['personal', 'dashboard'],
      }),
    ],
  },
];

export const EXTRA_SEARCH_ITEMS: NavItem[] = [
  item('search-producer-new', '/productores/nuevo', 'Nuevo productor', '➕', {
    searchType: 'process',
    keywords: ['crear productor'],
  }),
  item('search-farm-new', '/fincas/nueva', 'Nueva finca', '➕', {
    searchType: 'process',
    keywords: ['crear finca'],
  }),
  item('search-lot-new', '/lotes/nuevo', 'Nuevo lote', '➕', {
    searchType: 'process',
    keywords: ['crear lote'],
  }),
  item('search-coffee-wizard', '/compras/wizard', 'Registrar compra de café', '☕', {
    searchType: 'process',
    keywords: ['registrar compra'],
  }),
  item('search-invoice', '/comercial/facturas', 'Facturas', '🧾', {
    searchType: 'screen',
    keywords: ['facturas'],
  }),
  item('search-orders', '/comercial/pedidos', 'Órdenes de venta', '📦', {
    searchType: 'screen',
    keywords: ['órdenes', 'pedidos'],
  }),
  item('search-customers', '/comercial/clientes', 'Clientes', '👥', {
    searchType: 'screen',
    keywords: ['clientes'],
  }),
  item('search-iam-users', '/administracion/usuarios', 'Usuarios del sistema', '👤', {
    permission: 'user:read',
    searchType: 'config',
    keywords: ['usuarios'],
  }),
  item('search-bi-reports', '/bi/reportes', 'Reportes', '📊', {
    permission: 'analytics:read',
    searchType: 'report',
    keywords: ['reportes'],
  }),
  item('search-ai-chat', '/ia/chat', 'Chat con asistente', '💬', {
    permission: 'ai:read',
    searchType: 'screen',
    keywords: ['chat', 'asistente'],
  }),
];

export const ALL_NAV_ITEMS: NavItem[] = [
  ...NAV_CATEGORIES.flatMap((c) => c.items),
  ...EXTRA_SEARCH_ITEMS,
];

const CATEGORY_BY_ITEM_ID = new Map<string, NavCategory>();
for (const cat of NAV_CATEGORIES) {
  for (const navItem of cat.items) {
    CATEGORY_BY_ITEM_ID.set(navItem.id, cat);
  }
}

export function findNavItemByPath(pathname: string): NavItem | undefined {
  const sorted = [...ALL_NAV_ITEMS].sort((a, b) => b.to.length - a.to.length);
  return sorted.find((navItem) => {
    if (navItem.exact) return pathname === navItem.to;
    return pathname === navItem.to || pathname.startsWith(`${navItem.to}/`);
  });
}

export function findCategoryByPath(pathname: string): NavCategory | undefined {
  const match = findNavItemByPath(pathname);
  if (match) return CATEGORY_BY_ITEM_ID.get(match.id);
  return undefined;
}

/** Etiquetas de negocio para segmentos de ruta y pantallas de detalle */
const PATH_SEGMENT_LABELS: Record<string, string> = {
  productores: 'Productores',
  fincas: 'Fincas',
  lotes: 'Lotes',
  formularios: 'Formularios',
  procesos: 'Procesos',
  inventario: 'Inventario',
  compras: 'Compras',
  comercial: 'Ventas y comercial',
  administracion: 'Administración',
  iam: 'Usuarios y accesos',
  bi: 'Inteligencia de negocio',
  ia: 'Asistente inteligente',
  rrhh: 'Recursos humanos',
  finanzas: 'Finanzas',
  manufactura: 'Manufactura',
  gis: 'Mapas',
  portal: 'Portal del empleado',
  notificaciones: 'Notificaciones',
  tareas: 'Tareas programadas',
  documentos: 'Documentos',
  integraciones: 'Integraciones',
  plugins: 'Extensiones',
  reglas: 'Reglas de negocio',
  bpms: 'Procesos automatizados',
  operaciones: 'Centro de operaciones',
  operacion: 'Centro de Operación',
  gerencia: 'Centro de Gerencia',
  implementacion: 'Centro de Implementación',
  empresa: 'Empresa',
  configuracion: 'Configuración',
  modulos: 'Paquete',
  ayuda: 'Ayuda',
  recepcion: 'Recepción',
  pesaje: 'Pesaje',
  calidad: 'Calidad',
  liquidaciones: 'Liquidaciones',
  balanzas: 'Balanzas',
  cola: 'Cola',
  historial: 'Historial',
  indicadores: 'Indicadores',
  reportes: 'Reportes',
  ops: 'Operación',
  ejecutivo: 'Ejecutivo',
  analitica: 'Analítica',
  kpis: 'Indicadores',
  config: 'Configuración',
  catalogos: 'Catálogos',
  parametros: 'Parámetros',
  precios: 'Precios',
  centros: 'Centros',
  validaciones: 'Validaciones',
  cambios: 'Cambios',
  kardex: 'Kardex',
  trazabilidad: 'Trazabilidad',
  consultas: 'Consultas',
  eventos: 'Eventos',
  dashboards: 'Tableros',
  disenar: 'Diseñar',
  usuarios: 'Usuarios',
  estado: 'Estado',
  'go-live': 'Go Live',
  dia: 'Día',
  simple: 'Simplificado',
  monitor: 'Monitor',
  fotos: 'Fotos',
  muestras: 'Muestras',
  movimientos: 'Movimientos',
  nuevo: 'Nuevo',
  nueva: 'Nueva',
  editar: 'Editar',
  ejecutar: 'Ejecutar',
  bandeja: 'Bandeja',
  instancias: 'Solicitudes en curso',
  politicas: 'Políticas de seguridad',
  auditoria: 'Auditoría',
  permisos: 'Permisos',
  plantillas: 'Plantillas',
  campanas: 'Campañas',
  recoleccion: 'Recolección',
  dashboard: 'Indicadores',
  mapa: 'Mapa',
  wizard: 'Asistente de registro',
  'record-explorer': 'Expediente 360°',
  'cadena-suministro': 'Cadena de suministro',
  'gestion-activos': 'Gestión de activos',
  'plataforma-agritech': 'Plataforma agrícola',
  'plataforma-empresarial': 'Plataforma empresarial',
  rendimiento: 'Rendimiento',
  apis: 'Gestión de APIs',
  iot: 'Dispositivos e IoT',
};

const DETAIL_ROUTE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /^\/productores\/[^/]+$/, label: 'Detalle del productor' },
  { pattern: /^\/productores\/[^/]+\/editar$/, label: 'Editar productor' },
  { pattern: /^\/productores\/nuevo$/, label: 'Nuevo productor' },
  { pattern: /^\/fincas\/[^/]+$/, label: 'Detalle de la finca' },
  { pattern: /^\/fincas\/[^/]+\/editar$/, label: 'Editar finca' },
  { pattern: /^\/fincas\/nueva$/, label: 'Nueva finca' },
  { pattern: /^\/lotes\/[^/]+$/, label: 'Detalle del lote' },
  { pattern: /^\/lotes\/[^/]+\/editar$/, label: 'Editar lote' },
  { pattern: /^\/lotes\/nuevo$/, label: 'Nuevo lote' },
  { pattern: /^\/formularios\/[^/]+\/disenar$/, label: 'Diseñar formulario' },
  { pattern: /^\/formularios\/[^/]+\/ejecutar$/, label: 'Completar formulario' },
  { pattern: /^\/formularios\/nuevo$/, label: 'Nuevo formulario' },
  { pattern: /^\/record-explorer\/[^/]+\/[^/]+$/, label: 'Expediente 360°' },
  { pattern: /^\/procesos\/instancias\/[^/]+$/, label: 'Detalle de solicitud' },
];

function isUuidLike(segment: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
}

function resolveDetailLabel(pathname: string): string | undefined {
  for (const { pattern, label } of DETAIL_ROUTE_PATTERNS) {
    if (pattern.test(pathname)) return label;
  }
  return undefined;
}

function humanizeSegment(segment: string): string {
  if (isUuidLike(segment)) return 'Detalle';
  return PATH_SEGMENT_LABELS[segment] ?? segment.replace(/-/g, ' ');
}

export function buildBreadcrumbs(pathname: string): { label: string; to?: string }[] {
  const crumbs: { label: string; to?: string }[] = [{ label: 'Inicio', to: '/' }];
  if (pathname === '/') return crumbs;

  const detailLabel = resolveDetailLabel(pathname);
  const navMatch = findNavItemByPath(pathname);
  const category = findCategoryByPath(pathname);

  if (category && category.id !== 'home' && category.id !== 'favorites') {
    const catCrumb = { label: category.label, to: category.items[0]?.to };
    if (!crumbs.some((c) => c.label === catCrumb.label)) {
      crumbs.push(catCrumb);
    }
  }

  if (navMatch && navMatch.to !== '/' && navMatch.to !== pathname) {
    const navLabel = navMatch.breadcrumbLabel ?? navMatch.label;
    if (!crumbs.some((c) => c.to === navMatch.to)) {
      crumbs.push({ label: navLabel, to: navMatch.to });
    }
  }

  if (detailLabel) {
    crumbs.push({ label: detailLabel });
    return crumbs;
  }

  const segments = pathname.split('/').filter(Boolean);
  let acc = '';
  for (let i = 0; i < segments.length; i++) {
    acc += `/${segments[i]}`;
    const segMatch = findNavItemByPath(acc);
    if (segMatch && segMatch.to === acc) {
      if (!crumbs.some((c) => c.to === acc)) {
        crumbs.push({ label: segMatch.breadcrumbLabel ?? segMatch.label, to: acc });
      }
      continue;
    }
    const isLast = i === segments.length - 1;
    const label = humanizeSegment(segments[i]);
    if (isUuidLike(segments[i])) continue;
    if (!crumbs.some((c) => c.label === label && (isLast || c.to === acc))) {
      crumbs.push({ label, to: isLast ? undefined : acc });
    }
  }

  if (crumbs.length > 1 && crumbs[crumbs.length - 1].to) {
    crumbs[crumbs.length - 1] = { label: crumbs[crumbs.length - 1].label };
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
  if (r.some((x) => x.includes('cfo') || (x.includes('director') && x.includes('financ')))) return 'cfo';
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

/** Categorías expandidas por defecto en primer ingreso (cooperativa: flujo + inventario) */
export const DEFAULT_EXPANDED_CATEGORIES: NavCategoryId[] = [
  'home',
  'favorites',
  'purchases',
  'inventory',
  'masters',
];
