import { useState } from 'react';
import type { ColumnState, GridColumnDef } from '../../lib/data-grid/types';

interface ColumnManagerProps<T> {
  columns: GridColumnDef<T>[];
  columnState: ColumnState;
  onToggle: (key: string) => void;
  onReorder: (from: string, to: string) => void;
  onFreeze: (key: string) => void;
  open: boolean;
  onClose: () => void;
}

export function ColumnManager<T>({
  columns,
  columnState,
  onToggle,
  onReorder,
  onFreeze,
  open,
  onClose,
}: ColumnManagerProps<T>) {
  const [dragKey, setDragKey] = useState<string | null>(null);
  if (!open) return null;

  return (
    <>
      <div className="edw-panel-backdrop" onClick={onClose} aria-hidden />
      <div className="edw-column-panel card" role="dialog" aria-label="Configurar columnas">
      <div className="card-header">
        <h3 className="ds-h4">Columnas</h3>
        <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar">×</button>
      </div>
      <ul className="edw-column-list">
        {columnState.order.map((key) => {
          const col = columns.find((c) => c.key === key);
          if (!col) return null;
          const hidden = columnState.hidden.includes(key);
          const frozen = columnState.frozen.includes(key);
          return (
            <li
              key={key}
              className={`edw-column-item${dragKey === key ? ' dragging' : ''}`}
              draggable
              onDragStart={() => setDragKey(key)}
              onDragEnd={() => setDragKey(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragKey && dragKey !== key) onReorder(dragKey, key); setDragKey(null); }}
            >
              <span className="edw-drag" aria-hidden>⠿</span>
              <label className="edw-column-label">
                <input type="checkbox" checked={!hidden} onChange={() => onToggle(key)} />
                {col.label}
              </label>
              <button
                type="button"
                className={`btn btn-ghost btn-sm${frozen ? ' active' : ''}`}
                title="Congelar columna"
                onClick={() => onFreeze(key)}
              >
                ❄
              </button>
            </li>
          );
        })}
      </ul>
    </div>
    </>
  );
}
