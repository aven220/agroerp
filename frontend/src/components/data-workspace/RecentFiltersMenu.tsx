import { useState } from 'react';
import type { SavedFilterPreset } from '../../lib/gridProductivity';

interface RecentFiltersMenuProps {
  presets: SavedFilterPreset[];
  filterHistory: Array<{ filters: SavedFilterPreset['filters']; quickSearch: string }>;
  onApply: (preset: SavedFilterPreset) => void;
  onApplySnapshot: (filters: SavedFilterPreset['filters'], quickSearch: string) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveCurrent: (name: string, pinned: boolean) => void;
}

export function RecentFiltersMenu({
  presets,
  filterHistory,
  onApply,
  onApplySnapshot,
  onPin,
  onDelete,
  onSaveCurrent,
}: RecentFiltersMenuProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [pinned, setPinned] = useState(false);

  const pinnedPresets = presets.filter((p) => p.pinned);
  const recentPresets = presets.filter((p) => !p.pinned).slice(0, 8);

  return (
    <div className="edw-recent-filters">
      <button type="button" className="btn btn-sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        Consultas{pinnedPresets.length ? ` (${pinnedPresets.length})` : ''}
      </button>
      {open ? (
        <div className="edw-recent-filters-dropdown ds-popover">
          {pinnedPresets.length > 0 ? (
            <section className="edw-recent-section">
              <h4 className="edw-recent-title">Filtros fijados</h4>
              <ul className="edw-recent-list">
                {pinnedPresets.map((p) => (
                  <li key={p.id} className="edw-recent-item">
                    <button type="button" className="ds-dropdown-item" onClick={() => { onApply(p); setOpen(false); }}>
                      📌 {p.name}
                    </button>
                    <button type="button" className="edw-recent-item-action" onClick={() => onPin(p.id)} aria-label="Desfijar">☆</button>
                    <button type="button" className="edw-recent-item-action" onClick={() => onDelete(p.id)} aria-label="Eliminar">×</button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {recentPresets.length > 0 ? (
            <section className="edw-recent-section">
              <h4 className="edw-recent-title">Consultas guardadas</h4>
              <ul className="edw-recent-list">
                {recentPresets.map((p) => (
                  <li key={p.id} className="edw-recent-item">
                    <button type="button" className="ds-dropdown-item" onClick={() => { onApply(p); setOpen(false); }}>
                      {p.name}
                    </button>
                    <button type="button" className="edw-recent-item-action" onClick={() => onPin(p.id)} aria-label="Fijar">📌</button>
                    <button type="button" className="edw-recent-item-action" onClick={() => onDelete(p.id)} aria-label="Eliminar">×</button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {filterHistory.length > 0 ? (
            <section className="edw-recent-section">
              <h4 className="edw-recent-title">Filtros recientes</h4>
              <ul className="edw-recent-list">
                {filterHistory.slice(0, 5).map((snap, i) => (
                  <li key={`hist-${i}`}>
                    <button
                      type="button"
                      className="ds-dropdown-item"
                      onClick={() => {
                        onApplySnapshot(snap.filters, snap.quickSearch);
                        setOpen(false);
                      }}
                    >
                      {snap.filters.length} filtro(s){snap.quickSearch ? ` · «${snap.quickSearch}»` : ''}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="edw-recent-save">
            <input
              className="ds-input"
              placeholder="Guardar consulta actual…"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <label className="ds-checkbox">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
              Fijar
            </label>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!name.trim()}
              onClick={() => {
                onSaveCurrent(name.trim(), pinned);
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
