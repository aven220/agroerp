import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { EmptyState } from '../ui/EmptyState';
import { LoadingState } from '../ux/LoadingState';
import { useDataGrid } from '../../hooks/useDataGrid';
import type {
  BulkAction,
  GridColumnDef,
  RowAction,
} from '../../lib/data-grid/types';
import { FilterPanel } from './FilterPanel';
import { ColumnManager } from './ColumnManager';
import { SavedViewsMenu } from './SavedViewsMenu';
import { DetailPanel } from './DetailPanel';
import { FilterChipsBar } from './FilterChipsBar';
import { TableToolbar } from '../page/TableToolbar';
import { RecentFiltersMenu } from './RecentFiltersMenu';
import { ServerFilterPresetsMenu } from './ServerFilterPresetsMenu';
import { BulkActionsToolbar } from './BulkActionsToolbar';
import { getCellValue } from '../../lib/data-grid/types';

const ROW_HEIGHT = 44;
const VIRTUAL_THRESHOLD = 80;

export interface EnterpriseDataGridProps<T extends { id: string }> {
  gridId: string;
  columns: GridColumnDef<T>[];
  data: T[];
  loading?: boolean;
  serverSide?: boolean;
  totalCount?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onQuickSearchChange?: (query: string) => void;
  selectable?: boolean;
  onRowClick?: (row: T) => void;
  onRowDoubleClick?: (row: T) => void;
  rowActions?: RowAction<T>[];
  bulkActions?: BulkAction<T>[];
  onExport?: () => void;
  emptyMessage?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick?: () => void; to?: string };
  emptyIllustration?: 'inbox' | 'search' | 'data' | 'folder' | 'error';
  density?: 'compact' | 'default' | 'comfortable';
  enableVirtualization?: boolean;
  detailRender?: (row: T) => ReactNode;
  toolbarExtra?: ReactNode;
  serverFilterState?: Record<string, unknown>;
  onServerFilterStateApply?: (state: Record<string, unknown>) => void;
}

