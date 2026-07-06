import type { ReactNode } from 'react';

export type SortDirection = 'asc' | 'desc';
export type FilterOperator =
  | 'contains'
  | 'equals'
  | 'startsWith'
  | 'endsWith'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'in'
  | 'empty'
  | 'notEmpty';

export type AggregateFn = 'sum' | 'avg' | 'count' | 'min' | 'max';

export interface SortRule {
  key: string;
  direction: SortDirection;
}

export interface FilterRule {
  id: string;
  key: string;
  operator: FilterOperator;
  value: string;
  valueTo?: string;
  logic?: 'and' | 'or';
}

export interface GridColumnDef<T> {
  key: string;
  label: string;
  width?: number;
  minWidth?: number;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: 'text' | 'number' | 'date' | 'select' | 'boolean';
  filterOptions?: { value: string; label: string }[];
  groupable?: boolean;
  aggregate?: AggregateFn;
  frozen?: boolean;
  hidden?: boolean;
  editable?: boolean;
  render?: (row: T) => ReactNode;
  getValue?: (row: T) => string | number | boolean | null | undefined;
  getExportValue?: (row: T) => string | number;
}

export interface ColumnState {
  order: string[];
  widths: Record<string, number>;
  hidden: string[];
  frozen: string[];
}

export interface SavedGridView {
  id: string;
  name: string;
  isDefault?: boolean;
  shared?: boolean;
  createdAt: string;
  columnState: ColumnState;
  sorts: SortRule[];
  filters: FilterRule[];
  groupBy: string | null;
  density: 'compact' | 'default' | 'comfortable';
  quickSearch: string;
}

export interface BulkAction<T> {
  id: string;
  label: string;
  icon?: string;
  variant?: 'default' | 'danger';
  onAction: (rows: T[]) => void | Promise<void>;
}

export interface RowAction<T> {
  id: string;
  label: string;
  icon?: string;
  variant?: 'default' | 'danger';
  hidden?: (row: T) => boolean;
  onAction: (row: T) => void;
}

export interface ProcessedGroup<T> {
  key: string;
  label: string;
  rows: T[];
  aggregates: Record<string, number | string>;
}

export function getCellValue<T>(row: T, col: GridColumnDef<T>): string {
  if (col.getValue) {
    const v = col.getValue(row);
    return v == null ? '' : String(v);
  }
  const raw = (row as Record<string, unknown>)[col.key];
  return raw == null ? '' : String(raw);
}

export function getSortValue<T>(row: T, col: GridColumnDef<T>): string | number {
  if (col.getValue) {
    const v = col.getValue(row);
    if (typeof v === 'number') return v;
    return v == null ? '' : String(v);
  }
  const raw = (row as Record<string, unknown>)[col.key];
  if (typeof raw === 'number') return raw;
  return raw == null ? '' : String(raw);
}
