/**
 * PM-05 — Registro de comandos enterprise (datos frontend + navegación existente).
 */

import { ALL_NAV_ITEMS } from '../config/navigation';
import { canAccessPath } from '../config/routePermissions';
import { loadGridProductivity } from './gridProductivity';
import { loadWorkEntityHistory, kindIcon, type WorkEntityVisit } from './workEntityHistory';
import type { GuidedOpenProcess, GuidedPersonalShortcut, GuidedPinnedRecord } from './guidedWorkspace';

export type CommandCategory =
  | 'navigation'
  | 'action'
  | 'entity'
  | 'workspace'
  | 'productivity'
  | 'favorite';

export interface CommandItem {
  id: string;
  label: string;
  subtitle?: string;
  icon: string;
  category: CommandCategory;
  categoryLabel: string;
  keywords: string[];
  shortcut?: string;
  permission?: string;
  to?: string;
  run: () => void;
}

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  navigation: 'Navegación',
  action: 'Acciones',
  entity: 'Entidades',
  workspace: 'Mi jornada',
  productivity: 'Productividad',
  favorite: 'Favoritos',
};

const GRID_ROUTES: Record<string, string> = {
  producers: '/productores',
  farms: '/fincas',
  lots: '/lotes',
  inventory: '/inventario',
  purchases: '/compras',
};

const ACTION_COMMANDS: Array<{
  id: string;
  label: string;
  icon: string;
  to: string;
  permission?: string;
  keywords?: string[];
}> = [
  { id: 'action-create-producer', label: 'Crear productor', icon: '➕', to: '/productores/nuevo', permission: 'producer:create', keywords: ['nuevo', 'registrar'] },
  { id: 'action-create-farm', label: 'Crear finca', icon: '➕', to: '/fincas/nueva', permission: 'farm:create', keywords: ['nuevo', 'registrar'] },
  { id: 'action-create-lot', label: 'Crear lote', icon: '➕', to: '/lotes/nuevo', permission: 'lot:create', keywords: ['nuevo', 'parcela'] },
  { id: 'action-create-form', label: 'Diseñar formulario', icon: '📝', to: '/formularios/disenar', permission: 'form:create', keywords: ['nuevo', 'form studio'] },
  { id: 'action-new-purchase', label: 'Registrar compra', icon: '☕', to: '/compras', permission: 'coffee:receive', keywords: ['café', 'compras'] },
  { id: 'action-workflow-inbox', label: 'Bandeja de tareas', icon: '📥', to: '/procesos/bandeja', permission: 'workflow:read', keywords: ['workflow', 'aprobaciones'] },
  { id: 'action-home', label: 'Ir al inicio', icon: '🏠', to: '/', keywords: ['dashboard', 'inicio'] },
  { id: 'action-notifications', label: 'Notificaciones', icon: '🔔', to: '/notificaciones' },
  { id: 'action-admin', label: 'Administración', icon: '⚙', to: '/administracion', permission: 'organization:read' },
];

function scoreCommand(cmd: CommandItem, q: string): number {
  if (!q) return 1;
  const hay = [cmd.label, cmd.subtitle ?? '', ...cmd.keywords].join(' ').toLowerCase();
  if (cmd.label.toLowerCase() === q) return 100;
  if (cmd.label.toLowerCase().startsWith(q)) return 80;
  if (hay.includes(q)) return 50;
  const tokens = q.split(/\s+/).filter(Boolean);
  const matched = tokens.filter((t) => hay.includes(t)).length;
  return matched > 0 ? matched * 10 : 0;
}

export interface BuildCommandsOptions {
  hasPermission: (p: string) => boolean;
  navigate: (to: string) => void;
  favorites: Array<{ id: string; label: string; icon: string; to: string }>;
  navHistory: Array<{ label: string; icon: string; to: string }>;
  pinned: GuidedPinnedRecord[];
  personalShortcuts: GuidedPersonalShortcut[];
  openProcesses: GuidedOpenProcess[];
  toggleWorkspace: () => void;
  userId?: string;
  favoriteCommandIds: string[];
}

