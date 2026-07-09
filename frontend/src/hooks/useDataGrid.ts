import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type {
  ColumnState,
  FilterRule,
  GridColumnDef,
  SavedGridView,
  SortRule,
} from '../lib/data-grid/types';
import { processGridData } from '../lib/data-grid/processData';
import {
  deleteFilterPreset,
  loadGridProductivity,
  recordGridSearch,
  saveFilterPreset,
  saveGridLayout,
  saveServerFilterPreset,
  deleteServerFilterPreset,
  toggleFavoriteSearch,
  togglePinFilterPreset,
  togglePinServerFilterPreset,
  type SavedFilterPreset,
  type ServerFilterPreset,
} from '../lib/gridProductivity';

export type GridDensity = 'compact' | 'default' | 'comfortable';

function storageKey(userId: string | undefined, gridId: string) {
  return `agroerp_grid_${gridId}_${userId ?? 'anon'}`;
}

function defaultColumnState<T>(columns: GridColumnDef<T>[]): ColumnState {
  return {
    order: columns.map((c) => c.key),
    widths: Object.fromEntries(columns.filter((c) => c.width).map((c) => [c.key, c.width!])),
    hidden: columns.filter((c) => c.hidden).map((c) => c.key),
    frozen: columns.filter((c) => c.frozen).map((c) => c.key),
  };
}

function defaultView<T>(columns: GridColumnDef<T>[]): SavedGridView {
  return {
    id: 'default',
    name: 'Vista predeterminada',
    isDefault: true,
    createdAt: new Date().toISOString(),
    columnState: defaultColumnState(columns),
    sorts: [],
    filters: [],
    groupBy: null,
    density: 'default',
    quickSearch: '',
  };
}

function loadViews(userId: string | undefined, gridId: string, columns: GridColumnDef<unknown>[]) {
  try {
    const raw = localStorage.getItem(storageKey(userId, gridId));
    if (raw) {
      const parsed = JSON.parse(raw) as { views: SavedGridView[] };
      if (parsed.views?.length) return parsed.views;
    }
  } catch { /* ignore */ }
  return [defaultView(columns)];
}

interface UseDataGridOptions<T> {
  gridId: string;
  columns: GridColumnDef<T>[];
  data: T[];
  serverSide?: boolean;
  pageSize?: number;
}

