import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type {
  ColumnState,
  FilterRule,
  GridColumnDef,
  SavedGridView,
  SortRule,
} from '../lib/data-grid/types';
import { processGridData } from '../lib/data-grid/processData';

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

  const [views, setViews] = useState<SavedGridView[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey(userId, gridId));
      if (raw) {
        const parsed = JSON.parse(raw) as { views: SavedGridView[] };
        if (parsed.views?.length) return parsed.views;
      }
    } catch { /* ignore */ }
    return [defaultView(columns)];
  });

  const activeView = useMemo(
    () => views.find((v) => v.isDefault) ?? views[0],
    [views],
  );

  const [sorts, setSorts] = useState<SortRule[]>(activeView.sorts);
  const [filters, setFilters] = useState<FilterRule[]>(activeView.filters);
  const [groupBy, setGroupBy] = useState<string | null>(activeView.groupBy);
  const [quickSearch, setQuickSearch] = useState(activeView.quickSearch);
  const [density, setDensity] = useState<GridDensity>(activeView.density);
  const [columnState, setColumnState] = useState<ColumnState>(activeView.columnState);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['__all__']));
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filterHistory, setFilterHistory] = useState<FilterRule[][]>([]);

  useEffect(() => {
    localStorage.setItem(storageKey(userId, gridId), JSON.stringify({ views }));
  }, [views, userId, gridId]);

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
      setFilterHistory((h) => [prev, ...h].slice(0, 10));
      return next;
    });
    setPage(0);
  }, []);

  const removeFilter = useCallback((id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
    setPage(0);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters([]);
    setQuickSearch('');
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
    setQuickSearch(view.quickSearch);
    setViews((prev) => prev.map((v) => ({ ...v, isDefault: v.id === view.id })));
    setPage(0);
  }, []);

  const resetView = useCallback(() => {
    const d = defaultView(columns);
    loadView(d);
    setViews([d]);
  }, [columns, loadView]);

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
    views,
    activeView,
    setQuickSearch: (q: string) => { setQuickSearch(q); setPage(0); },
    setGroupBy: (g: string | null) => { setGroupBy(g); setPage(0); },
    setDensity,
    setPage,
    setPageSize: (s: number) => { setPageSize(s); setPage(0); },
    toggleSort,
    addFilter,
    removeFilter,
    clearFilters,
    toggleColumn,
    reorderColumn,
    resizeColumn,
    toggleFreeze,
    saveView,
    loadView,
    resetView,
    toggleRow,
    toggleAllPage,
    setSelectedIds,
    setExpandedGroups,
    setExpandedRows,
  };
}
