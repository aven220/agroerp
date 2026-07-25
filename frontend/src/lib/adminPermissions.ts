import type { Permission } from '../types';

export const ACTION_LABELS: Record<string, string> = {
  read: 'consultar',
  create: 'crear',
  update: 'editar',
  delete: 'eliminar',
  submit: 'enviar',
  publish: 'publicar',
  approve: 'aprobar',
  execute: 'ejecutar',
  assign: 'asignar',
  import: 'importar',
  export: 'exportar',
  admin: 'administrar',
  design: 'diseñar',
  cancel: 'cancelar',
  receive: 'recibir café',
  weigh: 'pesar',
  'weigh:manual': 'pesar manualmente',
  'weigh:configure': 'configurar báscula',
  quality: 'calidad',
  'quality:decide': 'decidir calidad',
  'quality:configure': 'configurar calidad',
  settle: 'liquidar',
  'settle:void': 'anular liquidación',
  'settle:pay': 'pagar liquidación',
  inventory: 'inventario café',
  'config:read': 'ver configuración',
  'config:manage': 'gestionar configuración',
  'catalog:manage': 'gestionar catálogos',
  'audit:read': 'ver auditoría',
  push: 'enviar sincronización',
  send: 'enviar',
  chat: 'usar chat',
  configure: 'configurar',
  simulate: 'simular',
  install: 'instalar',
  uninstall: 'desinstalar',
  register: 'registrar',
  control: 'controlar',
  revoke: 'revocar',
  ingest: 'recibir telemetría',
  optimize: 'optimizar',
  lifecycle: 'ciclo de vida',
  precision: 'agricultura de precisión',
  upload: 'cargar',
  measure: 'medir',
  capture: 'capturar',
  edit: 'editar geometría',
  analyze: 'analizar',
  route: 'rutas',
  acknowledge: 'reconocer alertas',
  share: 'compartir',
  schedule: 'programar',
  item: 'ítems',
  warehouse: 'bodegas',
  catalog: 'catálogo',
  config: 'configuración',
  audit: 'auditoría',
  customer: 'clientes',
  pricing: 'precios',
  crm: 'CRM',
  opportunity: 'oportunidades',
  quotation: 'cotizaciones',
  order: 'pedidos',
  reservation: 'reservas',
  dispatch: 'despachos',
  delivery: 'entregas',
  logistics: 'logística',
  invoice: 'facturas',
  billing: 'facturación',
  return: 'devoluciones',
  warranty: 'garantías',
  receivable: 'cuentas por cobrar',
  collection: 'cobranza',
  payment: 'pagos',
  analytics: 'analítica',
  report: 'reportes',
  ops: 'operaciones',
  coa: 'plan de cuentas',
  rule: 'reglas',
  journal: 'asientos',
  voucher: 'comprobantes',
  period: 'periodos',
};

