export type WorkEntityKind =
  | 'producer'
  | 'farm'
  | 'lot'
  | 'form'
  | 'process'
  | 'purchase'
  | 'inventory'
  | 'report';

export interface WorkEntityVisit {
  kind: WorkEntityKind;
  id: string;
  label: string;
  to: string;
  visitedAt: string;
}

const KIND_META: Record<WorkEntityKind, { icon: string; fallback: string }> = {
  producer: { icon: '👤', fallback: 'Productor' },
  farm: { icon: '🌿', fallback: 'Finca' },
  lot: { icon: '📍', fallback: 'Lote' },
  form: { icon: '📝', fallback: 'Formulario' },
  process: { icon: '⚙', fallback: 'Proceso' },
  purchase: { icon: '☕', fallback: 'Compra' },
  inventory: { icon: '📦', fallback: 'Inventario' },
  report: { icon: '📊', fallback: 'Reportes' },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function storageKey(userId: string | undefined) {
  return `agroerp_work_history_${userId ?? 'anon'}`;
}

export function loadWorkEntityHistory(userId: string | undefined): WorkEntityVisit[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WorkEntityVisit[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveWorkEntityHistory(userId: string | undefined, visits: WorkEntityVisit[]) {
  localStorage.setItem(storageKey(userId), JSON.stringify(visits.slice(0, 24)));
}

export function recordWorkEntityVisit(
  userId: string | undefined,
  visit: Omit<WorkEntityVisit, 'visitedAt'> & { visitedAt?: string },
) {
  const entry: WorkEntityVisit = { ...visit, visitedAt: visit.visitedAt ?? new Date().toISOString() };
  const prev = loadWorkEntityHistory(userId);
  const next = [entry, ...prev.filter((v) => !(v.kind === entry.kind && v.id === entry.id))].slice(0, 24);
  saveWorkEntityHistory(userId, next);
}

export function getContinueWorkItems(userId: string | undefined, limit = 6): WorkEntityVisit[] {
  const visits = loadWorkEntityHistory(userId);
  const seen = new Set<WorkEntityKind>();
  const result: WorkEntityVisit[] = [];
  for (const visit of visits) {
    if (seen.has(visit.kind)) continue;
    seen.add(visit.kind);
    result.push(visit);
    if (result.length >= limit) break;
  }
  return result;
}

export function kindIcon(kind: WorkEntityKind): string {
  return KIND_META[kind].icon;
}

export function kindFallbackLabel(kind: WorkEntityKind): string {
  return KIND_META[kind].fallback;
}

export function updateWorkEntityLabel(
  userId: string | undefined,
  kind: WorkEntityKind,
  id: string,
  label: string,
) {
  const visits = loadWorkEntityHistory(userId);
  const idx = visits.findIndex((v) => v.kind === kind && v.id === id);
  if (idx < 0) return;
  visits[idx] = { ...visits[idx], label };
  saveWorkEntityHistory(userId, visits);
}

/** Detecta visitas a entidades desde la ruta actual */
export function parseEntityFromPath(pathname: string): Omit<WorkEntityVisit, 'visitedAt'> | null {
  const segments = pathname.split('/').filter(Boolean);
  if (!segments.length) return null;

  const isUuid = (s: string) => UUID_RE.test(s);
  const skip = new Set(['nuevo', 'nueva', 'editar', 'disenar', 'ejecutar', 'dashboard', 'mapa', 'plantillas']);

  if (segments[0] === 'productores' && segments[1] && isUuid(segments[1])) {
    return { kind: 'producer', id: segments[1], label: 'Productor', to: pathname };
  }
  if (segments[0] === 'fincas' && segments[1] && isUuid(segments[1])) {
    return { kind: 'farm', id: segments[1], label: 'Finca', to: pathname };
  }
  if (segments[0] === 'lotes' && segments[1] && isUuid(segments[1])) {
    return { kind: 'lot', id: segments[1], label: 'Lote', to: pathname };
  }
  if (segments[0] === 'formularios' && segments[1] && isUuid(segments[1]) && !skip.has(segments[2] ?? '')) {
    return { kind: 'form', id: segments[1], label: 'Formulario', to: pathname };
  }
  if (segments[0] === 'procesos' && segments[1] === 'instancias' && segments[2] && isUuid(segments[2])) {
    return { kind: 'process', id: segments[2], label: 'Solicitud', to: pathname };
  }
  if (segments[0] === 'procesos' && segments[1] === 'bandeja') {
    return { kind: 'process', id: 'inbox', label: 'Bandeja de tareas', to: pathname };
  }
  if (segments[0] === 'inventario') {
    return { kind: 'inventory', id: segments[1] ?? 'hub', label: 'Inventario', to: pathname };
  }
  if (segments[0] === 'bi') {
    return { kind: 'report', id: segments[1] ?? 'hub', label: 'Reportes', to: pathname };
  }
  if (segments[0] === 'compras' && segments[1] === 'wizard') {
    return { kind: 'purchase', id: 'wizard', label: 'Compra en curso', to: pathname };
  }
  if (segments[0] === 'record-explorer' && segments[1] && segments[2]) {
    const typeMap: Record<string, WorkEntityKind> = {
      producer: 'producer',
      farm: 'farm',
      lot: 'lot',
    };
    const kind = typeMap[segments[1]];
    if (kind) {
      return { kind, id: segments[2], label: kindFallbackLabel(kind), to: pathname };
    }
  }
  return null;
}
