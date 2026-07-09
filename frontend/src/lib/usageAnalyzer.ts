/**
 * PM-07 — Análisis de uso del frontend (solo localStorage / sessionStorage).
 */

export interface RouteVisit {
  path: string;
  visitedAt: string;
}

export interface ModuleUsage {
  prefix: string;
  count: number;
  lastVisitedAt: string;
}

export interface SessionMetrics {
  startedAt: string;
  routeChanges: number;
  moduleSwitches: number;
  lastModule: string | null;
}

export type WorkContext =
  | 'agricultural'
  | 'capture'
  | 'operational'
  | 'administrative'
  | 'reports'
  | 'mixed';

const CONTEXT_PREFIXES: Record<WorkContext, string[]> = {
  agricultural: ['/productores', '/fincas', '/lotes'],
  capture: ['/formularios'],
  operational: ['/compras', '/inventario', '/procesos', '/cafe'],
  administrative: ['/administracion', '/iam', '/integraciones'],
  reports: ['/bi', '/reportes'],
  mixed: [],
};

function lsKey(userId: string | undefined, suffix: string) {
  return `agroerp_aw_${suffix}_${userId ?? 'anon'}`;
}

function ssKey(userId: string | undefined, suffix: string) {
  return `agroerp_aw_sess_${suffix}_${userId ?? 'anon'}`;
}

export function modulePrefix(pathname: string): string | null {
  const seg = pathname.split('/').filter(Boolean)[0];
  if (!seg || seg === 'login') return null;
  return `/${seg}`;
}

export function loadRouteVisits(userId: string | undefined): RouteVisit[] {
  try {
    const raw = localStorage.getItem(lsKey(userId, 'routes'));
    if (!raw) return [];
    return JSON.parse(raw) as RouteVisit[];
  } catch {
    return [];
  }
}

export function recordRouteVisit(userId: string | undefined, pathname: string): RouteVisit[] {
  const prev = loadRouteVisits(userId).filter((v) => v.path !== pathname);
  const next = [{ path: pathname, visitedAt: new Date().toISOString() }, ...prev].slice(0, 80);
  localStorage.setItem(lsKey(userId, 'routes'), JSON.stringify(next));
  return next;
}

export function loadModuleUsage(userId: string | undefined): ModuleUsage[] {
  try {
    const raw = localStorage.getItem(lsKey(userId, 'modules'));
    if (!raw) return [];
    return JSON.parse(raw) as ModuleUsage[];
  } catch {
    return [];
  }
}

export function recordModuleUsage(userId: string | undefined, pathname: string): ModuleUsage[] {
  const prefix = modulePrefix(pathname);
  if (!prefix) return loadModuleUsage(userId);
  const prev = loadModuleUsage(userId);
  const idx = prev.findIndex((m) => m.prefix === prefix);
  let next: ModuleUsage[];
  if (idx >= 0) {
    next = [...prev];
    next[idx] = {
      ...next[idx],
      count: next[idx].count + 1,
      lastVisitedAt: new Date().toISOString(),
    };
  } else {
    next = [{ prefix, count: 1, lastVisitedAt: new Date().toISOString() }, ...prev].slice(0, 32);
  }
  localStorage.setItem(lsKey(userId, 'modules'), JSON.stringify(next));
  return next;
}

export function loadSessionMetrics(userId: string | undefined): SessionMetrics {
  try {
    const raw = sessionStorage.getItem(ssKey(userId, 'metrics'));
    if (raw) return JSON.parse(raw) as SessionMetrics;
  } catch { /* ignore */ }
  return {
    startedAt: new Date().toISOString(),
    routeChanges: 0,
    moduleSwitches: 0,
    lastModule: null,
  };
}

export function touchSession(userId: string | undefined, pathname: string): SessionMetrics {
  const prev = loadSessionMetrics(userId);
  const mod = modulePrefix(pathname);
  const moduleSwitches =
    mod && prev.lastModule && mod !== prev.lastModule
      ? prev.moduleSwitches + 1
      : prev.moduleSwitches;
  const next: SessionMetrics = {
    ...prev,
    routeChanges: prev.routeChanges + 1,
    moduleSwitches,
    lastModule: mod ?? prev.lastModule,
  };
  sessionStorage.setItem(ssKey(userId, 'metrics'), JSON.stringify(next));
  return next;
}

export function sessionDurationMs(metrics: SessionMetrics): number {
  return Date.now() - new Date(metrics.startedAt).getTime();
}

export function detectWorkContext(
  moduleUsage: ModuleUsage[],
  pathname: string,
): WorkContext {
  const scores: Partial<Record<WorkContext, number>> = {};
  for (const mod of moduleUsage) {
    for (const [ctx, prefixes] of Object.entries(CONTEXT_PREFIXES) as [WorkContext, string[]][]) {
      if (ctx === 'mixed') continue;
      if (prefixes.some((p) => mod.prefix === p || mod.prefix.startsWith(p.slice(1)))) {
        scores[ctx] = (scores[ctx] ?? 0) + mod.count;
      }
    }
  }
  for (const [ctx, prefixes] of Object.entries(CONTEXT_PREFIXES) as [WorkContext, string[]][]) {
    if (ctx === 'mixed') continue;
    if (prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      scores[ctx] = (scores[ctx] ?? 0) + 3;
    }
  }
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (!ranked.length || ranked[0][1] < 3) return 'mixed';
  if (ranked.length > 1 && ranked[0][1] - ranked[1][1] < 2) return 'mixed';
  return ranked[0][0] as WorkContext;
}

export function contextLabel(ctx: WorkContext): string {
  const labels: Record<WorkContext, string> = {
    agricultural: 'Operación agrícola',
    capture: 'Captura de campo',
    operational: 'Operaciones y logística',
    administrative: 'Administración',
    reports: 'Análisis y reportes',
    mixed: 'Jornada general',
  };
  return labels[ctx];
}

export function recordQuickActionUse(userId: string | undefined, actionId: string) {
  try {
    const raw = localStorage.getItem(lsKey(userId, 'quick_actions'));
    const prev = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    prev[actionId] = (prev[actionId] ?? 0) + 1;
    localStorage.setItem(lsKey(userId, 'quick_actions'), JSON.stringify(prev));
  } catch { /* ignore */ }
}

export function loadQuickActionUsage(userId: string | undefined): Record<string, number> {
  try {
    const raw = localStorage.getItem(lsKey(userId, 'quick_actions'));
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}
