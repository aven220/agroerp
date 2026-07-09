import { useState } from 'react';
import type { ServerFilterPreset } from '../../lib/gridProductivity';

interface ServerFilterPresetsMenuProps {
  presets: ServerFilterPreset[];
  onApply: (state: Record<string, unknown>) => void;
  onSave: (name: string, pinned: boolean) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ServerFilterPresetsMenu({
  presets,
  onApply,
  onSave,
  onPin,
  onDelete,
}: ServerFilterPresetsMenuProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [pinned, setPinned] = useState(false);

  const pinnedList = presets.filter((p) => p.pinned);
  const savedList = presets.filter((p) => !p.pinned);

  return (
    <div className="edw-recent-filters">
      <button type="button" className="btn btn-sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        Consultas{pinnedList.length ? ` (${pinnedList.length})` : ''}
      </button>
      {open ? (
        <div className="edw-recent-filters-dropdown ds-popover">
          {[...pinnedList, ...savedList].map((p) => (
            <div key={p.id} className="edw-recent-item">
              <button type="button" className="ds-dropdown-item" onClick={() => { onApply(p.state); setOpen(false); }}>
                {p.pinned ? '📌 ' : ''}{p.name}
              </button>
              <button type="button" className="edw-recent-item-action" onClick={() => onPin(p.id)} aria-label="Fijar/desfijar">📌</button>
              <button type="button" className="edw-recent-item-action" onClick={() => onDelete(p.id)} aria-label="Eliminar">×</button>
            </div>
          ))}
          <div className="edw-recent-save">
            <input className="ds-input" placeholder="Guardar filtros actuales…" value={name} onChange={(e) => setName(e.target.value)} />
            <label className="ds-checkbox">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
              Fijar
            </label>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!name.trim()}
              onClick={() => {
                onSave(name.trim(), pinned);
                setName('');
                setPinned(false);
                setOpen(false);
              }}
            >
              Guardar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
