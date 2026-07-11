/**
 * PM-30 — Catálogo de consistencia de producto y validación de recorridos.
 * Solo metadatos frontend; no crea APIs ni lógica de negocio.
 */

export interface ProductEntitySpec {
  id: string;
  label: string;
  icon: string;
  primaryColorToken: string;
  listPath: string;
  createPath?: string;
}

/** Misma entidad = mismo nombre, ícono y rutas canónicas en la experiencia coop. */
export const PRODUCT_ENTITIES: ProductEntitySpec[] = [
  {
    id: 'producer',
    label: 'Productor',
    icon: '👤',
    primaryColorToken: 'coffee',
    listPath: '/productores',
    createPath: '/productores/nuevo',
  },
  {
    id: 'farm',
    label: 'Finca',
    icon: '🌿',
    primaryColorToken: 'green',
    listPath: '/fincas',
    createPath: '/fincas/nueva',
  },
  {
    id: 'lot',
    label: 'Lote',
    icon: '📍',
    primaryColorToken: 'teal',
    listPath: '/lotes',
    createPath: '/lotes/nuevo',
  },
  {
    id: 'purchase',
    label: 'Compra',
    icon: '☕',
    primaryColorToken: 'coffee',
    listPath: '/compras',
    createPath: '/compras/recepcion',
  },
  {
    id: 'settlement',
    label: 'Liquidación',
    icon: '💵',
    primaryColorToken: 'teal',
    listPath: '/compras/liquidaciones',
  },
  {
    id: 'inventory',
    label: 'Inventario',
    icon: '📦',
    primaryColorToken: 'green',
    listPath: '/inventario',
  },
  {
    id: 'document',
    label: 'Documento',
    icon: '📄',
    primaryColorToken: 'default',
    listPath: '/documentos',
  },
  {
    id: 'user',
    label: 'Usuario',
    icon: '👥',
    primaryColorToken: 'default',
    listPath: '/administracion/usuarios',
  },
];

export interface JourneyStep {
  label: string;
  path: string;
}

export const CONSULTANT_JOURNEY: JourneyStep[] = [
  { label: 'Empresa nueva → Implementación', path: '/implementacion' },
  { label: 'Empresa', path: '/implementacion/empresa' },
  { label: 'Usuarios', path: '/implementacion/usuarios' },
  { label: 'Configuración', path: '/implementacion/configuracion' },
  { label: 'Go Live', path: '/implementacion/go-live' },
  { label: 'Centro de Operación', path: '/operacion' },
  { label: 'Centro de Gerencia', path: '/gerencia' },
];

export const OPERATIONAL_JOURNEY: JourneyStep[] = [
  { label: 'Recepción', path: '/compras/recepcion' },
  { label: 'Pesaje', path: '/compras/pesaje' },
  { label: 'Calidad', path: '/compras/calidad' },
  { label: 'Liquidación', path: '/compras/liquidaciones' },
  { label: 'Inventario (compras)', path: '/compras/inventario' },
  { label: 'Mi día', path: '/operacion' },
  { label: 'Gerencia', path: '/gerencia' },
  { label: 'Reportes', path: '/bi/reportes' },
  { label: 'Expediente (productores)', path: '/productores' },
];

/** Rutas que deben existir en el router para no dejar caminos muertos. */
export const CRITICAL_PRODUCT_ROUTES: string[] = [
  ...new Set([
    ...CONSULTANT_JOURNEY.map((s) => s.path),
    ...OPERATIONAL_JOURNEY.map((s) => s.path),
    '/ayuda',
    '/notificaciones',
    '/bi',
    '/documentos',
    '/procesos/bandeja',
    '/compras/config',
    '/implementacion/estado',
  ]),
];

export function entityLabel(id: string): string {
  return PRODUCT_ENTITIES.find((e) => e.id === id)?.label ?? id;
}

export function entityIcon(id: string): string {
  return PRODUCT_ENTITIES.find((e) => e.id === id)?.icon ?? '•';
}