export function EnterpriseDataGrid<T extends { id: string }>({
  gridId,
  columns: columnDefs,
  data,
  loading,
  serverSide,
  totalCount,
  page: externalPage,
  pageSize: externalPageSize,
  onPageChange,
  onPageSizeChange,
  onQuickSearchChange,
  selectable = true,
  onRowClick,
  onRowDoubleClick,
  rowActions,
  bulkActions,
  onExport,
  emptyMessage = 'Sin registros',
  emptyDescription,
  emptyAction,
  emptyIllustration = 'data',
  density: initialDensity,
  enableVirtualization = true,
  detailRender,
  toolbarExtra,
  serverFilterState,
  onServerFilterStateApply,
}: EnterpriseDataGridProps<T>) {
  const grid = useDataGrid({
    gridId,
    columns: columnDefs,
    data,
    serverSide,
    pageSize: externalPageSize ?? 25,
  });

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<T | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; row: T } | null>(null);
  const [resizeCol, setResizeCol] = useState<{ key: string; startX: number; startW: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const onQuickSearchChangeRef = useRef(onQuickSearchChange);
  onQuickSearchChangeRef.current = onQuickSearchChange;
  const lastQuickSearchEmittedRef = useRef<string | null>(null);

  useEffect(() => {
    if (initialDensity) grid.setDensity(initialDensity);
  }, [initialDensity, grid.setDensity]);

  useEffect(() => {
    if (!onQuickSearchChangeRef.current) return;
    const t = setTimeout(() => {
      const query = grid.quickSearch;
      if (lastQuickSearchEmittedRef.current === query) return;
      lastQuickSearchEmittedRef.current = query;
      onQuickSearchChangeRef.current?.(query);
    }, 300);
    return () => clearTimeout(t);
  }, [grid.quickSearch]);

  useEffect(() => {
    if (externalPage !== undefined) grid.setPage(externalPage - 1);
  }, [externalPage, grid.setPage]);

  useEffect(() => {
    if (!resizeCol) return;
    const onMove = (e: MouseEvent) => {
      grid.resizeColumn(resizeCol.key, resizeCol.startW + (e.clientX - resizeCol.startX));
    };
    const onUp = () => setResizeCol(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [resizeCol, grid.resizeColumn]);

  const useVirtual = enableVirtualization && grid.pagedRows.length > VIRTUAL_THRESHOLD;
  const visibleCount = Math.ceil(480 / ROW_HEIGHT) + 10;
  const startIdx = useVirtual ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 5) : 0;
  const endIdx = useVirtual ? Math.min(grid.pagedRows.length, startIdx + visibleCount) : grid.pagedRows.length;
  const virtualRows = grid.pagedRows.slice(startIdx, endIdx);
  const virtualOffset = startIdx * ROW_HEIGHT;
  const virtualHeight = grid.pagedRows.length * ROW_HEIGHT;

  const densityClass = grid.density === 'compact' ? 'density-compact' : grid.density === 'comfortable' ? 'density-comfortable' : '';
  const count = serverSide ? (totalCount ?? data.length) : grid.processed.filteredCount;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const el = document.getElementById(`${gridId}-quick-search`);
      el?.focus();
    }
    if (e.key === 'Escape') {
      setContextMenu(null);
      setDetailRow(null);
    }
  }, [gridId]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const frozenCols = grid.visibleColumns.filter((c) => grid.columnState.frozen.includes(c.key));
  const scrollCols = grid.visibleColumns.filter((c) => !grid.columnState.frozen.includes(c.key));

  const colSpan = (selectable ? 1 : 0) + grid.visibleColumns.length + (rowActions?.length ? 1 : 0);
  const showGroups = !serverSide && grid.groupBy && grid.processed.groups.length > 0;

  const toggleGroup = (key: string) => {
    grid.setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderRow = (row: T) => (
    <tr
      key={row.id}
      className={[
        onRowClick ? 'clickable' : '',
        grid.selectedIds.has(row.id) ? 'selected' : '',
      ].filter(Boolean).join(' ')}
      onClick={() => onRowClick?.(row)}
      onDoubleClick={() => onRowDoubleClick?.(row) ?? (detailRender ? setDetailRow(row) : undefined)}
      onContextMenu={(e) => {
        if (!rowActions?.length) return;
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, row });
      }}
      style={useVirtual && !showGroups ? { height: ROW_HEIGHT } : undefined}
    >
      {selectable ? (
        <td className="col-select" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={grid.selectedIds.has(row.id)}
            onChange={() => grid.toggleRow(row.id)}
            aria-label="Seleccionar fila"
          />
        </td>
      ) : null}
      {[...frozenCols, ...scrollCols].map((col) => (
        <td
          key={col.key}
          className={grid.columnState.frozen.includes(col.key) ? 'edw-frozen-col' : ''}
        >
          {col.render ? col.render(row) : getCellValue(row, col) || '—'}
        </td>
      ))}
      {rowActions?.length ? (
        <td className="col-actions" onClick={(e) => e.stopPropagation()}>
          <div className="ds-table-actions">
            {rowActions.filter((a) => !a.hidden?.(row)).slice(0, 2).map((a) => (
              <button
                key={a.id}
                type="button"
                className={`btn btn-sm${a.variant === 'danger' ? ' btn-danger' : ''}`}
                onClick={() => a.onAction(row)}
              >
                {a.label}
              </button>
            ))}
            {rowActions.filter((a) => !a.hidden?.(row)).length > 2 ? (
              <button type="button" className="btn btn-sm btn-ghost" onClick={(e) => {
                e.stopPropagation();
                setContextMenu({ x: e.clientX, y: e.clientY, row });
              }}>⋯</button>
            ) : null}
          </div>
        </td>
      ) : null}
    </tr>
  );

  if (!loading && data.length === 0 && !serverSide) {
    return (
      <EmptyState
        illustration={emptyIllustration}
        title={emptyMessage}
        description={emptyDescription ?? 'No hay registros que coincidan con los filtros actuales.'}
        hint="Ajuste los filtros o cree un nuevo registro para comenzar."
        action={emptyAction}
      />
    );
  }

  return (
    <div className={`edw-grid-wrap ${densityClass}`} role="region" aria-label="Tabla de datos">
      <TableToolbar
        left={
          <>
          <input
            id={`${gridId}-quick-search`}
            type="search"
            className="edw-quick-search ds-input"
            placeholder="Buscar en tabla… (Ctrl+F)"
            value={grid.quickSearch}
            onChange={(e) => grid.setQuickSearch(e.target.value)}
            aria-label="Búsqueda instantánea"
          />
          {!serverSide ? (
            <button type="button" className="btn btn-sm" onClick={() => setFiltersOpen(true)}>
              Filtros{grid.filters.length ? ` (${grid.filters.length})` : ''}
            </button>
          ) : null}
          {!serverSide ? (
            <RecentFiltersMenu
              presets={grid.filterPresets}
              filterHistory={grid.filterHistory}
              onApply={grid.applyFilterPreset}
              onApplySnapshot={(f, q) => grid.applyFilters(f.map((x) => ({ ...x })), q)}
              onPin={grid.pinFilterPreset}
              onDelete={grid.removeFilterPreset}
              onSaveCurrent={grid.saveCurrentFilters}
            />
          ) : onServerFilterStateApply && serverFilterState ? (
            <ServerFilterPresetsMenu
              presets={grid.serverFilterPresets}
              onApply={onServerFilterStateApply}
              onSave={(name, pinned) => grid.saveCurrentServerFilters(name, serverFilterState, pinned)}
              onPin={grid.pinServerFilterPreset}
              onDelete={grid.removeServerFilterPreset}
            />
          ) : null}
          <button type="button" className="btn btn-sm" onClick={() => setColumnsOpen(true)}>Columnas</button>
          <select
            className="ds-input edw-density-select"
            value={grid.groupBy ?? ''}
            onChange={(e) => grid.setGroupBy(e.target.value || null)}
            aria-label="Agrupar por"
          >
            <option value="">Sin agrupación</option>
            {columnDefs.filter((c) => c.groupable !== false).map((c) => (
              <option key={c.key} value={c.key}>Agrupar: {c.label}</option>
            ))}
          </select>
          <SavedViewsMenu
            views={grid.views}
            onLoad={grid.loadView}
            onSave={grid.saveView}
            onReset={grid.resetView}
            onDelete={grid.deleteView}
            onRename={grid.renameView}
            onPersistDefault={grid.persistCurrentAsDefault}
          />
          </>
        }
        right={
          <>
          {grid.favoriteSearches.length > 0 ? (
            <select
              className="ds-input edw-density-select"
              value=""
              onChange={(e) => {
                if (e.target.value) grid.setQuickSearch(e.target.value);
              }}
              aria-label="Búsquedas favoritas"
            >
              <option value="">★ Favoritas</option>
              {grid.favoriteSearches.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          ) : null}
          {grid.recentSearches.length > 0 ? (
            <select
              className="ds-input edw-density-select"
              value=""
              onChange={(e) => {
                if (e.target.value) grid.setQuickSearch(e.target.value);
              }}
              aria-label="Búsquedas recientes"
            >
              <option value="">Recientes</option>
              {grid.recentSearches.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          ) : null}
          {grid.quickSearch ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => grid.toggleSearchFavorite(grid.quickSearch)}
              title="Marcar búsqueda como favorita"
              aria-label="Favorito"
            >
              {grid.favoriteSearches.includes(grid.quickSearch) ? '★' : '☆'}
            </button>
          ) : null}
          {toolbarExtra}
          {onExport ? (
            <button type="button" className="btn btn-sm" onClick={onExport}>Exportar</button>
          ) : null}
          <select
            className="ds-input edw-density-select"
            value={grid.density}
            onChange={(e) => grid.setDensity(e.target.value as typeof grid.density)}
            aria-label="Densidad"
          >
            <option value="compact">Compacto</option>
            <option value="default">Normal</option>
            <option value="comfortable">Amplio</option>
          </select>
          </>
        }
      />

      {!serverSide ? (
        <FilterChipsBar
          columns={columnDefs}
          filters={grid.filters}
          quickSearch={grid.quickSearch}
          onRemoveFilter={grid.removeFilter}
          onClear={grid.clearFilters}
          onClearSearch={() => grid.setQuickSearch('')}
        />
      ) : null}

      <BulkActionsToolbar
        selectedCount={grid.selectedIds.size}
        bulkActions={bulkActions ?? []}
        selectedRows={grid.selectedRows}
        onClear={() => grid.setSelectedIds(new Set())}
      />

      {loading ? (
        <LoadingState variant="table" rows={8} />
      ) : (
        <div className="edw-table-scroll" ref={scrollRef} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
          <table className={`data-table ds-table edw-table ${densityClass}`} role="grid">
            <thead>
              <tr>
                {selectable ? (
                  <th className="col-select edw-frozen-col">
                    <input
                      type="checkbox"
                      aria-label="Seleccionar página"
                      checked={grid.pagedRows.length > 0 && grid.pagedRows.every((r) => grid.selectedIds.has(r.id))}
                      onChange={grid.toggleAllPage}
                    />
                  </th>
                ) : null}
                {[...frozenCols, ...scrollCols].map((col) => {
                  const sort = grid.sorts.find((s) => s.key === col.key);
                  const w = grid.columnState.widths[col.key] ?? col.width;
                  return (
                    <th
                      key={col.key}
                      className={[
                        !serverSide && col.sortable !== false ? 'sortable' : '',
                        !serverSide && sort ? `sorted-${sort.direction}` : '',
                        grid.columnState.frozen.includes(col.key) ? 'edw-frozen-col' : '',
                      ].filter(Boolean).join(' ')}
                      style={{ width: w, minWidth: col.minWidth ?? 80 }}
                      onClick={
                        !serverSide && col.sortable !== false
                          ? (e) => grid.toggleSort(col.key, e.shiftKey)
                          : undefined
                      }
                      aria-sort={
                        !serverSide && sort
                          ? sort.direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                    >
                      <span className="edw-th-label">{col.label}</span>
                      <span
                        className="edw-col-resize"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setResizeCol({ key: col.key, startX: e.clientX, startW: w ?? 120 });
                        }}
                        aria-hidden
                      />
                    </th>
                  );
                })}
                {rowActions?.length ? <th className="col-actions edw-frozen-col-right">Acciones</th> : null}
              </tr>
            </thead>
            <tbody style={useVirtual && !showGroups ? { height: virtualHeight, position: 'relative' } : undefined}>
              {useVirtual && !showGroups ? (
                <tr style={{ height: virtualOffset, visibility: 'hidden' }} aria-hidden>
                  <td colSpan={colSpan} />
                </tr>
              ) : null}
              {showGroups
                ? grid.processed.groups.flatMap((group) => {
                    const expanded = grid.expandedGroups.has('__all__') || grid.expandedGroups.has(group.key);
                    const header = (
                      <tr key={`group-${group.key}`} className="edw-group-row">
                        <td colSpan={colSpan}>
                          <button
                            type="button"
                            className="edw-group-toggle"
                            onClick={() => toggleGroup(group.key)}
                            aria-expanded={expanded}
                          >
                            {expanded ? '▾' : '▸'} {group.label}
                            <span className="ds-caption"> ({group.rows.length})</span>
                          </button>
                          {scrollCols.filter((c) => c.aggregate).map((col) => (
                            group.aggregates[col.key] != null ? (
                              <span key={col.key} className="edw-group-agg">
                                {col.label}: {String(group.aggregates[col.key])}
                              </span>
                            ) : null
                          ))}
                        </td>
                      </tr>
                    );
                    if (!expanded) return [header];
                    return [header, ...group.rows.map((row) => renderRow(row))];
                  })
                : virtualRows.map((row) => renderRow(row))}
              {!loading && data.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="edw-empty-cell">
                    <EmptyState
                      illustration={emptyIllustration}
                      title={emptyMessage}
                      description={emptyDescription}
                    />
                  </td>
                </tr>
              ) : null}
            </tbody>
            {grid.processed.totals._count ? (
              <tfoot>
                <tr className="edw-totals-row">
                  {selectable ? <td /> : null}
                  {[...frozenCols, ...scrollCols].map((col) => (
                    <td key={col.key}>
                      {col.aggregate && grid.processed.totals[col.key] != null
                        ? String(grid.processed.totals[col.key])
                        : col.key === frozenCols[0]?.key ? `Total: ${grid.processed.totals._count}` : ''}
                    </td>
                  ))}
                  {rowActions?.length ? <td /> : null}
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      )}

      <div className="pagination-bar ds-pagination edw-pagination">
        <span>{count.toLocaleString('es-CO')} registros</span>
        <div className="ds-pagination-pages">
          <button
            type="button"
            className="ds-pagination-btn"
            disabled={serverSide ? (externalPage ?? 1) <= 1 : grid.page <= 0}
            onClick={() => serverSide ? onPageChange?.((externalPage ?? 1) - 1) : grid.setPage(grid.page - 1)}
          >
            ‹
          </button>
          <span>
            Página {(serverSide ? (externalPage ?? 1) : grid.page + 1)} de {serverSide ? Math.ceil(count / (externalPageSize ?? 25)) : grid.totalPages}
          </span>
          <select
            className="ds-input edw-page-size"
            value={serverSide ? externalPageSize : grid.pageSize}
            onChange={(e) => {
              const size = Number(e.target.value);
              grid.setPageSize(size);
              onPageSizeChange?.(size);
            }}
            aria-label="Registros por página"
          >
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}/pág</option>)}
          </select>
          <button
            type="button"
            className="ds-pagination-btn"
            disabled={serverSide ? (externalPage ?? 1) >= Math.ceil(count / (externalPageSize ?? 25)) : grid.page >= grid.totalPages - 1}
            onClick={() => serverSide ? onPageChange?.((externalPage ?? 1) + 1) : grid.setPage(grid.page + 1)}
          >
            ›
          </button>
        </div>
      </div>

      <FilterPanel
        columns={columnDefs}
        filters={grid.filters}
        onAdd={grid.addFilter}
        onRemove={grid.removeFilter}
        onClear={grid.clearFilters}
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
      />
      <ColumnManager
        columns={columnDefs}
        columnState={grid.columnState}
        onToggle={grid.toggleColumn}
        onReorder={grid.reorderColumn}
        onFreeze={grid.toggleFreeze}
        open={columnsOpen}
        onClose={() => setColumnsOpen(false)}
      />

      {contextMenu && rowActions ? (
        <div
          className="edw-context-menu ds-popover"
          style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 2000 }}
          role="menu"
        >
          {rowActions.filter((a) => !a.hidden?.(contextMenu.row)).map((a) => (
            <button
              key={a.id}
              type="button"
              className="ds-dropdown-item"
              role="menuitem"
              onClick={() => { a.onAction(contextMenu.row); setContextMenu(null); }}
            >
              {a.label}
            </button>
          ))}
          {detailRender ? (
            <button type="button" className="ds-dropdown-item" onClick={() => { setDetailRow(contextMenu.row); setContextMenu(null); }}>
              Vista rápida
            </button>
          ) : null}
        </div>
      ) : null}

      {detailRow && detailRender ? (
        <DetailPanel open title="Detalle" onClose={() => setDetailRow(null)}>
          {detailRender(detailRow)}
        </DetailPanel>
      ) : null}
    </div>
  );
}
