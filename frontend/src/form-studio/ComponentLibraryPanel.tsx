import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  STUDIO_COMPONENTS,
  getComponentsByGroup,
  type StudioComponentDef,
} from './form-field-catalog';
import type { FormFieldDefinition } from '../api/forms';
import { GROUP_DISPLAY_LABELS } from './studio-labels';

const FAVORITES_KEY = 'form-studio-favorites';
const RECENT_KEY = 'form-studio-recent';
const COLLAPSED_KEY = 'form-studio-collapsed-groups';
const MAX_RECENT = 8;

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

interface Props {
  onAdd: (field: FormFieldDefinition) => void;
  selectedType?: string;
}

const ComponentButton = memo(function ComponentButton({
  comp,
  selected,
  isFavorite,
  onAdd,
  onToggleFavorite,
  onLearn,
}: {
  comp: StudioComponentDef;
  selected: boolean;
  isFavorite: boolean;
  onAdd: () => void;
  onToggleFavorite: () => void;
  onLearn: () => void;
}) {
  return (
    <div className="fs-tool-item-wrap">
      <button
        type="button"
        className={`fs-tool-item${selected ? ' selected' : ''}`}
        onClick={onAdd}
        title={`Agregar ${comp.label}`}
      >
        <span className="fs-tool-item-icon" aria-hidden>{comp.icon ?? '▢'}</span>
        <span className="fs-tool-item-label">{comp.label}</span>
      </button>
      <button
        type="button"
        className={`fs-tool-fav${isFavorite ? ' active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        title={isFavorite ? 'Quitar de favoritos' : 'Favorito'}
      >
        {isFavorite ? '★' : '☆'}
      </button>
      <button
        type="button"
        className="fs-tool-learn"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onLearn();
        }}
        aria-label={`Ayuda sobre ${comp.label}`}
        title="Ver ayuda"
      >
        ?
      </button>
    </div>
  );
});

export const ComponentLibraryPanel = memo(function ComponentLibraryPanel({
  onAdd,
  selectedType,
}: Props) {
  const [search, setSearch] = useState('');
  const [learning, setLearning] = useState<StudioComponentDef | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => loadJson(FAVORITES_KEY, []));
  const [recent, setRecent] = useState<string[]>(() => loadJson(RECENT_KEY, []));
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
    loadJson(COLLAPSED_KEY, {}),
  );

  const groups = useMemo(() => getComponentsByGroup(), []);

  const filtered = useMemo(
    () =>
      STUDIO_COMPONENTS.filter(
        (c) =>
          !search ||
          c.label.toLowerCase().includes(search.toLowerCase()) ||
          c.description.toLowerCase().includes(search.toLowerCase()) ||
          c.group.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  );

  const favoriteComponents = useMemo(
    () => STUDIO_COMPONENTS.filter((c) => favorites.includes(c.id) && filtered.includes(c)),
    [favorites, filtered],
  );

  const recentComponents = useMemo(
    () =>
      recent
        .map((id) => STUDIO_COMPONENTS.find((c) => c.id === id))
        .filter((c): c is StudioComponentDef => Boolean(c && filtered.includes(c))),
    [recent, filtered],
  );

  useEffect(() => {
    saveJson(FAVORITES_KEY, favorites);
  }, [favorites]);

  useEffect(() => {
    saveJson(RECENT_KEY, recent);
  }, [recent]);

  useEffect(() => {
    saveJson(COLLAPSED_KEY, collapsed);
  }, [collapsed]);

  const handleAdd = useCallback(
    (comp: StudioComponentDef) => {
      onAdd(comp.createField(Date.now()));
      setRecent((prev) => [comp.id, ...prev.filter((id) => id !== comp.id)].slice(0, MAX_RECENT));
    },
    [onAdd],
  );

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const toggleGroup = useCallback((group: string) => {
    setCollapsed((prev) => ({ ...prev, [group]: !prev[group] }));
  }, []);

  function renderComponentList(items: StudioComponentDef[]) {
    return (
      <div className="fs-tool-grid">
        {items.map((comp) => (
          <ComponentButton
            key={comp.id}
            comp={comp}
            selected={selectedType === comp.type}
            isFavorite={favorites.includes(comp.id)}
            onAdd={() => handleAdd(comp)}
            onToggleFavorite={() => toggleFavorite(comp.id)}
            onLearn={() => setLearning(comp)}
          />
        ))}
      </div>
    );
  }

  return (
    <aside className="fs-toolbox" aria-label="Biblioteca de componentes">
      <header className="fs-toolbox-header">
        <h2 className="fs-toolbox-title">Componentes</h2>
        <input
          className="fs-toolbox-search"
          placeholder="Buscar…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar componente"
        />
      </header>

      <div className="fs-toolbox-body">
        {favoriteComponents.length > 0 ? (
          <section className="fs-tool-group">
            <h3 className="fs-tool-group-title">
              <span aria-hidden>★</span> Favoritos
            </h3>
            {renderComponentList(favoriteComponents)}
          </section>
        ) : null}

        {recentComponents.length > 0 && !search ? (
          <section className="fs-tool-group">
            <h3 className="fs-tool-group-title">Recientes</h3>
            {renderComponentList(recentComponents)}
          </section>
        ) : null}

        {Array.from(groups.entries()).map(([group, items]) => {
          const visible = items.filter((c) => filtered.includes(c));
          if (!visible.length) return null;
          const isCollapsed = collapsed[group] ?? false;
          const displayName = GROUP_DISPLAY_LABELS[group] ?? group;
          return (
            <section key={group} className="fs-tool-group">
              <button
                type="button"
                className="fs-tool-group-toggle"
                onClick={() => toggleGroup(group)}
                aria-expanded={!isCollapsed}
              >
                <span className="fs-tool-group-chevron" aria-hidden>{isCollapsed ? '▸' : '▾'}</span>
                <span>{displayName}</span>
                <span className="fs-tool-group-count">{visible.length}</span>
              </button>
              {!isCollapsed ? renderComponentList(visible) : null}
            </section>
          );
        })}
      </div>

      {learning ? (
        <div className="fs-tool-learning" role="dialog" aria-label={`Ayuda: ${learning.label}`}>
          <header className="fs-tool-learning-header">
            <h4>{learning.label}</h4>
            <button type="button" className="fs-tool-learning-close" onClick={() => setLearning(null)} aria-label="Cerrar ayuda">×</button>
          </header>
          <p>{learning.description}</p>
          <p><strong>Cuándo usarlo:</strong> {learning.useCases.join(' · ')}</p>
          <p><strong>Consejo:</strong> {learning.configTips.join(' · ')}</p>
          <p className="muted"><strong>Evite:</strong> {learning.commonErrors.join(' · ')}</p>
          <button type="button" className="fs-action-btn fs-action-primary" onClick={() => { handleAdd(learning); setLearning(null); }}>
            Agregar al formulario
          </button>
        </div>
      ) : null}
    </aside>
  );
});
