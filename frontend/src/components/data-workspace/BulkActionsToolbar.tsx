import type { BulkAction } from '../../lib/data-grid/types';

interface BulkActionsToolbarProps<T> {
  selectedCount: number;
  bulkActions: BulkAction<T>[];
  selectedRows: T[];
  onClear: () => void;
}

export function BulkActionsToolbar<T>({
  selectedCount,
  bulkActions,
  selectedRows,
  onClear,
}: BulkActionsToolbarProps<T>) {
  if (selectedCount <= 0 || !bulkActions.length) return null;

  return (
    <div className="edw-bulk-bar edw-context-action-bar" role="toolbar" aria-label="Acciones masivas">
      <span className="edw-bulk-count">{selectedCount} seleccionado{selectedCount !== 1 ? 's' : ''}</span>
      {bulkActions.map((a) => (
        <button
          key={a.id}
          type="button"
          className={`btn btn-sm${a.variant === 'danger' ? ' btn-danger' : ''}`}
          onClick={() => a.onAction(selectedRows)}
        >
          {a.icon ? `${a.icon} ` : ''}{a.label}
        </button>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
        Limpiar selección
      </button>
    </div>
  );
}