/** Nombres en español de cada área (evita códigos como eint, effm, coffee). */
export const RESOURCE_LABELS: Record<string, string> = {
  producer: 'productores',
  farm: 'fincas',
  field_lot: 'lotes',
  lot: 'lotes',
  field_operation: 'labores de campo',
  lot_cost: 'costos de lote',
  territory: 'territorio',
  form: 'formularios',
  user: 'usuarios',
  role: 'roles',
  permission: 'permisos',
  group: 'grupos',
  policy: 'políticas de acceso',
  session: 'sesiones',
  org_unit: 'unidades organizativas',
  service_account: 'cuentas de servicio',
  team: 'equipos',
  workflow: 'procesos',
  bpms: 'procesos de negocio',
  resource: 'recursos del sistema',
  metadata: 'metadatos',
  event: 'eventos',
  sync: 'sincronización móvil',
  audit: 'auditoría',
  document: 'documentos',
  notification: 'notificaciones',
  alert: 'alertas',
  analytics: 'análisis e inteligencia',
  dashboard: 'paneles',
  kpi: 'indicadores',
  query: 'consultas',
  report: 'reportes',
  ai: 'asistente inteligente',
  gis: 'mapas y GIS',
  organization: 'organización / empresa',
  iam: 'identidad y accesos (IAM)',
  coffee: 'compras de café',
  inventory: 'inventario',
  sales: 'ventas y comercial',
  finance: 'finanzas',
  manufacturing: 'manufactura',
  asset_management: 'gestión de activos',
  hcm: 'recursos humanos',
  portal: 'portal externo',
  integration: 'integraciones',
  plugin: 'complementos (plugins)',
  api: 'APIs',
  iot: 'IoT / dispositivos',
  bre: 'reglas de negocio',
  scheduler: 'programador de tareas',
  observability: 'observabilidad',
  performance: 'rendimiento',
  // Códigos de plataforma → nombre claro
  eims: 'inventario (EIMS)',
  epscm: 'planificación de cadena',
  escm: 'cadena de suministro',
  emfg: 'manufactura (EMFG)',
  eam: 'activos y mantenimiento',
  efm: 'finanzas (EFM)',
  eint: 'integraciones (EINT)',
  eatp: 'plataforma AgriTech',
  eapp: 'agricultura de precisión',
  eiwp: 'riego y agua',
  ephp: 'sanidad vegetal',
  eatr: 'rastreabilidad agrícola',
  eacc: 'cumplimiento agrícola',
  effm: 'finanzas de finca (EFFM)',
  eaip: 'inteligencia agrícola',
  eace: 'experiencia cooperativa',
  ebiap: 'business intelligence',
  eiamp: 'políticas IAM avanzadas',
  cpep: 'compras de café (módulo)',
  prm: 'relación con productores',
  ftip: 'fincas y territorio',
  fmdt: 'lotes y operaciones',
  supply_chain: 'cadena de suministro',
};

export type ModuleDef = {
  id: string;
  label: string;
  description: string;
  match: (resource: string) => boolean;
};

