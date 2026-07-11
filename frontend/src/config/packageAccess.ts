/**
 * PM-32 — Control de acceso por paquete (deep-links / favoritos / URLs directas).
 * Solo bloquea rutas fuera del perímetro del paquete contratado.
 */

import { getCoopPackageNavItems, type IndustryPackageId } from './experienceCenters';
import { normalizeRoutePath } from './routePermissions';

/** Rutas autenticadas siempre permitidas (fuera del menú de paquete). */
const ALWAYS_ALLOWED = new Set([
  '/',
  '/perfil',
  '/notificaciones',
  '/tareas',
  '/operaciones',
  '/rendimiento',
  '/ayuda',
  '/operacion',
  '/gerencia',
  '/implementacion',
]);

/** Prefijos de detalle / explorer necesarios para operar el paquete coop. */
const COOP_EXTRA_PREFIXES = [
  '/record-explorer/Producer',
  '/record-explorer/Farm',
  '/record-explorer/Lot',
  '/productores',
  '/fincas',
  '/lotes',
  '/compras',
  '/inventario',
  '/documentos',
  '/procesos',
  '/bi',
  '/implementacion',
  '/operacion',
  '/gerencia',
  '/ayuda',
  '/notificaciones',
];

function coopAllowedPrefixes(): string[] {
  const fromNav = getCoopPackageNavItems().map((i) => normalizeRoutePath(i.to));
  return [...new Set([...fromNav, ...COOP_EXTRA_PREFIXES])];
}

/**
 * Indica si la ruta está dentro del perímetro del paquete.
 * `full-platform` no relaja el perímetro del piloto cooperativa (PM-32).
 */
export function isPathAllowedForPackage(
  pathname: string,
  packageId: IndustryPackageId,
): boolean {
  void packageId;
  const path = normalizeRoutePath(pathname);
  if (ALWAYS_ALLOWED.has(path)) return true;

  for (const prefix of coopAllowedPrefixes()) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return true;
  }
  return false;
}
