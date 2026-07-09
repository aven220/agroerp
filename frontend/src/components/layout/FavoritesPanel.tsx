import { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useNavigation } from '../../context/NavigationContext';

export function FavoritesPanel({ onNavigate }: { onNavigate?: () => void }) {
  const { favorites, removeFavorite, reorderFavorites } = useNavigation();
  const [query, setQuery] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...favorites].sort((a, b) => a.order - b.order),
    [favorites],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((f) => f.label.toLowerCase().includes(q) || f.to.toLowerCase().includes(q));
  }, [sorted, query]);

  const move = (id: string, dir: -1 | 1) => {
    const ids = sorted.map((f) => f.id);
    const idx = ids.indexOf(id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= ids.length) return;
    [ids[idx], ids[next]] = [ids[next], ids[idx]];
    reorderFavorites(ids);
  };

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const ids = sorted.map((f) => f.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    reorderFavorites(ids);
    setDragId(null);
  };

  if (sorted.length === 0) {
    return (
      <p className="favorites-empty" role="status">
        Agregue accesos frecuentes con ☆ junto a cada opción del menú.
      </p>
    );
  }

  return (
    <div className="favorites-panel">
      <div className="favorites-search-wrap">
        <input
          type="search"
          className="favorites-search"
          placeholder="Buscar favoritos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar favoritos"
        />
      </div>
      <ul className="favorites-list" aria-label="Favoritos">
        {filtered.map((fav) => (
          <li
            key={fav.id}
            className={`favorites-item${dragId === fav.id ? ' dragging' : ''}`}
            draggable
            onDragStart={() => setDragId(fav.id)}
            onDragEnd={() => setDragId(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(fav.id)}
          >
            <span className="favorites-drag" aria-hidden title="Arrastrar para reordenar">⠿</span>
            <NavLink
              to={fav.to}
              className={({ isActive }) => `nav-item favorites-link${isActive ? ' active' : ''}`}
              onClick={onNavigate}
            >
              <span className="nav-icon" aria-hidden>{fav.icon}</span>
              <span className="nav-label">{fav.label}</span>
            </NavLink>
            <div className="favorites-actions">
              <button
                type="button"
                className="favorites-move-btn"
                aria-label={`Subir ${fav.label}`}
                onClick={() => move(fav.id, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="favorites-move-btn"
                aria-label={`Bajar ${fav.label}`}
                onClick={() => move(fav.id, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="favorites-remove-btn"
                aria-label={`Quitar ${fav.label} de favoritos`}
                onClick={() => removeFavorite(fav.id)}
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>
      {filtered.length === 0 ? (
        <p className="favorites-empty">Sin coincidencias para &quot;{query}&quot;</p>
      ) : null}
    </div>
  );
}
