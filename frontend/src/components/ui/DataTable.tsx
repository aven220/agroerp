import { useMemo, type ReactNode } from 'react';
import { EnterpriseDataGrid } from '../data-workspace/EnterpriseDataGrid';
import type { BulkAction, GridColumnDef, RowAction } from '../../lib/data-grid/types';

export type TableDensity = 'compact' | 'default' | 'comfortable';

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: number;
  minWidth?: number;
  hidden?: boolean;
  frozen?: boolean;
  filterable?: boolean;
  groupable?: boolean;
  getValue?: (row: T) => string | number | boolean | null | undefined;
  getExportValue?: (row: T) => string | number;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  gridId?: string;
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  onRowDoubleClick?: (row: T) => void;
  emptyMessage?: string;
  pageSize?: number;
  density?: TableDensity;
  selectable?: boolean;
  toolbar?: ReactNode;
  serverSide?: boolean;
  totalCount?: number;
  page?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onExport?: () => void;
  onQuickSearchChange?: (query: string) => void;
  bulkActions?: BulkAction<T>[];
  rowActions?: RowAction<T>[];
  detailRender?: (row: T) => ReactNode;
  serverFilterState?: Record<string, unknown>;
  onServerFilterStateApply?: (state: Record<string, unknown>) => void;
}

export function DataTable<T extends { id: string }>({
  gridId = 'data-table',
  columns,
  data,
  loading,
  onRowClick,
  onRowDoubleClick,
  emptyMessage = 'Sin registros',
  pageSize = 25,
  density = 'default',
  selectable = true,
  toolbar,
  serverSide,
  totalCount,
  page,
  onPageChange,
  onPageSizeChange,
  onExport,
  onQuickSearchChange,
  bulkActions,
  rowActions,
  detailRender,
  serverFilterState,
  onServerFilterStateApply,
}: DataTableProps<T>) {
  const gridColumns = useMemo<GridColumnDef<T>[]>(
    () =>
      columns
        .filter((col) => col.key !== 'actions' || !rowActions?.length)
        .map((col) => ({
          key: col.key,
          label: col.label,
          width: col.width,
          minWidth: col.minWidth,
          sortable: col.sortable ?? col.key !== 'actions',
          filterable: col.filterable ?? col.key !== 'actions',
          groupable: col.groupable ?? col.key !== 'actions',
          hidden: col.hidden,
          frozen: col.frozen,
          getValue: col.getValue,
          getExportValue: col.getExportValue,
          render: col.render,
        })),
    [columns, rowActions],
  );

  return (
    <EnterpriseDataGrid
      gridId={gridId}
      columns={gridColumns}
      data={data}
      loading={loading}
      serverSide={serverSide}
      totalCount={totalCount}
      page={page}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      onQuickSearchChange={onQuickSearchChange}
      selectable={selectable}
      onRowClick={onRowClick}
      onRowDoubleClick={onRowDoubleClick}
      onExport={onExport}
      emptyMessage={emptyMessage}
      density={density}
      toolbarExtra={toolbar}
      bulkActions={bulkActions}
      rowActions={rowActions}
      detailRender={detailRender}
      serverFilterState={serverFilterState}
      onServerFilterStateApply={onServerFilterStateApply}
    />
  );
}

export type { BulkAction, RowAction, GridColumnDef };
