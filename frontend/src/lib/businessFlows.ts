/**
 * Definiciones de flujos de negocio EFX — solo UX, sin reglas de negocio nuevas.
 */

export type FlowId =
  | 'organization'
  | 'forms'
  | 'agricultural'
  | 'workflow'
  | 'administration'
  | 'purchases'
  | 'inventory'
  | 'reports'
  | 'integrations';

export interface FlowStep {
  id: string;
  label: string;
  /** Ruta base para navegación directa al paso */
  route: string;
  /** Detecta si la ruta actual corresponde a este paso */
  match: (pathname: string) => boolean;
}

export interface BusinessFlow {
  id: FlowId;
  title: string;
  description: string;
  steps: FlowStep[];
}

function starts(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export const BUSINESS_FLOWS: Record<FlowId, BusinessFlow> = {
  organization: {
    id: 'organization',
    title: 'Configurar organización',
    description: 'Defina roles, usuarios y permisos para que su equipo pueda ingresar.',
    steps: [
      {
        id: 'hub',
        label: 'Centro admin',
        route: '/administracion',
        match: (p) => p === '/administracion' || p === '/iam',
      },
      {
        id: 'role',
        label: 'Crear rol',
        route: '/administracion',
        match: (p) => p === '/administracion' && !p.includes('/usuarios'),
      },
      {
        id: 'user',
        label: 'Crear usuario',
        route: '/administracion/usuarios',
        match: (p) => starts(p, '/administracion/usuarios'),
      },
      {
        id: 'permissions',
        label: 'Asignar permisos',
        route: '/administracion',
        match: (p) => starts(p, '/iam/permisos') || (p === '/administracion' && !starts(p, '/administracion/usuarios')),
      },
      {
        id: 'onboarding',
        label: 'Primer ingreso',
        route: '/iam/auditoria',
        match: (p) => starts(p, '/iam/auditoria') || p === '/login',
      },
    ],
  },

  forms: {
    id: 'forms',
    title: 'Ciclo de formularios',
    description: 'Cree, diseñe, pruebe, publique y capture datos en campo.',
    steps: [
      {
        id: 'create',
        label: 'Crear',
        route: '/formularios/nuevo',
        match: (p) => p === '/formularios/nuevo',
      },
      {
        id: 'design',
        label: 'Diseñar',
        route: '/formularios',
        match: (p) => /\/formularios\/[^/]+\/disenar/.test(p),
      },
      {
        id: 'test',
        label: 'Probar',
        route: '/formularios',
        match: (p) => /\/formularios\/[^/]+\/disenar/.test(p),
      },
      {
        id: 'publish',
        label: 'Publicar',
        route: '/formularios',
        match: (p) => /\/formularios\/[^/]+$/.test(p) && !p.endsWith('/disenar') && !p.endsWith('/ejecutar') && p !== '/formularios/nuevo',
      },
      {
        id: 'assign',
        label: 'Asignar',
        route: '/formularios/campanas',
        match: (p) => starts(p, '/formularios/campanas'),
      },
      {
        id: 'capture',
        label: 'Capturar',
        route: '/formularios/recoleccion',
        match: (p) => starts(p, '/formularios/recoleccion') || /\/formularios\/[^/]+\/ejecutar/.test(p),
      },
    ],
  },

  agricultural: {
    id: 'agricultural',
    title: 'Registro agrícola completo',
    description: 'Del productor al indicador: un solo recorrido guiado.',
    steps: [
      {
        id: 'producer',
        label: 'Productor',
        route: '/productores/nuevo',
        match: (p) => starts(p, '/productores'),
      },
      {
        id: 'farm',
        label: 'Finca',
        route: '/fincas/nueva',
        match: (p) => starts(p, '/fincas'),
      },
      {
        id: 'lot',
        label: 'Lote',
        route: '/lotes/nuevo',
        match: (p) => starts(p, '/lotes'),
      },
      {
        id: 'crop',
        label: 'Cultivo',
        route: '/plataforma-agritech/cultivos',
        match: (p) => starts(p, '/plataforma-agritech/cultivos'),
      },
      {
        id: 'activity',
        label: 'Captura',
        route: '/formularios/recoleccion',
        match: (p) =>
          starts(p, '/formularios/recoleccion') ||
          /\/formularios\/[^/]+\/ejecutar/.test(p),
      },
      {
        id: 'approval',
        label: 'Aprobación',
        route: '/procesos/bandeja',
        match: (p) => starts(p, '/procesos/bandeja') || starts(p, '/procesos/instancias'),
      },
      {
        id: 'record',
        label: 'Expediente',
        route: '/productores',
        match: (p) =>
          starts(p, '/record-explorer') ||
          /^\/productores\/[^/]+$/.test(p) ||
          /^\/fincas\/[^/]+$/.test(p) ||
          /^\/lotes\/[^/]+$/.test(p),
      },
      {
        id: 'indicators',
        label: 'Indicadores',
        route: '/productores/dashboard',
        match: (p) =>
          p.includes('/dashboard') &&
          (starts(p, '/productores') || starts(p, '/fincas') || starts(p, '/lotes')),
      },
    ],
  },

  workflow: {
    id: 'workflow',
    title: 'Bandeja de aprobaciones',
    description: 'Revise tareas, comente y avance al siguiente paso del proceso.',
    steps: [
      {
        id: 'inbox',
        label: 'Tareas pendientes',
        route: '/procesos/bandeja',
        match: (p) => p === '/procesos/bandeja',
      },
      {
        id: 'detail',
        label: 'Detalle',
        route: '/procesos/instancias',
        match: (p) => starts(p, '/procesos/instancias'),
      },
      {
        id: 'comment',
        label: 'Comentario',
        route: '/procesos/bandeja',
        match: (p) => p === '/procesos/bandeja',
      },
      {
        id: 'action',
        label: 'Aprobar / Rechazar',
        route: '/procesos/bandeja',
        match: (p) => p === '/procesos/bandeja',
      },
      {
        id: 'next',
        label: 'Siguiente tarea',
        route: '/procesos/bandeja',
        match: (p) => p === '/procesos/bandeja' || starts(p, '/procesos/instancias'),
      },
    ],
  },

  administration: {
    id: 'administration',
    title: 'Administración del sistema',
    description: 'Usuarios, roles, permisos y auditoría en un recorrido guiado.',
    steps: [
      {
        id: 'users',
        label: 'Usuarios',
        route: '/administracion/usuarios',
        match: (p) => starts(p, '/administracion/usuarios'),
      },
      {
        id: 'roles',
        label: 'Roles',
        route: '/administracion',
        match: (p) => p === '/administracion',
      },
      {
        id: 'permissions',
        label: 'Permisos',
        route: '/iam/permisos',
        match: (p) => starts(p, '/iam/permisos'),
      },
      {
        id: 'audit',
        label: 'Auditoría',
        route: '/iam/auditoria',
        match: (p) => starts(p, '/iam/auditoria'),
      },
    ],
  },

  purchases: {
    id: 'purchases',
    title: 'Compra de café',
    description: 'Recepción, pesaje, calidad, liquidación y trazabilidad.',
    steps: [
      {
        id: 'wizard',
        label: 'Recepción',
        route: '/compras/wizard',
        match: (p) => starts(p, '/compras/wizard') || starts(p, '/compras/recepcion'),
      },
      {
        id: 'weighing',
        label: 'Pesaje',
        route: '/compras/pesaje',
        match: (p) => starts(p, '/compras/pesaje'),
      },
      {
        id: 'quality',
        label: 'Calidad',
        route: '/compras/calidad',
        match: (p) => starts(p, '/compras/calidad'),
      },
      {
        id: 'settlement',
        label: 'Liquidación',
        route: '/compras/liquidaciones',
        match: (p) => starts(p, '/compras/liquidaciones'),
      },
      {
        id: 'traceability',
        label: 'Trazabilidad',
        route: '/compras/trazabilidad',
        match: (p) => starts(p, '/compras/trazabilidad'),
      },
    ],
  },

  inventory: {
    id: 'inventory',
    title: 'Gestión de inventario',
    description: 'Artículos, bodegas, movimientos y control de stock.',
    steps: [
      {
        id: 'hub',
        label: 'Centro',
        route: '/inventario',
        match: (p) => p === '/inventario',
      },
      {
        id: 'items',
        label: 'Artículos',
        route: '/inventario/articulos',
        match: (p) => starts(p, '/inventario/articulos'),
      },
      {
        id: 'warehouses',
        label: 'Bodegas',
        route: '/inventario/bodegas',
        match: (p) => starts(p, '/inventario/bodegas'),
      },
      {
        id: 'movements',
        label: 'Movimientos',
        route: '/inventario/movimientos',
        match: (p) => starts(p, '/inventario/movimientos'),
      },
      {
        id: 'kardex',
        label: 'Kardex',
        route: '/inventario/kardex',
        match: (p) => starts(p, '/inventario/kardex'),
      },
      {
        id: 'counts',
        label: 'Conteos',
        route: '/inventario/conteos',
        match: (p) => starts(p, '/inventario/conteos'),
      },
    ],
  },

  reports: {
    id: 'reports',
    title: 'Reportes e indicadores',
    description: 'Tableros, reportes y consultas para decidir.',
    steps: [
      {
        id: 'hub',
        label: 'Centro BI',
        route: '/bi',
        match: (p) => p === '/bi',
      },
      {
        id: 'dashboards',
        label: 'Tableros',
        route: '/bi/dashboards',
        match: (p) => starts(p, '/bi/dashboards'),
      },
      {
        id: 'reports',
        label: 'Reportes',
        route: '/bi/reportes',
        match: (p) => starts(p, '/bi/reportes'),
      },
      {
        id: 'query',
        label: 'Consultas',
        route: '/bi/consultas',
        match: (p) => starts(p, '/bi/consultas'),
      },
    ],
  },

  integrations: {
    id: 'integrations',
    title: 'Integraciones',
    description: 'Conectores, flujos de datos y monitoreo de errores.',
    steps: [
      {
        id: 'hub',
        label: 'Centro',
        route: '/integraciones',
        match: (p) => p === '/integraciones',
      },
      {
        id: 'connectors',
        label: 'Conectores',
        route: '/integraciones/conectores',
        match: (p) => starts(p, '/integraciones/conectores'),
      },
      {
        id: 'flows',
        label: 'Flujos',
        route: '/integraciones/flujos',
        match: (p) => starts(p, '/integraciones/flujos'),
      },
      {
        id: 'history',
        label: 'Historial',
        route: '/integraciones/historial',
        match: (p) => starts(p, '/integraciones/historial'),
      },
      {
        id: 'errors',
        label: 'Errores',
        route: '/integraciones/errores',
        match: (p) => starts(p, '/integraciones/errores'),
      },
    ],
  },
};

export function getFlowStepIndex(flow: BusinessFlow, pathname: string): number {
  const idx = flow.steps.findIndex((s) => s.match(pathname));
  return idx >= 0 ? idx : 0;
}

export function getFlowById(id: FlowId): BusinessFlow {
  return BUSINESS_FLOWS[id];
}

/** Resuelve el paso actual con override explícito (p. ej. tras crear un rol) */
export function resolveFlowStepIndex(
  flow: BusinessFlow,
  pathname: string,
  stepId?: string,
): number {
  if (stepId) {
    const idx = flow.steps.findIndex((s) => s.id === stepId);
    if (idx >= 0) return idx;
  }
  return getFlowStepIndex(flow, pathname);
}
