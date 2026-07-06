import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_NAV_ITEMS, type NavItem } from '../../config/navigation';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';

const TYPE_LABELS: Record<string, string> = {
  screen: 'Pantallas',
  module: 'Módulos',
  process: 'Procesos',
  report: 'Reportes',
  config: 'Configuración',
};

export function GlobalSearch() {
  const { searchOpen, setSearchOpen, addRecentSearch, recentSearches, filterNavItem, favorites } = useNavigation();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = ALL_NAV_ITEMS.filter((item) => {
      if (item.permission && !hasPermission(item.permission)) return false;
      return filterNavItem(item);
    });
    if (!q) return pool.slice(0, 20);
    return pool
      .map((item) => {
        const hay = [
          item.label,
          item.to,
          ...(item.keywords ?? []),
        ].join(' ').toLowerCase();
        const score = hay.includes(q) ? (item.label.toLowerCase().startsWith(q) ? 3 : hay.startsWith(q) ? 2 : 1) : 0;
        return { item, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 24)
      .map((r) => r.item);
  }, [query, hasPermission, filterNavItem]);

  const grouped = useMemo(() => {
    const map = new Map<string, NavItem[]>();
    for (const item of results) {
      const type = item.searchType ?? 'screen';
      const list = map.get(type) ?? [];
      list.push(item);
      map.set(type, list);
    }
    return map;
  }, [results]);

  const flatResults = useMemo(() => results, [results]);

  const favoriteResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...favorites].sort((a, b) => a.order - b.order);
    if (!q) return sorted.slice(0, 8);
    return sorted.filter((f) => f.label.toLowerCase().includes(q) || f.to.toLowerCase().includes(q));
  }, [favorites, query]);

  const open = (item: NavItem) => {
    addRecentSearch(item.label);
    setSearchOpen(false);
    navigate(item.to);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSearchOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, flatResults.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter' && flatResults[activeIdx]) {
      e.preventDefault();
      open(flatResults[activeIdx]);
    }
  };

  if (!searchOpen) return null;

  return (
    <div className="global-search-overlay" role="presentation" onClick={() => setSearchOpen(false)}>
      <div
        className="global-search-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Búsqueda global"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="global-search-input-wrap">
          <span className="global-search-icon" aria-hidden>⌕</span>
          <input
            ref={inputRef}
            type="search"
            className="global-search-input"
            placeholder="Buscar pantallas, módulos, procesos, reportes..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
            onKeyDown={onKeyDown}
            aria-label="Búsqueda global"
            autoComplete="off"
          />
          <kbd className="global-search-kbd" aria-hidden>ESC</kbd>
        </div>

        {!query && recentSearches.length > 0 ? (
          <div className="global-search-section">
            <div className="global-search-section-title">Búsquedas recientes</div>
            <div className="global-search-chips">
              {recentSearches.map((s) => (
                <button key={s} type="button" className="global-search-chip" onClick={() => setQuery(s)}>{s}</button>
              ))}
            </div>
          </div>
        ) : null}

        {!query && favoriteResults.length > 0 ? (
          <div className="global-search-section">
            <div className="global-search-section-title">Favoritos</div>
            <div className="global-search-chips">
              {favoriteResults.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="global-search-chip"
                  onClick={() => {
                    addRecentSearch(f.label);
                    setSearchOpen(false);
                    navigate(f.to);
                  }}
                >
                  {f.icon} {f.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="global-search-results" role="listbox">
          {flatResults.length === 0 ? (
            <p className="global-search-empty">Sin resultados para &quot;{query}&quot;</p>
          ) : (
            Array.from(grouped.entries()).map(([type, items]) => (
              <div key={type} className="global-search-group">
                <div className="global-search-section-title">{TYPE_LABELS[type] ?? type}</div>
                {items.map((item) => {
                  const idx = flatResults.indexOf(item);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={idx === activeIdx}
                      className={`global-search-result${idx === activeIdx ? ' active' : ''}`}
                      onClick={() => open(item)}
                      onMouseEnter={() => setActiveIdx(idx)}
                    >
                      <span className="global-search-result-icon">{item.icon}</span>
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.to}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
