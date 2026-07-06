import { useMemo, type ReactNode } from 'react';
import { EnterpriseDataGrid } from './EnterpriseDataGrid';
import type { GridColumnDef } from '../../lib/data-grid/types';

export interface QuickGridColumn<T> {
  key: keyof T & string;
  label: string;
  sortable?: boolean;
  aggregate?: GridColumnDef<T>['aggregate'];
  render?: (row: T) => ReactNode;
}

interface QuickGridProps<T extends Record<string, unknown>> {
  gridId: string;
  columns: QuickGridColumn<T>[];
  rows: T[];
  idKey?: keyof T & string;
  loading?: boolean;
  onRowClick?: (row: T & { id: string }) => void;
  onExport?: () => void;
  toolbarExtra?: ReactNode;
  emptyMessage?: string;
}

export function QuickGrid<T extends Record<string, unknown>>({
  gridId,
  columns,
  rows,
  idKey = 'id' as keyof T & string,
  loading,
  onRowClick,
  onExport,
  toolbarExtra,
  emptyMessage,
}: QuickGridProps<T>) {
  const data = useMemo(
    () =>
      rows.map((row, index) => ({
        ...row,
        id: String(row[idKey] ?? index),
      })) as Array<T & { id: string }>,
    [rows, idKey],
  );

  const gridColumns = useMemo<GridColumnDef<T & { id: string }>[]>(
    () =>
      columns.map((col) => ({
        key: col.key,
        label: col.label,
        sortable: col.sortable ?? true,
        aggregate: col.aggregate,
        render: col.render,
        getValue: (row) => {
          const v = row[col.key];
          if (v == null) return '';
          if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
          return String(v);
        },
      })),
    [columns],
  );

  return (
    <EnterpriseDataGrid
      gridId={gridId}
      columns={gridColumns}
      data={data}
      loading={loading}
      onRowClick={onRowClick}
      onExport={onExport}
      toolbarExtra={toolbarExtra}
      emptyMessage={emptyMessage}
    />
  );
}
