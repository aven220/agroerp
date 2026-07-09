import { useState } from 'react';
import type { SavedGridView } from '../../lib/data-grid/types';

interface SavedViewsMenuProps {
  views: SavedGridView[];
  onLoad: (view: SavedGridView) => void;
  onSave: (name: string, shared: boolean) => void;
  onReset: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onPersistDefault: () => void;
}

export function SavedViewsMenu({
  views,
  onLoad,
  onSave,
  onReset,
  onDelete,
  onRename,
  onPersistDefault,
}: SavedViewsMenuProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [shared, setShared] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  return (
    <div className="edw-views-menu">
      <button type="button" className="btn btn-sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        Vistas guardadas
      </button>
      {open ? (
        <div className="edw-views-dropdown ds-popover">
          <ul className="edw-views-list">
            {views.map((v) => (
              <li key={v.id} className="edw-views-list-item">
                {renamingId === v.id ? (
                  <form
                    className="edw-views-rename"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (renameValue.trim()) onRename(v.id, renameValue.trim());
                      setRenamingId(null);
                    }}
                  >
                    <input className="ds-input" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
                    <button type="submit" className="btn btn-sm">OK</button>
                  </form>
                ) : (
                  <>
                    <button type="button" className="ds-dropdown-item" onClick={() => { onLoad(v); setOpen(false); }}>
                      {v.name}
                      {v.isDefault ? ' ★' : ''}
                      {v.shared ? ' · compartida' : ''}
                    </button>
                    <div className="edw-views-item-actions">
                      <button
                        type="button"
                        className="edw-recent-item-action"
                        onClick={() => { setRenamingId(v.id); setRenameValue(v.name); }}
                        aria-label="Renombrar"
                      >
                        ✎
                      </button>
                      {v.id !== 'default' ? (
                        <button type="button" className="edw-recent-item-action" onClick={() => onDelete(v.id)} aria-label="Eliminar">×</button>
                      ) : null}
                    </div>
                  </>
                )}
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
          <div className="edw-views-footer">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { onPersistDefault(); }}>
              Recordar layout actual
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { onReset(); setOpen(false); }}>
              Restaurar inicial
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
