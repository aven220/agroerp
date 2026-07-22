/**
 * PM-43 — Progresión de navegación (primer uso + criterios EIC).
 * Solo lectura de señales locales / perfil cacheado; sin APIs nuevas.
 */

import { companyRequiredComplete, type CompanyProfile } from '../lib/companyProfile';
import type { NavCategory, NavItem } from './navigation';

const STORAGE_CERT = 'agroerp_golive_certified';
const STORAGE_COMPANY = 'agroerp_company_profile_cache';
const STORAGE_OPS = 'agroerp_ops_activity_v1';

export interface NavProgression {
  /** Menú inicial: Inicio, Operación, Ayuda */
  isFirstExperience: boolean;
  showAnalytics: boolean;
  showConfiguration: boolean;
  showIntegrations: boolean;
  showAdvancedConfig: boolean;
  companyOk: boolean;
  certified: boolean;
  hasOpsActivity: boolean;
}

export function cacheCompanyProfile(profile: CompanyProfile): void {
  try {
    localStorage.setItem(STORAGE_COMPANY, JSON.stringify(profile));
  } catch {
    /* ignore */
  }
}

export function readCachedCompanyProfile(): CompanyProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_COMPANY);
    if (!raw) return null;
    return JSON.parse(raw) as CompanyProfile;
  } catch {
    return null;
  }
}

/** Marca actividad operativa (compras/inventario) para desbloquear analítica. */
export function markOpsActivity(): void {
  try {
    localStorage.setItem(STORAGE_OPS, '1');
  } catch {
    /* ignore */
  }
}

export function resolveNavProgression(opts?: {
  navHistoryLength?: number;
  roles?: string[];
}): NavProgression {
  let certified = false;
  try {
    certified = localStorage.getItem(STORAGE_CERT) === '1';
  } catch {
    certified = false;
  }

  const company = readCachedCompanyProfile();
  const companyOk = companyRequiredComplete(company);

  let hasOpsActivity = false;
  try {
    hasOpsActivity = localStorage.getItem(STORAGE_OPS) === '1';
  } catch {
    hasOpsActivity = false;
  }

  const historyLen = opts?.navHistoryLength ?? 0;
  const roles = (opts?.roles ?? []).map((r) => r.toLowerCase());
  const isImplementer = roles.some(
    (r) => r.includes('implement') || r.includes('consultant') || r.includes('consultor') || r.includes('admin'),
  );

  const isFirstExperience = !companyOk && !certified && historyLen < 3 && !isImplementer;

  // Analítica (Reportes / BI / indicadores): tras operación real o Go Live
  const showAnalytics = certified || (companyOk && hasOpsActivity) || (hasOpsActivity && historyLen >= 8);

  // Configuración básica: tras ficha de empresa o rol de implementación
  const showConfiguration = !isFirstExperience && (companyOk || certified || isImplementer || historyLen >= 5);

  // Integraciones y config avanzada: criterios EIC estrictos
  const showIntegrations = certified || (companyOk && hasOpsActivity);
  const showAdvancedConfig = certified || (companyOk && (isImplementer || historyLen >= 10));

  return {
    isFirstExperience,
    showAnalytics,
    showConfiguration,
    showIntegrations,
    showAdvancedConfig,
    companyOk,
    certified,
    hasOpsActivity,
  };
}

const ADVANCED_CONFIG_IDS = new Set([
  'nav-cfg-integ',
  'nav-cfg-workflow',
]);

const REPORTS_ITEM_IDS = new Set([
  'nav-rep-ops',
  'nav-rep-mgr',
  'nav-rep-audit',
  'nav-rep-bi',
]);

/**
 * Filtra el árbol PM-46 según progresión (sin quitar permisos).
 */
export function filterNavByProgression(
  categories: NavCategory[],
  progression: NavProgression,
): NavCategory[] {
  return categories
    .map((cat) => {
      if ((cat.id === 'reports' || cat.id === 'analytics') && !progression.showAnalytics) return null;
      if (cat.id === 'configuration' && !progression.showConfiguration) return null;
      if (cat.id === 'company' && progression.isFirstExperience) return null;

      if (cat.id === 'configuration') {
        const items = cat.items.filter((item) => {
          if (item.id === 'nav-cfg-integ' && !progression.showIntegrations) return false;
          if (ADVANCED_CONFIG_IDS.has(item.id) && !progression.showAdvancedConfig) return false;
          return true;
        });
        if (items.length === 0) return null;
        return { ...cat, items };
      }

      if (cat.id === 'reports' || cat.id === 'analytics') {
        const items = cat.items.filter((item) => {
          if (item.id === 'nav-rep-bi') {
            return progression.certified || progression.hasOpsActivity;
          }
          return REPORTS_ITEM_IDS.has(item.id) ? progression.showAnalytics : true;
        });
        if (items.length === 0) return null;
        return { ...cat, items };
      }

      return cat;
    })
    .filter(Boolean) as NavCategory[];
}

/** Ítems permitidos en Command Palette (nunca módulos internos). */
export function isPaletteAllowedPath(to: string): boolean {
  const path = to.split('?')[0];
  if (path === '/iam/auditoria' || path.startsWith('/iam/auditoria/')) return true;
  const blocked = [
    '/iam',
    '/bpms',
    '/plataforma',
    '/finanzas',
    '/rrhh',
    '/manufactura',
    '/comercial',
    '/cadena-suministro',
    '/gestion-activos',
    '/formularios/disenar',
    '/ia/',
    '/plugins',
    '/apis',
    '/bre',
    '/iot',
    '/operaciones',
    '/inicio-workspace',
  ];
  return !blocked.some((b) => path === b || path.startsWith(`${b}/`) || path.startsWith(b));
}

export function filterNavItemsForPalette(items: NavItem[]): NavItem[] {
  return items.filter((i) => isPaletteAllowedPath(i.to));
}
