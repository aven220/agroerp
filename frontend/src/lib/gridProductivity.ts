/**
 * PM-04 — Persistencia de productividad en tablas (solo localStorage).
 */

import type { ColumnState, FilterRule, SortRule } from './data-grid/types';

export type GridDensity = 'compact' | 'default' | 'comfortable';

export interface GridLayoutPrefs {
  columnState: ColumnState;
  density: GridDensity;
  pageSize: number;
  sorts: SortRule[];
  updatedAt: string;
}

export interface SavedFilterPreset {
  id: string;
  name: string;
  filters: FilterRule[];
  quickSearch: string;
  pinned?: boolean;
  createdAt: string;
}

export interface ServerFilterPreset {
  id: string;
  name: string;
  state: Record<string, unknown>;
  pinned?: boolean;
  createdAt: string;
}

export interface GridProductivityStore {
  layout?: GridLayoutPrefs;
  filterPresets: SavedFilterPreset[];
  serverFilterPresets: ServerFilterPreset[];
  recentSearches: string[];
  favoriteSearches: string[];
}

function storageKey(userId: string | undefined, gridId: string) {
  return `agroerp_grid_prod_${gridId}_${userId ?? 'anon'}`;
}

const EMPTY: GridProductivityStore = {
  filterPresets: [],
  serverFilterPresets: [],
  recentSearches: [],
  favoriteSearches: [],
};

export function loadGridProductivity(userId: string | undefined, gridId: string): GridProductivityStore {
  try {
    const raw = localStorage.getItem(storageKey(userId, gridId));
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as GridProductivityStore;
    return {
      layout: parsed.layout,
      filterPresets: parsed.filterPresets ?? [],
      serverFilterPresets: parsed.serverFilterPresets ?? [],
      recentSearches: parsed.recentSearches ?? [],
      favoriteSearches: parsed.favoriteSearches ?? [],
    };
  } catch {
    return { ...EMPTY };
  }
}

function writeStore(userId: string | undefined, gridId: string, store: GridProductivityStore) {
  localStorage.setItem(storageKey(userId, gridId), JSON.stringify(store));
}

export function saveGridLayout(
  userId: string | undefined,
  gridId: string,
  layout: Omit<GridLayoutPrefs, 'updatedAt'>,
): void {
  const store = loadGridProductivity(userId, gridId);
  store.layout = { ...layout, updatedAt: new Date().toISOString() };
  writeStore(userId, gridId, store);
}

export function saveFilterPreset(
  userId: string | undefined,
  gridId: string,
  name: string,
  filters: FilterRule[],
  quickSearch: string,
  pinned = false,
): SavedFilterPreset[] {
  const store = loadGridProductivity(userId, gridId);
  const preset: SavedFilterPreset = {
    id: `fp-${Date.now()}`,
    name: name.trim(),
    filters: filters.map((f) => ({ ...f })),
    quickSearch,
    pinned,
    createdAt: new Date().toISOString(),
  };
  store.filterPresets = [preset, ...store.filterPresets].slice(0, 24);
  writeStore(userId, gridId, store);
  return store.filterPresets;
}

export function deleteFilterPreset(userId: string | undefined, gridId: string, id: string): SavedFilterPreset[] {
  const store = loadGridProductivity(userId, gridId);
  store.filterPresets = store.filterPresets.filter((p) => p.id !== id);
  writeStore(userId, gridId, store);
  return store.filterPresets;
}

export function togglePinFilterPreset(userId: string | undefined, gridId: string, id: string): SavedFilterPreset[] {
  const store = loadGridProductivity(userId, gridId);
  store.filterPresets = store.filterPresets.map((p) =>
    p.id === id ? { ...p, pinned: !p.pinned } : p,
  );
  writeStore(userId, gridId, store);
  return store.filterPresets;
}

export function saveServerFilterPreset(
  userId: string | undefined,
  gridId: string,
  name: string,
  state: Record<string, unknown>,
  pinned = false,
): ServerFilterPreset[] {
  const store = loadGridProductivity(userId, gridId);
  const preset: ServerFilterPreset = {
    id: `sf-${Date.now()}`,
    name: name.trim(),
    state: { ...state },
    pinned,
    createdAt: new Date().toISOString(),
  };
  store.serverFilterPresets = [preset, ...store.serverFilterPresets].slice(0, 24);
  writeStore(userId, gridId, store);
  return store.serverFilterPresets;
}

export function deleteServerFilterPreset(
  userId: string | undefined,
  gridId: string,
  id: string,
): ServerFilterPreset[] {
  const store = loadGridProductivity(userId, gridId);
  store.serverFilterPresets = store.serverFilterPresets.filter((p) => p.id !== id);
  writeStore(userId, gridId, store);
  return store.serverFilterPresets;
}

export function togglePinServerFilterPreset(
  userId: string | undefined,
  gridId: string,
  id: string,
): ServerFilterPreset[] {
  const store = loadGridProductivity(userId, gridId);
  store.serverFilterPresets = store.serverFilterPresets.map((p) =>
    p.id === id ? { ...p, pinned: !p.pinned } : p,
  );
  writeStore(userId, gridId, store);
  return store.serverFilterPresets;
}

export function recordGridSearch(userId: string | undefined, gridId: string, query: string): string[] {
  const q = query.trim();
  if (!q) return loadGridProductivity(userId, gridId).recentSearches;
  const store = loadGridProductivity(userId, gridId);
  store.recentSearches = [q, ...store.recentSearches.filter((s) => s !== q)].slice(0, 12);
  writeStore(userId, gridId, store);
  return store.recentSearches;
}

export function toggleFavoriteSearch(userId: string | undefined, gridId: string, query: string): string[] {
  const q = query.trim();
  if (!q) return loadGridProductivity(userId, gridId).favoriteSearches;
  const store = loadGridProductivity(userId, gridId);
  const exists = store.favoriteSearches.includes(q);
  store.favoriteSearches = exists
    ? store.favoriteSearches.filter((s) => s !== q)
    : [q, ...store.favoriteSearches].slice(0, 16);
  writeStore(userId, gridId, store);
  return store.favoriteSearches;
}
