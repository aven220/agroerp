/**
 * PM-32+ — Perímetro de rutas por paquete / módulos de la organización.
 */

import { getCoopPackageNavItems, type IndustryPackageId } from './experienceCenters';
import { modulesToRoutePrefixes, type ProductPackageId } from './productModules';
import { normalizeRoutePath } from './routePermissions';

/** Rutas autenticadas siempre permitidas. */
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
  '/configuracion',
];

function coopAllowedPrefixes(): string[] {
  const fromNav = getCoopPackageNavItems().map((i) => normalizeRoutePath(i.to));
  return [...new Set([...fromNav, ...COOP_EXTRA_PREFIXES])];
}

export type PackageGateId = IndustryPackageId | ProductPackageId;

/**
 * @param packageId coop | full-platform | custom
 * @param enabledModules módulos activos (solo custom; opcional en otros)
 */
export function isPathAllowedForPackage(
  pathname: string,
  packageId: PackageGateId,
  enabledModules: string[] = [],
): boolean {
  if (packageId === 'full-platform') return true;

  const path = normalizeRoutePath(pathname);
  if (ALWAYS_ALLOWED.has(path)) return true;

  if (packageId === 'custom') {
    const prefixes = modulesToRoutePrefixes(enabledModules);
    for (const prefix of prefixes) {
      if (path === prefix || path.startsWith(`${prefix}/`)) return true;
    }
    // Configuración / implementación siempre útiles para admin del paquete
    if (path.startsWith('/implementacion') || path.startsWith('/configuracion')) return true;
    return false;
  }

  // coop-cafe-co (piloto)
  for (const prefix of coopAllowedPrefixes()) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return true;
  }
  return false;
}
