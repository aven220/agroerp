import { useEffect, useMemo, useState } from 'react';
import { FORM_STUDIO_TEMPLATES, getTemplatesByCategory, type FormStudioTemplate } from './form-templates-library';

const FAVORITES_KEY = 'form-studio-template-favorites';
const RECENT_KEY = 'form-studio-template-recent';

const CATEGORY_ICONS: Record<string, string> = {
  'Registro agrícola': '🌱',
  'Calidad y certificación': '✓',
  'Logística y compras': '📦',
  'Recursos humanos': '👥',
  'Operaciones de campo': '📋',
  General: '📄',
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (template: FormStudioTemplate) => void;
}

export function TemplateLibraryModal({ open, onClose, onSelect }: Props) {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => loadJson(FAVORITES_KEY, []));
  const [recent, setRecent] = useState<string[]>(() => loadJson(RECENT_KEY, []));
  const byCategory = useMemo(() => getTemplatesByCategory(), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const categories = Array.from(byCategory.keys());

  const filter = (t: FormStudioTemplate) => {
    const matchQ =
      !q ||
      t.name.toLowerCase().includes(q.toLowerCase()) ||
      t.description.toLowerCase().includes(q.toLowerCase()) ||
      t.tags.some((tag) => tag.includes(q.toLowerCase()));
    const matchCat = !category || t.category === category;
    return matchQ && matchCat;
  };

  const allFiltered = FORM_STUDIO_TEMPLATES.filter(filter);
  const favoriteTemplates = FORM_STUDIO_TEMPLATES.filter((t) => favorites.includes(t.templateKey) && filter(t));
  const recentTemplates = recent
    .map((key) => FORM_STUDIO_TEMPLATES.find((t) => t.templateKey === key))
    .filter((t): t is FormStudioTemplate => Boolean(t && filter(t)));

  function handleSelect(t: FormStudioTemplate) {
    const nextRecent = [t.templateKey, ...recent.filter((k) => k !== t.templateKey)].slice(0, 6);
    setRecent(nextRecent);
    localStorage.setItem(RECENT_KEY, JSON.stringify(nextRecent));
    onSelect(t);
    onClose();
  }

  function toggleFavorite(key: string) {
    const next = favorites.includes(key)
      ? favorites.filter((k) => k !== key)
      : [...favorites, key];
    setFavorites(next);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  }

  function renderCard(t: FormStudioTemplate) {
    const icon = CATEGORY_ICONS[t.category] ?? '📋';
    const isFav = favorites.includes(t.templateKey);
    return (
      <article key={t.templateKey} className="fs-template-card">
        <button
          type="button"
          className={`fs-template-fav${isFav ? ' active' : ''}`}
          onClick={(e) => { e.stopPropagation(); toggleFavorite(t.templateKey); }}
          aria-label={isFav ? 'Quitar de favoritos' : 'Marcar favorito'}
        >
          {isFav ? '★' : '☆'}
        </button>
        <button type="button" className="fs-template-card-body" onClick={() => handleSelect(t)}>
          <div className="fs-template-thumb" aria-hidden>{icon}</div>
          <div className="fs-template-info">
            <strong>{t.name}</strong>
            <span className="muted">{t.description}</span>
            <span className="fs-template-meta">
              {t.schema.fields?.length ?? 0} campos · {t.category}
            </span>
          </div>
        </button>
      </article>
    );
  }

  return (
    <div className="fs-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="fs-template-title">
      <div className="fs-modal fs-template-modal">
        <header className="fs-modal-header">
          <div>
            <h2 id="fs-template-title">Galería de plantillas</h2>
            <p className="muted">Comience con un modelo probado y adáptelo a su proceso.</p>
          </div>
          <button type="button" className="fs-modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </header>

        <div className="fs-template-toolbar">
          <input
            className="fs-template-search"
            placeholder="Buscar plantilla…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar plantilla"
          />
          <div className="fs-template-categories" role="tablist" aria-label="Categorías">
            <button
              type="button"
              className={`fs-template-cat${!category ? ' active' : ''}`}
              onClick={() => setCategory('')}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`fs-template-cat${category === cat ? ' active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {CATEGORY_ICONS[cat] ?? '📋'} {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="fs-template-body">
          {favoriteTemplates.length > 0 ? (
            <section>
              <h3 className="fs-template-section-title">★ Favoritas</h3>
              <div className="fs-template-grid">{favoriteTemplates.map(renderCard)}</div>
            </section>
          ) : null}

          {recentTemplates.length > 0 && !q ? (
            <section>
              <h3 className="fs-template-section-title">Recientes</h3>
              <div className="fs-template-grid">{recentTemplates.map(renderCard)}</div>
            </section>
          ) : null}

          {category || q ? (
            <section>
              <h3 className="fs-template-section-title">
                {allFiltered.length} resultado{allFiltered.length === 1 ? '' : 's'}
              </h3>
              <div className="fs-template-grid">
                {allFiltered.length ? allFiltered.map(renderCard) : (
                  <p className="muted fs-template-empty">No hay plantillas que coincidan con su búsqueda.</p>
                )}
              </div>
            </section>
          ) : (
            Array.from(byCategory.entries()).map(([cat, templates]) => {
              const items = templates.filter(filter);
              if (!items.length) return null;
              return (
                <section key={cat}>
                  <h3 className="fs-template-section-title">
                    {CATEGORY_ICONS[cat] ?? '📋'} {cat}
                  </h3>
                  <div className="fs-template-grid">{items.map(renderCard)}</div>
                </section>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
