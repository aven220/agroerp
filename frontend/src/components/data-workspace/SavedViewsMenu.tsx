import { useState } from 'react';
import type { SavedGridView } from '../../lib/data-grid/types';

interface SavedViewsMenuProps {
  views: SavedGridView[];
  onLoad: (view: SavedGridView) => void;
  onSave: (name: string, shared: boolean) => void;
  onReset: () => void;
}

export function SavedViewsMenu({ views, onLoad, onSave, onReset }: SavedViewsMenuProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [shared, setShared] = useState(false);

  return (
    <div className="edw-views-menu">
      <button type="button" className="btn btn-sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        Vistas guardadas
      </button>
      {open ? (
        <div className="edw-views-dropdown ds-popover">
          <ul className="edw-views-list">
            {views.map((v) => (
              <li key={v.id}>
                <button type="button" className="ds-dropdown-item" onClick={() => { onLoad(v); setOpen(false); }}>
                  {v.name}
                  {v.isDefault ? ' ★' : ''}
                  {v.shared ? ' · compartida' : ''}
                </button>
              </li>
            ))}
          </ul>
          <div className="edw-views-save">
            <input
              className="ds-input"
              placeholder="Nombre de vista"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <label className="ds-checkbox">
              <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
              Compartir
            </label>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!name.trim()}
              onClick={() => { onSave(name.trim(), shared); setName(''); setOpen(false); }}
            >
              Guardar vista
            </button>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { onReset(); setOpen(false); }}>
            Restaurar inicial
          </button>
        </div>
      ) : null}
    </div>
  );
}