export function buildCommandRegistry(opts: BuildCommandsOptions): CommandItem[] {
  const {
    hasPermission,
    navigate,
    favorites,
    navHistory,
    pinned,
    personalShortcuts,
    openProcesses,
    toggleWorkspace,
    userId,
    favoriteCommandIds,
  } = opts;

  const commands: CommandItem[] = [];

  const add = (cmd: Omit<CommandItem, 'categoryLabel' | 'keywords'> & { keywords?: string[] }) => {
    if (cmd.permission && !hasPermission(cmd.permission)) return;
    if (cmd.to && !canAccessPath(cmd.to, hasPermission)) return;
    commands.push({
      ...cmd,
      keywords: cmd.keywords ?? [],
      categoryLabel: CATEGORY_LABELS[cmd.category],
    });
  };

  for (const item of ALL_NAV_ITEMS) {
    if (item.permission && !hasPermission(item.permission)) continue;
    add({
      id: `nav-${item.id}`,
      label: item.label,
      subtitle: item.to,
      icon: item.icon,
      category: 'navigation',
      keywords: [item.to, ...(item.keywords ?? [])],
      to: item.to,
      run: () => navigate(item.to),
    });
  }

  for (const action of ACTION_COMMANDS) {
    add({
      id: action.id,
      label: action.label,
      icon: action.icon,
      category: 'action',
      keywords: action.keywords ?? [],
      permission: action.permission,
      to: action.to,
      run: () => navigate(action.to),
    });
  }

  add({
    id: 'workspace-open',
    label: 'Abrir Mi jornada',
    subtitle: 'Espacio de trabajo personal',
    icon: '📋',
    category: 'workspace',
    keywords: ['workspace', 'guided', 'fijados', 'pendientes'],
    shortcut: '—',
    run: toggleWorkspace,
  });

  for (const p of pinned) {
    add({
      id: `pinned-${p.kind}-${p.id}`,
      label: p.label,
      subtitle: 'Registro fijado',
      icon: '📌',
      category: 'workspace',
      keywords: [p.kind, p.to],
      to: p.to,
      run: () => navigate(p.to),
    });
  }

  for (const s of personalShortcuts) {
    add({
      id: `shortcut-${s.id}`,
      label: s.label,
      subtitle: 'Acceso rápido personal',
      icon: s.icon,
      category: 'workspace',
      keywords: [s.to],
      to: s.to,
      run: () => navigate(s.to),
    });
  }

  for (const proc of openProcesses) {
    add({
      id: `process-open-${proc.id}`,
      label: proc.label,
      subtitle: 'Proceso abierto',
      icon: '⚙',
      category: 'workspace',
      keywords: ['workflow', 'proceso'],
      to: proc.to,
      run: () => navigate(proc.to),
    });
  }

  const visits = loadWorkEntityHistory(userId);
  for (const visit of visits) {
    add({
      id: `entity-${visit.kind}-${visit.id}`,
      label: visit.label,
      subtitle: `Reciente · ${entityKindLabel(visit)}`,
      icon: kindIcon(visit.kind),
      category: 'entity',
      keywords: [visit.kind, visit.to],
      to: visit.to,
      run: () => navigate(visit.to),
    });
  }

  for (const fav of favorites) {
    add({
      id: `fav-nav-${fav.id}`,
      label: fav.label,
      subtitle: 'Favorito de menú',
      icon: fav.icon,
      category: 'favorite',
      keywords: [fav.to, 'favorito'],
      to: fav.to,
      run: () => navigate(fav.to),
    });
  }

  for (const h of navHistory.slice(0, 8)) {
    add({
      id: `nav-hist-${h.to}`,
      label: h.label,
      subtitle: 'Navegación reciente',
      icon: h.icon,
      category: 'navigation',
      keywords: [h.to, 'reciente'],
      to: h.to,
      run: () => navigate(h.to),
    });
  }

  for (const [gridId, route] of Object.entries(GRID_ROUTES)) {
    const prod = loadGridProductivity(userId, gridId);
    for (const preset of [...prod.serverFilterPresets.filter((p) => p.pinned), ...prod.filterPresets.filter((p) => p.pinned)]) {
      const isServer = 'state' in preset;
      add({
        id: `prod-${gridId}-${preset.id}`,
        label: preset.name,
        subtitle: isServer ? `Consulta fijada · ${gridId}` : `Filtro fijado · ${gridId}`,
        icon: '🔖',
        category: 'productivity',
        keywords: [gridId, 'consulta', 'filtro', 'vista'],
        to: route,
        run: () => {
          if (isServer) {
            sessionStorage.setItem(`agroerp_cmd_filter_${gridId}`, JSON.stringify((preset as { state: Record<string, unknown> }).state));
          }
          navigate(route);
        },
      });
    }
  }

  for (const favId of favoriteCommandIds) {
    const existing = commands.find((c) => c.id === favId);
    if (existing && existing.category !== 'favorite') {
      add({
        ...existing,
        id: `fav-cmd-${favId}`,
        category: 'favorite',
        subtitle: 'Comando favorito',
        run: existing.run,
      });
    }
  }

  const seen = new Set<string>();
  return commands.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

function entityKindLabel(visit: WorkEntityVisit): string {
  const labels: Record<string, string> = {
    producer: 'Productor',
    farm: 'Finca',
    lot: 'Lote',
    form: 'Formulario',
    process: 'Proceso',
    purchase: 'Compra',
    inventory: 'Inventario',
    report: 'Reporte',
  };
  return labels[visit.kind] ?? visit.kind;
}

export function filterCommands(
  commands: CommandItem[],
  query: string,
  mode: 'launcher' | 'commands',
  recentIds: string[],
): CommandItem[] {
  const q = query.trim().toLowerCase();

  let pool = commands;
  if (mode === 'commands') {
    pool = commands.filter((c) =>
      ['action', 'workspace', 'productivity', 'favorite'].includes(c.category),
    );
  }

  if (!q) {
    const recentSet = new Set(recentIds);
    const recent = recentIds
      .map((id) => pool.find((c) => c.id === id))
      .filter(Boolean) as CommandItem[];
    const rest = pool.filter((c) => !recentSet.has(c.id));
    return [...recent, ...rest].slice(0, 40);
  }

  return pool
    .map((cmd) => ({ cmd, score: scoreCommand(cmd, q) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 32)
    .map((r) => r.cmd);
}

export function groupCommands(commands: CommandItem[]): Map<string, CommandItem[]> {
  const map = new Map<string, CommandItem[]>();
  for (const cmd of commands) {
    const list = map.get(cmd.categoryLabel) ?? [];
    list.push(cmd);
    map.set(cmd.categoryLabel, list);
  }
  return map;
}