export const ADMIN_MODULES: ModuleDef[] = [
  {
    id: 'coffee',
    label: 'Compras de café',
    description:
      'Ingreso a Compras, recepción, báscula, calidad, liquidación e inventario de café. Para el rol Compras active al menos «consultar compras de café» (coffee:read).',
    match: (r) => r === 'coffee' || r === 'cpep' || r.startsWith('coffee'),
  },
  {
    id: 'agriculture',
    label: 'Operación agrícola',
    description: 'Productores, fincas, lotes y mapas de la operación en campo.',
    match: (r) =>
      ['producer', 'farm', 'lot', 'field_lot', 'field_operation', 'lot_cost', 'territory', 'gis', 'prm', 'ftip', 'fmdt'].includes(
        r,
      ) ||
      r.startsWith('producer') ||
      r.startsWith('farm') ||
      r.startsWith('lot') ||
      r.startsWith('gis'),
  },
  {
    id: 'forms',
    label: 'Formularios y captura',
    description: 'Diseño, publicación y recolección de datos en formularios.',
    match: (r) => r === 'form' || r.startsWith('form'),
  },
  {
    id: 'iam',
    label: 'Usuarios y accesos',
    description: 'Cuentas, roles, permisos y configuración de la organización.',
    match: (r) =>
      ['user', 'role', 'permission', 'organization', 'session', 'group', 'policy', 'org_unit', 'team', 'service_account', 'iam'].includes(
        r,
      ) ||
      r.startsWith('iam') ||
      r.startsWith('eiamp'),
  },
  {
    id: 'workflow',
    label: 'Procesos y aprobaciones',
    description: 'Bandejas de tareas, flujos de aprobación y procesos de negocio.',
    match: (r) =>
      r === 'workflow' || r === 'bpms' || r.startsWith('workflow') || r.startsWith('bpms'),
  },
  {
    id: 'inventory',
    label: 'Inventario',
    description: 'Bodegas, ítems e inventario general (además del inventario de café).',
    match: (r) => r === 'inventory' || r === 'eims' || r.startsWith('eims'),
  },
  {
    id: 'supply',
    label: 'Cadena de suministro y ventas',
    description: 'Pedidos, despachos, ventas y logística.',
    match: (r) =>
      ['epscm', 'escm', 'sales', 'supply_chain'].includes(r) ||
      r.startsWith('epscm') ||
      r.startsWith('escm') ||
      r.startsWith('sales'),
  },
  {
    id: 'finance',
    label: 'Finanzas',
    description: 'Contabilidad, pagos, tesorería y finanzas de finca.',
    match: (r) =>
      ['finance', 'efm', 'effm'].includes(r) ||
      r.startsWith('finance') ||
      r.startsWith('efm') ||
      r.startsWith('effm'),
  },
  {
    id: 'mfg',
    label: 'Producción y activos',
    description: 'Manufactura, mantenimiento y recursos humanos.',
    match: (r) =>
      ['emfg', 'eam', 'hcm', 'manufacturing', 'asset_management'].includes(r) ||
      r.startsWith('emfg') ||
      r.startsWith('eam') ||
      r.startsWith('hcm'),
  },
  {
    id: 'intel',
    label: 'Reportes e inteligencia',
    description: 'Paneles, indicadores, consultas y análisis.',
    match: (r) =>
      ['analytics', 'dashboard', 'kpi', 'query', 'ai', 'report', 'ebiap'].includes(r) ||
      r.startsWith('bi') ||
      r.startsWith('ebiap') ||
      r.startsWith('ai'),
  },
  {
    id: 'integrations',
    label: 'Integraciones y APIs',
    description: 'Conectores, APIs, IoT, plugins y reglas de negocio (antes aparecía como eint).',
    match: (r) =>
      ['integration', 'eint', 'api', 'iot', 'plugin', 'bre', 'scheduler'].includes(r) ||
      r.startsWith('eint') ||
      r.startsWith('integration') ||
      r.startsWith('api') ||
      r.startsWith('iot') ||
      r.startsWith('plugin') ||
      r.startsWith('bre'),
  },
  {
    id: 'ops',
    label: 'Operaciones del sistema',
    description: 'Sincronización, auditoría, notificaciones y monitoreo.',
    match: (r) =>
      [
        'resource',
        'metadata',
        'event',
        'sync',
        'audit',
        'notification',
        'alert',
        'document',
        'observability',
        'performance',
      ].includes(r),
  },
  {
    id: 'agritech',
    label: 'AgriTech avanzada',
    description: 'Precisión, riego, sanidad vegetal, rastreabilidad y cumplimiento.',
    match: (r) =>
      ['eatp', 'eapp', 'eiwp', 'ephp', 'eatr', 'eacc', 'eaip', 'eace', 'portal'].includes(r) ||
      r.startsWith('eatp') ||
      r.startsWith('eapp') ||
      r.startsWith('eiwp') ||
      r.startsWith('ephp'),
  },
];

export function resolveAdminModule(resource: string): ModuleDef {
  return (
    ADMIN_MODULES.find((m) => m.match(resource)) ?? {
      id: 'other',
      label: 'Otros',
      description: 'Permisos adicionales del sistema.',
      match: () => true,
    }
  );
}

export function resourceLabel(resource: string): string {
  if (RESOURCE_LABELS[resource]) return RESOURCE_LABELS[resource];
  const prefix = Object.keys(RESOURCE_LABELS)
    .sort((a, b) => b.length - a.length)
    .find((k) => resource === k || resource.startsWith(`${k}_`) || resource.startsWith(`${k}:`));
  if (prefix) return RESOURCE_LABELS[prefix];
  return resource.replace(/_/g, ' ');
}

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/[_:]/g, ' ');
}

export function permKey(p: Permission): string {
  return `${p.resource}:${p.action}`;
}

export function describePermission(p: Permission): string {
  return `Puede ${actionLabel(p.action)} ${resourceLabel(p.resource)}`;
}

/** Texto corto para UI: nombre humano + código técnico. */
export function permissionDisplayTitle(resource: string, action: string): string {
  return `Puede ${actionLabel(action)} ${resourceLabel(resource)}`;
}

export function slugifyRoleName(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 48) || 'rol_nuevo'
  );
}

export const USER_STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  locked: 'Bloqueado',
  pending: 'Pendiente de activación',
  expired: 'Expirado',
};
