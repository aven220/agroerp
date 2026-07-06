import type { FilterRule, GridColumnDef } from '../../lib/data-grid/types';

interface FilterPanelProps<T> {
  columns: GridColumnDef<T>[];
  filters: FilterRule[];
  onAdd: (rule: Omit<FilterRule, 'id'>) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  open: boolean;
  onClose: () => void;
}

export function FilterPanel<T>({
  columns,
  filters,
  onAdd,
  onRemove,
  onClear,
  open,
  onClose,
}: FilterPanelProps<T>) {
  if (!open) return null;

  const filterable = columns.filter((c) => c.filterable !== false);

  return (
    <>
      <div className="edw-panel-backdrop" onClick={onClose} aria-hidden />
      <div className="edw-filter-panel card" role="dialog" aria-label="Filtros avanzados">
      <div className="card-header">
        <h3 className="ds-h4">Filtros avanzados</h3>
        <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar">×</button>
      </div>
      <div className="edw-filter-list">
        {filters.length === 0 ? (
          <p className="muted">Sin filtros activos</p>
        ) : (
          filters.map((f) => {
            const col = columns.find((c) => c.key === f.key);
            return (
              <div key={f.id} className="edw-filter-chip">
                <span>{col?.label ?? f.key} {f.operator} &quot;{f.value}&quot;</span>
                <button type="button" className="btn-icon" onClick={() => onRemove(f.id)} aria-label="Quitar filtro">×</button>
              </div>
            );
          })
        )}
      </div>
      <form
        className="edw-filter-form"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const key = String(fd.get('key') ?? '');
          const operator = String(fd.get('operator') ?? 'contains') as FilterRule['operator'];
          const value = String(fd.get('value') ?? '');
          if (!key || !value) return;
          onAdd({ key, operator, value, logic: 'and' });
          e.currentTarget.reset();
        }}
      >
        <select name="key" className="ds-input" required aria-label="Columna">
          <option value="">Columna…</option>
          {filterable.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
        <select name="operator" className="ds-input" defaultValue="contains" aria-label="Operador">
          <option value="contains">Contiene</option>
          <option value="equals">Igual a</option>
          <option value="startsWith">Empieza con</option>
          <option value="endsWith">Termina con</option>
          <option value="gt">Mayor que</option>
          <option value="lt">Menor que</option>
          <option value="empty">Vacío</option>
          <option value="notEmpty">No vacío</option>
        </select>
        <input name="value" className="ds-input" placeholder="Valor" aria-label="Valor del filtro" />
        <button type="submit" className="btn btn-primary btn-sm">Agregar</button>
      </form>
      <div className="edw-filter-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>Limpiar todo</button>
      </div>
    </div>
    </>
  );
}
