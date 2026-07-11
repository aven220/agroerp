/**
 * PM-27 — Tabla enterprise ligera para migrar listas legacy
 * sin reescribir lógica. Envuelve EnterpriseDataGrid.
 */
import { useMemo, type ReactNode } from 'react';
import { EnterpriseDataGrid } from '../data-workspace/EnterpriseDataGrid';
import type { GridColumnDef, RowAction } from '../../lib/data-grid/types';

export interface SimpleColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  getValue?: (row: T) => string | number | boolean | null | undefined;
}

interface SimpleRecordsTableProps<T extends { id: string }> {
  gridId: string;
  columns: SimpleColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  rowActions?: RowAction<T>[];
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  toolbarExtra?: ReactNode;
}

export function SimpleRecordsTable<T extends { id: string }>({
  gridId,
  columns,
  data,
  loading,
  emptyMessage = 'Aún no hay registros',
  emptyDescription,
  rowActions,
  onRowClick,
  selectable = false,
  toolbarExtra,
}: SimpleRecordsTableProps<T>) {
  const gridColumns = useMemo<GridColumnDef<T>[]>(
    () =>
      columns.map((col) => ({
        key: col.key,
        label: col.label,
        render: col.render,
        getValue: col.getValue,
      })),
    [columns],
  );

  return (
    <EnterpriseDataGrid
      gridId={gridId}
      columns={gridColumns}
      data={data}
      loading={loading}
      selectable={selectable}
      emptyMessage={emptyMessage}
      emptyDescription={emptyDescription}
      rowActions={rowActions}
      onRowClick={onRowClick}
      toolbarExtra={toolbarExtra}
    />
  );
}

/** Garantiza id estable para filas legacy */
export function withRowId<T extends Record<string, unknown>>(
  row: T,
  ...keys: string[]
): T & { id: string } {
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).length > 0) {
      return { ...row, id: String(value) };
    }
  }
  return { ...row, id: String(row.id ?? Math.random()) };
}
