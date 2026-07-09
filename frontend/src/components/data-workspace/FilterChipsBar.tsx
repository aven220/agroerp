import type { FilterRule, GridColumnDef } from '../../lib/data-grid/types';

interface FilterChipsBarProps<T> {
  columns: GridColumnDef<T>[];
  filters: FilterRule[];
  quickSearch: string;
  onRemoveFilter: (id: string) => void;
  onClear: () => void;
  onClearSearch: () => void;
}

export function FilterChipsBar<T>({
  columns,
  filters,
  quickSearch,
  onRemoveFilter,
  onClear,
  onClearSearch,
}: FilterChipsBarProps<T>) {
  if (!filters.length && !quickSearch) return null;

  return (
    <div className="edw-sticky-filters" role="region" aria-label="Filtros activos">
      {quickSearch ? (
        <span className="edw-sticky-chip edw-sticky-chip-search">
          Búsqueda: &quot;{quickSearch}&quot;
          <button type="button" className="edw-sticky-chip-remove" onClick={onClearSearch} aria-label="Quitar búsqueda">×</button>
        </span>
      ) : null}
      {filters.map((f) => {
        const col = columns.find((c) => c.key === f.key);
        return (
          <span key={f.id} className="edw-sticky-chip">
            {col?.label ?? f.key} {f.operator} &quot;{f.value}&quot;
            <button type="button" className="edw-sticky-chip-remove" onClick={() => onRemoveFilter(f.id)} aria-label="Quitar filtro">×</button>
          </span>
        );
      })}
      {(filters.length > 0 || quickSearch) ? (
        <button type="button" className="btn btn-ghost btn-sm edw-sticky-clear" onClick={onClear}>
          Limpiar todo
        </button>
      ) : null}
    </div>
  );
}
