import type { FilterRule, GridColumnDef, ProcessedGroup, SortRule } from './types';
import { getCellValue, getSortValue } from './types';

function matchFilter<T>(row: T, rule: FilterRule, col: GridColumnDef<T>): boolean {
  const raw = getCellValue(row, col).toLowerCase();
  const val = rule.value.toLowerCase();
  switch (rule.operator) {
    case 'contains': return raw.includes(val);
    case 'equals': return raw === val;
    case 'startsWith': return raw.startsWith(val);
    case 'endsWith': return raw.endsWith(val);
    case 'empty': return raw === '';
    case 'notEmpty': return raw !== '';
    case 'gt': return Number(raw) > Number(rule.value);
    case 'gte': return Number(raw) >= Number(rule.value);
    case 'lt': return Number(raw) < Number(rule.value);
    case 'lte': return Number(raw) <= Number(rule.value);
    case 'between':
      return Number(raw) >= Number(rule.value) && Number(raw) <= Number(rule.valueTo ?? rule.value);
    case 'in':
      return rule.value.split(',').map((x) => x.trim().toLowerCase()).includes(raw);
    default:
      return true;
  }
}

export function applyQuickSearch<T>(rows: T[], columns: GridColumnDef<T>[], q: string): T[] {
  const query = q.trim().toLowerCase();
  if (!query) return rows;
  return rows.filter((row) =>
    columns.some((col) => getCellValue(row, col).toLowerCase().includes(query)),
  );
}

export function applyFilters<T>(rows: T[], columns: GridColumnDef<T>[], filters: FilterRule[]): T[] {
  if (!filters.length) return rows;
  return rows.filter((row) => {
    let result = true;
    for (const rule of filters) {
      const col = columns.find((c) => c.key === rule.key);
      if (!col) continue;
      const match = matchFilter(row, rule, col);
      if (rule.logic === 'or') result = result || match;
      else result = result && match;
    }
    return result;
  });
}

export function applySorts<T>(rows: T[], columns: GridColumnDef<T>[], sorts: SortRule[]): T[] {
  if (!sorts.length) return rows;
  return [...rows].sort((a, b) => {
    for (const sort of sorts) {
      const col = columns.find((c) => c.key === sort.key);
      if (!col) continue;
      const av = getSortValue(a, col);
      const bv = getSortValue(b, col);
      let cmp = 0;
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv), 'es', { numeric: true });
      if (cmp !== 0) return sort.direction === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
}

export function applyGrouping<T>(
  rows: T[],
  columns: GridColumnDef<T>[],
  groupBy: string | null,
): { flat: T[]; groups: ProcessedGroup<T>[] } {
  if (!groupBy) return { flat: rows, groups: [] };
  const col = columns.find((c) => c.key === groupBy);
  if (!col) return { flat: rows, groups: [] };

  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = getCellValue(row, col) || '(vacío)';
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }

  const groups: ProcessedGroup<T>[] = [];
  const flat: T[] = [];
  for (const [key, groupRows] of map.entries()) {
    const aggregates: Record<string, number | string> = { _count: groupRows.length };
    for (const c of columns) {
      if (!c.aggregate) continue;
      const nums = groupRows
        .map((r) => Number(getSortValue(r, c)))
        .filter((n) => !Number.isNaN(n));
      if (c.aggregate === 'count') aggregates[c.key] = groupRows.length;
      else if (c.aggregate === 'sum') aggregates[c.key] = nums.reduce((s, n) => s + n, 0);
      else if (c.aggregate === 'avg' && nums.length) aggregates[c.key] = nums.reduce((s, n) => s + n, 0) / nums.length;
      else if (c.aggregate === 'min' && nums.length) aggregates[c.key] = Math.min(...nums);
      else if (c.aggregate === 'max' && nums.length) aggregates[c.key] = Math.max(...nums);
    }
    groups.push({ key, label: key, rows: groupRows, aggregates });
    flat.push(...groupRows);
  }
  return { flat, groups };
}

export function computeTotals<T>(rows: T[], columns: GridColumnDef<T>[]): Record<string, number | string> {
  const totals: Record<string, number | string> = { _count: rows.length };
  for (const col of columns) {
    if (!col.aggregate) continue;
    const nums = rows.map((r) => Number(getSortValue(r, col))).filter((n) => !Number.isNaN(n));
    if (col.aggregate === 'count') totals[col.key] = rows.length;
    else if (col.aggregate === 'sum') totals[col.key] = nums.reduce((s, n) => s + n, 0);
    else if (col.aggregate === 'avg' && nums.length) totals[col.key] = Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 100) / 100;
  }
  return totals;
}

export function processGridData<T>(
  rows: T[],
  columns: GridColumnDef<T>[],
  opts: {
    quickSearch: string;
    filters: FilterRule[];
    sorts: SortRule[];
    groupBy: string | null;
  },
) {
  let data = applyQuickSearch(rows, columns, opts.quickSearch);
  data = applyFilters(data, columns, opts.filters);
  data = applySorts(data, columns, opts.sorts);
  const { flat, groups } = applyGrouping(data, columns, opts.groupBy);
  const totals = computeTotals(data, columns);
  return { rows: flat, groups, totals, filteredCount: data.length };
}
