import { useMemo, type ReactNode } from 'react';
import { EnterpriseDataGrid } from '../data-workspace/EnterpriseDataGrid';
import type { GridColumnDef } from '../../lib/data-grid/types';

export type TableDensity = 'compact' | 'default' | 'comfortable';

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
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
}: DataTableProps<T>) {
  const gridColumns = useMemo<GridColumnDef<T>[]>(
    () =>
      columns.map((col) => ({
        key: col.key,
        label: col.label,
        sortable: col.sortable ?? col.key !== 'actions',
        filterable: col.key !== 'actions',
        groupable: col.key !== 'actions',
        render: col.render,
      })),
    [columns],
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
    />
  );
}
