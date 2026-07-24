/**
 * Catálogo de módulos licenciables por organización.
 * Solo presentación / perímetro de rutas — sin cambiar permisos IAM.
 */

export type ProductPackageId = 'coop-cafe-co' | 'full-platform' | 'custom';

export interface ProductModuleDef {
  id: string;
  label: string;
  description: string;
  /** Prefijos de ruta que habilita el módulo */
  routePrefixes: string[];
  /** Incluido por defecto en el piloto cooperativa */
  inCoopPilot?: boolean;
}

export const PRODUCT_MODULES: ProductModuleDef[] = [
  {
    id: 'compras',
    label: 'Compras / Café',
    description: 'Recepción, pesaje, calidad y liquidación',
    routePrefixes: ['/compras'],
    inCoopPilot: true,
  },
  {
    id: 'inventario',
    label: 'Inventario',
    description: 'Existencias, bodegas y movimientos',
    routePrefixes: ['/inventario'],
    inCoopPilot: true,
  },
  {
    id: 'maestros',
    label: 'Maestros agrícolas',
    description: 'Productores, fincas y lotes',
    routePrefixes: ['/productores', '/fincas', '/lotes', '/record-explorer'],
    inCoopPilot: true,
  },
  {
    id: 'documentos',
    label: 'Documentos',
    description: 'Archivos y evidencias',
    routePrefixes: ['/documentos'],
    inCoopPilot: true,
  },
  {
    id: 'procesos',
    label: 'Procesos / Workflow',
    description: 'Bandeja y definiciones de flujo',
    routePrefixes: ['/procesos'],
    inCoopPilot: true,
  },
  {
    id: 'reportes',
    label: 'Reportes y BI',
    description: 'Indicadores, gerencia y analítica',
    routePrefixes: ['/bi', '/gerencia', '/iam/auditoria'],
    inCoopPilot: true,
  },
  {
    id: 'implementacion',
    label: 'Implementación',
    description: 'Puesta en marcha y configuración base',
    routePrefixes: ['/implementacion', '/configuracion'],
    inCoopPilot: true,
  },
  {
    id: 'formularios',
    label: 'Formularios (UDFE)',
    description: 'Diseño, campañas y recolección de campo',
    routePrefixes: ['/formularios'],
    inCoopPilot: true,
  },
  {
    id: 'iam',
    label: 'Seguridad IAM',
    description: 'Usuarios, roles, políticas y auditoría',
    routePrefixes: ['/iam', '/administracion'],
  },
  {
    id: 'plataforma',
    label: 'Plataforma avanzada',
    description: 'Verticales enterprise, integraciones y plugins',
    routePrefixes: [
      '/plataforma-empresarial',
      '/plugins',
      '/eops',
      '/eppm',
      '/ai',
      '/gis',
      '/eatp',
    ],
  },
];

export const PACKAGE_OPTIONS: {
  id: ProductPackageId;
  label: string;
  description: string;
}[] = [
  {
    id: 'coop-cafe-co',
    label: 'Cooperativa cafetera (piloto)',
    description: 'Módulos del paquete certificado para cooperativas',
  },
  {
    id: 'full-platform',
    label: 'Plataforma completa (pro)',
    description: 'Todos los módulos disponibles en AgroERP',
  },
  {
    id: 'custom',
    label: 'Personalizado',
    description: 'Elija manualmente los módulos contratados',
  },
];

export function defaultModulesForPackage(packageId: ProductPackageId): string[] {
  if (packageId === 'full-platform') return PRODUCT_MODULES.map((m) => m.id);
  if (packageId === 'coop-cafe-co') {
    return PRODUCT_MODULES.filter((m) => m.inCoopPilot).map((m) => m.id);
  }
  return [];
}

export function modulesToRoutePrefixes(moduleIds: string[]): string[] {
  const set = new Set<string>();
  for (const id of moduleIds) {
    const mod = PRODUCT_MODULES.find((m) => m.id === id);
    if (!mod) continue;
    for (const p of mod.routePrefixes) set.add(p);
  }
  return [...set];
}
