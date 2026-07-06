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
      { to: '/iam', label: 'IAM' }, { to: '/administracion', label: 'Admin' }, { to: '/operaciones', label: 'Ops' },
    ]},
    { id: 'activity', label: 'Actividad reciente', type: 'activity', defaultVisible: true },
    { id: 'links-agri', label: 'AgriTech', type: 'links', defaultVisible: true, links: [
      { to: '/plataforma-agritech', label: 'AgriTech' }, { to: '/plataforma-agritech/ecosistema', label: 'Ecosistema' },
    ]},
  ],
  executive: [
    { id: 'kpi-overview', label: 'Indicadores clave', type: 'kpi', kpiKey: 'overview', defaultVisible: true },
    { id: 'links-exec', label: 'Paneles ejecutivos', type: 'links', defaultVisible: true, links: [
      { to: '/compras/ops/ejecutivo', label: 'Café ejecutivo' }, { to: '/comercial/ops/ejecutivo', label: 'Comercial' },
      { to: '/plataforma-agritech/ecosistema/ejecutivo', label: 'Agrícola' }, { to: '/rrhh/dashboard-ejecutivo', label: 'RRHH' },
    ]},
    { id: 'activity', label: 'Actividad', type: 'activity', defaultVisible: true },
  ],
  purchasing: [
    { id: 'kpi-overview', label: 'Compras', type: 'kpi', kpiKey: 'purchases', defaultVisible: true },
    { id: 'links-purch', label: 'Procesos de compra', type: 'links', defaultVisible: true, links: [
      { to: '/compras', label: 'Centro café' }, { to: '/compras/wizard', label: 'Wizard compra' },
      { to: '/compras/pesaje', label: 'Pesaje' }, { to: '/compras/liquidaciones', label: 'Liquidaciones' },
    ]},
    { id: 'activity', label: 'Actividad', type: 'activity', defaultVisible: false },
  ],
  sales: [
    { id: 'links-sales', label: 'Ventas', type: 'links', defaultVisible: true, links: [
      { to: '/comercial', label: 'Centro comercial' }, { to: '/comercial/pedidos', label: 'Pedidos' },
      { to: '/comercial/crm', label: 'CRM' }, { to: '/comercial/facturas', label: 'Facturas' },
    ]},
    { id: 'activity', label: 'Actividad', type: 'activity', defaultVisible: true },
  ],
  inventory: [
    { id: 'kpi-overview', label: 'Inventario', type: 'kpi', kpiKey: 'inventory', defaultVisible: true },
    { id: 'links-inv', label: 'Operaciones inventario', type: 'links', defaultVisible: true, links: [
      { to: '/inventario', label: 'EIMS' }, { to: '/inventario/movimientos', label: 'Movimientos' },
      { to: '/inventario/conteos', label: 'Conteos' }, { to: '/inventario/planificador', label: 'Planificador' },
    ]},
  ],
  finance: [
    { id: 'links-fin', label: 'Finanzas', type: 'links', defaultVisible: true, links: [
      { to: '/finanzas', label: 'Centro financiero' }, { to: '/finanzas/cxp', label: 'CXP' },
      { to: '/finanzas/tesoreria', label: 'Tesorería' }, { to: '/comercial/cartera', label: 'Cartera' },
    ]},
    { id: 'activity', label: 'Actividad', type: 'activity', defaultVisible: true },
  ],
  production: [
    { id: 'links-mfg', label: 'Producción', type: 'links', defaultVisible: true, links: [
      { to: '/manufactura', label: 'EMFG' }, { to: '/manufactura/mes', label: 'MES' },
      { to: '/manufactura/calidad', label: 'QMS' }, { to: '/manufactura/inteligencia', label: 'Inteligencia' },
    ]},
  ],
  agricultural: [
    { id: 'kpi-overview', label: 'Operación agrícola', type: 'kpi', kpiKey: 'overview', defaultVisible: true },
    { id: 'links-agri', label: 'AgriTech', type: 'links', defaultVisible: true, links: [
      { to: '/plataforma-agritech', label: 'AgriTech' }, { to: '/lotes', label: 'Lotes' },
      { to: '/plataforma-agritech/inteligencia', label: 'Inteligencia' }, { to: '/plataforma-agritech/ecosistema', label: 'Ecosistema' },
    ]},
    { id: 'shortcuts-field', label: 'Campo', type: 'shortcuts', defaultVisible: true, links: [
      { to: '/productores', label: 'Productores' }, { to: '/fincas', label: 'Fincas' }, { to: '/gis', label: 'GIS' },
    ]},
  ],
  hr: [
    { id: 'links-hr', label: 'Talento humano', type: 'links', defaultVisible: true, links: [
      { to: '/rrhh', label: 'HCM' }, { to: '/rrhh/nomina', label: 'Nómina' },
      { to: '/rrhh/asistencia', label: 'Asistencia' }, { to: '/portal', label: 'Portal' },
    ]},
    { id: 'links-hr-exec', label: 'Dashboard RRHH', type: 'links', defaultVisible: true, links: [
      { to: '/rrhh/dashboard-ejecutivo', label: 'Ejecutivo' }, { to: '/portal/analytics', label: 'Analítica' },
    ]},
  ],
  maintenance: [
    { id: 'links-eam', label: 'Activos', type: 'links', defaultVisible: true, links: [
      { to: '/gestion-activos', label: 'EAM' }, { to: '/gestion-activos/mantenimiento', label: 'CMMS' },
      { to: '/plataforma-agritech/maquinaria', label: 'Maquinaria' },
    ]},
  ],
  crm: [
    { id: 'links-crm', label: 'CRM', type: 'links', defaultVisible: true, links: [
      { to: '/comercial/crm', label: 'CRM' }, { to: '/comercial/oportunidades', label: 'Oportunidades' },
    ]},
    { id: 'activity', label: 'Actividad', type: 'activity', defaultVisible: true },
  ],
  logistics: [
    { id: 'kpi-overview', label: 'Inventario', type: 'kpi', kpiKey: 'inventory', defaultVisible: true },
    { id: 'links-inv', label: 'Logística', type: 'links', defaultVisible: true, links: [
      { to: '/cadena-suministro', label: 'SCM' }, { to: '/inventario', label: 'EIMS' },
    ]},
  ],
  quality: [
    { id: 'links-mfg', label: 'Calidad', type: 'links', defaultVisible: true, links: [
      { to: '/manufactura/calidad', label: 'QMS' }, { to: '/compras/calidad', label: 'Calidad café' },
    ]},
  ],
  audit: [
    { id: 'activity', label: 'Actividad', type: 'activity', defaultVisible: true },
    { id: 'links-admin', label: 'Auditoría', type: 'links', defaultVisible: true, links: [
      { to: '/iam/auditoria', label: 'IAM' }, { to: '/bi', label: 'BI' },
    ]},
  ],
  cfo: [
    { id: 'links-fin', label: 'Finanzas', type: 'links', defaultVisible: true, links: [
      { to: '/finanzas', label: 'Centro' }, { to: '/finanzas/tesoreria', label: 'Tesorería' },
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