export function useDataGrid<T extends { id: string }>({
  gridId,
  columns,
  data,
  serverSide = false,
  pageSize: initialPageSize = 25,
}: UseDataGridOptions<T>) {
  const { user } = useAuth();
  const userId = user?.id;

  const productivityInit = useMemo(() => loadGridProductivity(userId, gridId), [userId, gridId]);

  const [views, setViews] = useState<SavedGridView[]>(() => loadViews(userId, gridId, columns as GridColumnDef<unknown>[]));
  const [filterPresets, setFilterPresets] = useState<SavedFilterPreset[]>(productivityInit.filterPresets);
  const [serverFilterPresets, setServerFilterPresets] = useState<ServerFilterPreset[]>(productivityInit.serverFilterPresets);
  const [recentSearches, setRecentSearches] = useState<string[]>(productivityInit.recentSearches);
  const [favoriteSearches, setFavoriteSearches] = useState<string[]>(productivityInit.favoriteSearches);

  const activeView = useMemo(
    () => views.find((v) => v.isDefault) ?? views[0],
    [views],
  );

  const layoutPrefs = productivityInit.layout;

  const [sorts, setSorts] = useState<SortRule[]>(layoutPrefs?.sorts ?? activeView.sorts);
  const [filters, setFilters] = useState<FilterRule[]>(activeView.filters);
  const [groupBy, setGroupBy] = useState<string | null>(activeView.groupBy);
  const [quickSearch, setQuickSearchState] = useState(activeView.quickSearch);
  const [density, setDensity] = useState<GridDensity>(layoutPrefs?.density ?? activeView.density);
  const [columnState, setColumnState] = useState<ColumnState>(
    layoutPrefs?.columnState ?? activeView.columnState,
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['__all__']));
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(layoutPrefs?.pageSize ?? initialPageSize);
  const [filterHistory, setFilterHistory] = useState<Array<{ filters: FilterRule[]; quickSearch: string }>>([]);

  const layoutSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loadedViews = loadViews(userId, gridId, columns as GridColumnDef<unknown>[]);
    const prod = loadGridProductivity(userId, gridId);
    const active = loadedViews.find((v) => v.isDefault) ?? loadedViews[0];
    setViews(loadedViews);
    setFilterPresets(prod.filterPresets);
    setServerFilterPresets(prod.serverFilterPresets);
    setRecentSearches(prod.recentSearches);
    setFavoriteSearches(prod.favoriteSearches);
    setSorts(prod.layout?.sorts ?? active.sorts);
    setFilters(active.filters);
    setGroupBy(active.groupBy);
    setQuickSearchState(active.quickSearch);
    setDensity(prod.layout?.density ?? active.density);
    setColumnState(prod.layout?.columnState ?? active.columnState);
    setPageSize(prod.layout?.pageSize ?? initialPageSize);
    setPage(0);
    setSelectedIds(new Set());
  }, [userId, gridId, columns, initialPageSize]);

  useEffect(() => {
    localStorage.setItem(storageKey(userId, gridId), JSON.stringify({ views }));
  }, [views, userId, gridId]);

  useEffect(() => {
    if (layoutSaveTimer.current) clearTimeout(layoutSaveTimer.current);
    layoutSaveTimer.current = setTimeout(() => {
      saveGridLayout(userId, gridId, { columnState, density, pageSize, sorts });
    }, 400);
    return () => {
      if (layoutSaveTimer.current) clearTimeout(layoutSaveTimer.current);
    };
  }, [columnState, density, pageSize, sorts, userId, gridId]);

  const visibleColumns = useMemo(() => {
    const map = new Map(columns.map((c) => [c.key, c]));
    return columnState.order
      .filter((k) => !columnState.hidden.includes(k))
      .map((k) => map.get(k))
      .filter(Boolean) as GridColumnDef<T>[];
  }, [columns, columnState]);

  const processed = useMemo(() => {
    if (serverSide) {
      return { rows: data, groups: [], totals: {}, filteredCount: data.length };
    }
    return processGridData(data, columns, { quickSearch, filters, sorts, groupBy });
  }, [data, columns, quickSearch, filters, sorts, groupBy, serverSide]);

  const pagedRows = useMemo(() => {
    if (serverSide) return processed.rows;
    const start = page * pageSize;
    return processed.rows.slice(start, start + pageSize);
  }, [processed.rows, page, pageSize, serverSide]);

  const totalPages = Math.max(1, Math.ceil(processed.filteredCount / pageSize));

  const setQuickSearch = useCallback((q: string) => {
    setQuickSearchState(q);
    setPage(0);
    if (q.trim()) {
      setRecentSearches(recordGridSearch(userId, gridId, q));
    }
  }, [userId, gridId]);

  const toggleSort = useCallback((key: string, multi = false) => {
    setSorts((prev) => {
      const existing = prev.find((s) => s.key === key);
      if (!multi) {
        if (!existing) return [{ key, direction: 'asc' }];
        if (existing.direction === 'asc') return [{ key, direction: 'desc' }];
        return [];
      }
      if (!existing) return [...prev, { key, direction: 'asc' }];
      if (existing.direction === 'asc') {
        return prev.map((s) => (s.key === key ? { ...s, direction: 'desc' as const } : s));
      }
      return prev.filter((s) => s.key !== key);
    });
    setPage(0);
  }, []);

  const addFilter = useCallback((rule: Omit<FilterRule, 'id'>) => {
    setFilters((prev) => {
      const next = [...prev, { ...rule, id: `f-${Date.now()}` }];
      setFilterHistory((h) => [{ filters: prev, quickSearch }, ...h].slice(0, 10));
      return next;
    });
    setPage(0);
  }, [quickSearch]);

  const removeFilter = useCallback((id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
    setPage(0);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters([]);
    setQuickSearchState('');
    setPage(0);
  }, []);

  const applyFilters = useCallback((next: FilterRule[], search: string) => {
    setFilters(next);
    setQuickSearchState(search);
    setPage(0);
  }, []);

  const toggleColumn = useCallback((key: string) => {
    setColumnState((prev) => ({
      ...prev,
      hidden: prev.hidden.includes(key)
        ? prev.hidden.filter((k) => k !== key)
        : [...prev.hidden, key],
    }));
  }, []);

  const reorderColumn = useCallback((fromKey: string, toKey: string) => {
    setColumnState((prev) => {
      const order = [...prev.order];
      const from = order.indexOf(fromKey);
      const to = order.indexOf(toKey);
      if (from < 0 || to < 0) return prev;
      order.splice(from, 1);
      order.splice(to, 0, fromKey);
      return { ...prev, order };
    });
  }, []);

  const resizeColumn = useCallback((key: string, width: number) => {
    setColumnState((prev) => ({
      ...prev,
      widths: { ...prev.widths, [key]: Math.max(60, width) },
    }));
  }, []);

  const toggleFreeze = useCallback((key: string) => {
    setColumnState((prev) => ({
      ...prev,
      frozen: prev.frozen.includes(key)
        ? prev.frozen.filter((k) => k !== key)
        : [...prev.frozen, key],
    }));
  }, []);

  const persistCurrentAsDefault = useCallback(() => {
    setViews((prev) =>
      prev.map((v) =>
        v.isDefault
          ? {
              ...v,
              columnState,
              sorts,
              filters,
              groupBy,
              density,
              quickSearch,
            }
          : v,
      ),
    );
  }, [columnState, sorts, filters, groupBy, density, quickSearch]);

  const saveView = useCallback((name: string, shared = false) => {
    const view: SavedGridView = {
      id: `view-${Date.now()}`,
      name,
      shared,
      createdAt: new Date().toISOString(),
      columnState,
      sorts,
      filters,
      groupBy,
      density,
      quickSearch,
    };
    setViews((prev) => [...prev, view]);
    return view;
  }, [columnState, sorts, filters, groupBy, density, quickSearch]);

  const loadView = useCallback((view: SavedGridView) => {
    setColumnState(view.columnState);
    setSorts(view.sorts);
    setFilters(view.filters);
    setGroupBy(view.groupBy);
    setDensity(view.density);
    setQuickSearchState(view.quickSearch);
    setViews((prev) => prev.map((v) => ({ ...v, isDefault: v.id === view.id })));
    setPage(0);
  }, []);

  const deleteView = useCallback((id: string) => {
    if (id === 'default') return;
    setViews((prev) => {
      const next = prev.filter((v) => v.id !== id);
      if (!next.some((v) => v.isDefault) && next.length) {
        next[0] = { ...next[0], isDefault: true };
      }
      return next.length ? next : [defaultView(columns)];
    });
  }, [columns]);

  const renameView = useCallback((id: string, name: string) => {
    setViews((prev) => prev.map((v) => (v.id === id ? { ...v, name: name.trim() } : v)));
  }, []);

  const resetView = useCallback(() => {
    const d = defaultView(columns);
    loadView(d);
    setViews([d]);
  }, [columns, loadView]);

  const saveCurrentFilters = useCallback((name: string, pinned = false) => {
    const next = saveFilterPreset(userId, gridId, name, filters, quickSearch, pinned);
    setFilterPresets(next);
  }, [userId, gridId, filters, quickSearch]);

  const applyFilterPreset = useCallback((preset: SavedFilterPreset) => {
    applyFilters(preset.filters.map((f) => ({ ...f })), preset.quickSearch);
  }, [applyFilters]);

  const removeFilterPreset = useCallback((id: string) => {
    setFilterPresets(deleteFilterPreset(userId, gridId, id));
  }, [userId, gridId]);

  const pinFilterPreset = useCallback((id: string) => {
    setFilterPresets(togglePinFilterPreset(userId, gridId, id));
  }, [userId, gridId]);

  const saveCurrentServerFilters = useCallback((name: string, state: Record<string, unknown>, pinned = false) => {
    const next = saveServerFilterPreset(userId, gridId, name, state, pinned);
    setServerFilterPresets(next);
  }, [userId, gridId]);

  const removeServerFilterPreset = useCallback((id: string) => {
    setServerFilterPresets(deleteServerFilterPreset(userId, gridId, id));
  }, [userId, gridId]);

  const pinServerFilterPreset = useCallback((id: string) => {
    setServerFilterPresets(togglePinServerFilterPreset(userId, gridId, id));
  }, [userId, gridId]);

  const toggleSearchFavorite = useCallback((query: string) => {
    setFavoriteSearches(toggleFavoriteSearch(userId, gridId, query));
  }, [userId, gridId]);

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllPage = useCallback(() => {
    const ids = pagedRows.map((r) => r.id);
    setSelectedIds((prev) => {
      const all = ids.every((id) => prev.has(id));
      const next = new Set(prev);
      if (all) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }, [pagedRows]);

  const selectedRows = useMemo(
    () => data.filter((r) => selectedIds.has(r.id)),
    [data, selectedIds],
  );

  return {
    visibleColumns,
    pagedRows,
    processed,
    sorts,
    filters,
    groupBy,
    quickSearch,
    density,
    columnState,
    selectedIds,
    selectedRows,
    expandedGroups,
    expandedRows,
    page,
    pageSize,
    totalPages,
    filterHistory,
    filterPresets,
    serverFilterPresets,
    recentSearches,
    favoriteSearches,
    views,
    activeView,
    setQuickSearch,
    setGroupBy: (g: string | null) => { setGroupBy(g); setPage(0); },
    setDensity,
    setPage,
    setPageSize: (s: number) => { setPageSize(s); setPage(0); },
    toggleSort,
    addFilter,
    removeFilter,
    clearFilters,
    applyFilters,
    toggleColumn,
    reorderColumn,
    resizeColumn,
    toggleFreeze,
    saveView,
    loadView,
    deleteView,
    renameView,
    resetView,
    persistCurrentAsDefault,
    saveCurrentFilters,
    applyFilterPreset,
    removeFilterPreset,
    pinFilterPreset,
    saveCurrentServerFilters,
    removeServerFilterPreset,
    pinServerFilterPreset,
    toggleSearchFavorite,
    toggleRow,
    toggleAllPage,
    setSelectedIds,
    setExpandedGroups,
    setExpandedRows,
  };
}
