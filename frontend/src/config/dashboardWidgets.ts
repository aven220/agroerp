import type { DashboardRole } from './navigation';

export interface DashboardWidget {
  id: string;
  label: string;
  type: 'kpi' | 'links' | 'activity' | 'shortcuts';
  kpiKey?: string;
  links?: { to: string; label: string }[];
  defaultVisible: boolean;
}

export const DASHBOARD_WIDGETS: Record<DashboardRole, DashboardWidget[]> = {
  admin: [
    { id: 'kpi-overview', label: 'Resumen operativo', type: 'kpi', kpiKey: 'overview', defaultVisible: true },
    { id: 'shortcuts-admin', label: 'Administración', type: 'shortcuts', defaultVisible: true, links: [
      { to: '/iam', label: 'Seguridad' }, { to: '/administracion', label: 'Administración' }, { to: '/operaciones', label: 'Operaciones' },
    ]},
    { id: 'activity', label: 'Actividad reciente', type: 'activity', defaultVisible: true },
    { id: 'links-agri', label: 'Operación agrícola', type: 'links', defaultVisible: true, links: [
      { to: '/plataforma-agritech', label: 'Plataforma agrícola' }, { to: '/plataforma-agritech/ecosistema', label: 'Ecosistema' },
    ]},
  ],
  executive: [
    { id: 'kpi-overview', label: 'Indicadores clave', type: 'kpi', kpiKey: 'overview', defaultVisible: true },
    { id: 'links-exec', label: 'Paneles ejecutivos', type: 'links', defaultVisible: true, links: [
      { to: '/compras/ops/ejecutivo', label: 'Café ejecutivo' }, { to: '/comercial/ops/ejecutivo', label: 'Comercial' },
      { to: '/plataforma-agritech/ecosistema/ejecutivo', label: 'Agrícola' }, { to: '/rrhh/dashboard-ejecutivo', label: 'Personal' },
    ]},
    { id: 'activity', label: 'Actividad', type: 'activity', defaultVisible: true },
  ],
  purchasing: [
    { id: 'kpi-overview', label: 'Compras', type: 'kpi', kpiKey: 'purchases', defaultVisible: true },
    { id: 'links-purch', label: 'Procesos de compra', type: 'links', defaultVisible: true, links: [
      { to: '/compras', label: 'Centro de compras' }, { to: '/compras/wizard', label: 'Registrar compra' },
      { to: '/compras/pesaje', label: 'Pesaje' }, { to: '/compras/liquidaciones', label: 'Liquidaciones' },
    ]},
    { id: 'activity', label: 'Actividad', type: 'activity', defaultVisible: false },
  ],
  sales: [
    { id: 'links-sales', label: 'Ventas', type: 'links', defaultVisible: true, links: [
      { to: '/comercial', label: 'Centro comercial' }, { to: '/comercial/pedidos', label: 'Pedidos' },
      { to: '/comercial/crm', label: 'Clientes' }, { to: '/comercial/facturas', label: 'Facturas' },
    ]},
    { id: 'activity', label: 'Actividad', type: 'activity', defaultVisible: true },
  ],
  inventory: [
    { id: 'kpi-overview', label: 'Inventario', type: 'kpi', kpiKey: 'inventory', defaultVisible: true },
    { id: 'links-inv', label: 'Operaciones de inventario', type: 'links', defaultVisible: true, links: [
      { to: '/inventario', label: 'Inventario' }, { to: '/inventario/movimientos', label: 'Movimientos' },
      { to: '/inventario/conteos', label: 'Conteos' }, { to: '/inventario/planificador', label: 'Planificador' },
    ]},
  ],
  finance: [
    { id: 'links-fin', label: 'Finanzas', type: 'links', defaultVisible: true, links: [
      { to: '/finanzas', label: 'Centro financiero' }, { to: '/finanzas/cxp', label: 'Cuentas por pagar' },
      { to: '/finanzas/tesoreria', label: 'Tesorería' }, { to: '/comercial/cartera', label: 'Cartera' },
    ]},
    { id: 'activity', label: 'Actividad', type: 'activity', defaultVisible: true },
  ],
  production: [
    { id: 'links-mfg', label: 'Producción', type: 'links', defaultVisible: true, links: [
      { to: '/manufactura', label: 'Manufactura' }, { to: '/manufactura/mes', label: 'Planta' },
      { to: '/manufactura/calidad', label: 'Calidad' }, { to: '/manufactura/inteligencia', label: 'Indicadores' },
    ]},
  ],
  agricultural: [
    { id: 'kpi-overview', label: 'Operación agrícola', type: 'kpi', kpiKey: 'overview', defaultVisible: true },
    { id: 'links-agri', label: 'Operación agrícola', type: 'links', defaultVisible: true, links: [
      { to: '/plataforma-agritech', label: 'Plataforma agrícola' }, { to: '/lotes', label: 'Lotes' },
      { to: '/plataforma-agritech/inteligencia', label: 'Análisis' }, { to: '/plataforma-agritech/ecosistema', label: 'Ecosistema' },
    ]},
    { id: 'shortcuts-field', label: 'Campo', type: 'shortcuts', defaultVisible: true, links: [
      { to: '/productores', label: 'Productores' }, { to: '/fincas', label: 'Fincas' }, { to: '/gis', label: 'Mapas' },
    ]},
  ],
  hr: [
    { id: 'links-hr', label: 'Talento humano', type: 'links', defaultVisible: true, links: [
      { to: '/rrhh', label: 'Personal' }, { to: '/rrhh/nomina', label: 'Nómina' },
      { to: '/rrhh/asistencia', label: 'Asistencia' }, { to: '/portal', label: 'Portal' },
    ]},
    { id: 'links-hr-exec', label: 'Panel de personal', type: 'links', defaultVisible: true, links: [
      { to: '/rrhh/dashboard-ejecutivo', label: 'Ejecutivo' }, { to: '/portal/analytics', label: 'Analítica' },
    ]},
  ],
  maintenance: [
    { id: 'links-eam', label: 'Activos', type: 'links', defaultVisible: true, links: [
      { to: '/gestion-activos', label: 'Activos' }, { to: '/gestion-activos/mantenimiento', label: 'Mantenimiento' },
      { to: '/plataforma-agritech/maquinaria', label: 'Maquinaria' },
    ]},
  ],
  crm: [
    { id: 'links-crm', label: 'Clientes', type: 'links', defaultVisible: true, links: [
      { to: '/comercial/crm', label: 'Gestión de clientes' }, { to: '/comercial/oportunidades', label: 'Oportunidades' },
    ]},
    { id: 'activity', label: 'Actividad', type: 'activity', defaultVisible: true },
  ],
  logistics: [
    { id: 'kpi-overview', label: 'Inventario', type: 'kpi', kpiKey: 'inventory', defaultVisible: true },
    { id: 'links-inv', label: 'Logística', type: 'links', defaultVisible: true, links: [
      { to: '/cadena-suministro', label: 'Suministro' }, { to: '/inventario', label: 'Inventario' },
    ]},
  ],
  quality: [
    { id: 'links-mfg', label: 'Calidad', type: 'links', defaultVisible: true, links: [
      { to: '/manufactura/calidad', label: 'Calidad' }, { to: '/compras/calidad', label: 'Calidad café' },
    ]},
  ],
  audit: [
    { id: 'activity', label: 'Actividad', type: 'activity', defaultVisible: true },
    { id: 'links-admin', label: 'Auditoría', type: 'links', defaultVisible: true, links: [
      { to: '/iam/auditoria', label: 'Auditoría' }, { to: '/bi', label: 'Reportes' },
    ]},
  ],
  cfo: [
    { id: 'links-fin', label: 'Finanzas', type: 'links', defaultVisible: true, links: [
      { to: '/finanzas', label: 'Centro financiero' }, { to: '/finanzas/tesoreria', label: 'Tesorería' },
    ]},
    { id: 'activity', label: 'Actividad', type: 'activity', defaultVisible: true },
  ],
  default: [
    { id: 'kpi-overview', label: 'Resumen', type: 'kpi', kpiKey: 'overview', defaultVisible: true },
    { id: 'shortcuts', label: 'Accesos rápidos', type: 'shortcuts', defaultVisible: true, links: [
      { to: '/productores', label: 'Productores' }, { to: '/compras', label: 'Compras' },
      { to: '/inventario', label: 'Inventario' }, { to: '/documentos', label: 'Documentos' },
    ]},
    { id: 'activity', label: 'Actividad reciente', type: 'activity', defaultVisible: true },
  ],
};

export const DEFAULT_WIDGET_ORDER: Record<DashboardRole, string[]> = Object.fromEntries(
  Object.entries(DASHBOARD_WIDGETS).map(([role, widgets]) => [role, widgets.map((w) => w.id)]),
) as Record<DashboardRole, string[]>;
