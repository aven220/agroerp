import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_NAV_ITEMS, type NavItem } from '../../config/navigation';
import { useNavigation } from '../../context/NavigationContext';
import { useAuth } from '../../context/AuthContext';
import { useExperienceCenterOptional } from '../../context/ExperienceCenterContext';
import { canAccessPath } from '../../config/routePermissions';
import {
  groupSearchHits,
  searchEnterpriseEntities,
  type EnterpriseSearchHit,
} from '../../lib/enterpriseSearch';

const TYPE_LABELS: Record<string, string> = {
  screen: 'Pantallas',
  module: 'Áreas',
  process: 'Procesos',
  report: 'Reportes',
  config: 'Configuración',
};

type FlatResult =
  | { type: 'nav'; item: NavItem }
  | { type: 'entity'; hit: EnterpriseSearchHit };

/**
 * PM-28/31 — Búsqueda global: pantallas del paquete + registros (APIs existentes).
 */
export function GlobalSearch() {
  const { searchOpen, setSearchOpen, addRecentSearch, recentSearches, filterNavItem, favorites } = useNavigation();
  const { hasPermission } = useAuth();
  const experience = useExperienceCenterOptional();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [entityHits, setEntityHits] = useState<EnterpriseSearchHit[]>([]);
  const [searchingEntities, setSearchingEntities] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const packageNavPool = useMemo(() => {
    if (experience?.packageId === 'coop-cafe-co' && experience.experienceNav?.length) {
      const seen = new Set<string>();
      const items: NavItem[] = [];
      for (const cat of experience.experienceNav) {
        for (const navItem of cat.items) {
          if (seen.has(navItem.id)) continue;
          seen.add(navItem.id);
          items.push(navItem);
        }
      }
      return items;
    }
    return ALL_NAV_ITEMS;
  }, [experience?.packageId, experience?.experienceNav]);

  useEffect(() => {
    if (searchOpen) {
      setQuery('');
      setActiveIdx(0);
      setEntityHits([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  useEffect(() => {
    const q = query.trim();
    if (!searchOpen || q.length < 2) {
      setEntityHits([]);
      setSearchingEntities(false);
      return;
    }
    let cancelled = false;
    setSearchingEntities(true);
    const timer = window.setTimeout(() => {
      searchEnterpriseEntities(q, { hasPermission }).then((hits) => {
        if (cancelled) return;
        setEntityHits(hits);
        setSearchingEntities(false);
      });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, searchOpen, hasPermission]);

  const navResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = packageNavPool.filter((item) => {
      if (item.permission && !hasPermission(item.permission)) return false;
      return filterNavItem(item);
    });
    if (!q) return pool.slice(0, 12);
    return pool
      .map((item) => {
        const hay = [item.label, item.to, ...(item.keywords ?? [])].join(' ').toLowerCase();
        const score = hay.includes(q) ? (item.label.toLowerCase().startsWith(q) ? 3 : hay.startsWith(q) ? 2 : 1) : 0;
        return { item, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 16)
      .map((r) => r.item);
  }, [query, hasPermission, filterNavItem, packageNavPool]);

  const groupedNav = useMemo(() => {
    const map = new Map<string, NavItem[]>();
    for (const item of navResults) {
      const type = item.searchType ?? 'screen';
      const list = map.get(type) ?? [];
      list.push(item);
      map.set(type, list);
    }
    return map;
  }, [navResults]);

  const groupedEntities = useMemo(() => groupSearchHits(entityHits), [entityHits]);

  const flatResults = useMemo((): FlatResult[] => {
    const entities: FlatResult[] = entityHits.map((hit) => ({ type: 'entity', hit }));
    const nav: FlatResult[] = navResults.map((item) => ({ type: 'nav', item }));
    return [...entities, ...nav];
  }, [entityHits, navResults]);

  const favoriteResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...favorites]
      .filter((f) => canAccessPath(f.to, hasPermission))
      .sort((a, b) => a.order - b.order);
    if (!q) return sorted.slice(0, 8);
    return sorted.filter((f) => f.label.toLowerCase().includes(q) || f.to.toLowerCase().includes(q));
  }, [favorites, query, hasPermission]);

  const openNav = (item: NavItem) => {
    addRecentSearch(item.label);
    setSearchOpen(false);
    navigate(item.to);
  };

  const openEntity = (hit: EnterpriseSearchHit) => {
    addRecentSearch(hit.label);
    setSearchOpen(false);
    navigate(hit.to);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSearchOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, Math.max(flatResults.length - 1, 0)));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter' && flatResults[activeIdx]) {
      e.preventDefault();
      const r = flatResults[activeIdx];
      if (r.type === 'nav') openNav(r.item);
      else openEntity(r.hit);
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
          <span className="global-search-icon" aria-hidden>
            ⌕
          </span>
          <input
            ref={inputRef}
            type="search"
            className="global-search-input"
            placeholder="Buscar productores, fincas, lotes, compras, pantallas…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={onKeyDown}
            aria-label="Búsqueda global"
            autoComplete="off"
          />
          <kbd className="global-search-kbd" aria-hidden>
            ESC
          </kbd>
        </div>

        {!query && recentSearches.length > 0 ? (
          <div className="global-search-section">
            <div className="global-search-section-title">Búsquedas recientes</div>
            <div className="global-search-chips">
              {recentSearches.map((s) => (
                <button key={s} type="button" className="global-search-chip" onClick={() => setQuery(s)}>
                  {s}
                </button>
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
          {query.trim().length >= 2 && searchingEntities ? (
            <p className="global-search-empty muted">Buscando registros…</p>
          ) : null}

          {flatResults.length === 0 && query.trim().length >= 2 && !searchingEntities ? (
            <p className="global-search-empty">
              Sin resultados para &quot;{query}&quot;. Pruebe un nombre de productor, finca, lote o pantalla.
            </p>
          ) : null}

          {Array.from(groupedEntities.entries()).map(([kindLabel, hits]) => (
            <div key={kindLabel} className="global-search-group">
              <div className="global-search-section-title">{kindLabel}</div>
              {hits.map((hit) => {
                const idx = flatResults.findIndex((r) => r.type === 'entity' && r.hit.id === hit.id);
                return (
                  <button
                    key={hit.id}
                    type="button"
                    role="option"
                    aria-selected={idx === activeIdx}
                    className={`global-search-result${idx === activeIdx ? ' active' : ''}`}
                    onClick={() => openEntity(hit)}
                    onMouseEnter={() => setActiveIdx(idx)}
                  >
                    <span className="global-search-result-icon">{hit.icon}</span>
                    <span>
                      <strong>{hit.label}</strong>
                      <small>{hit.subtitle ?? hit.kindLabel}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}

          {Array.from(groupedNav.entries()).map(([type, items]) => (
            <div key={type} className="global-search-group">
              <div className="global-search-section-title">{TYPE_LABELS[type] ?? type}</div>
              {items.map((item) => {
                const idx = flatResults.findIndex((r) => r.type === 'nav' && r.item.id === item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={idx === activeIdx}
                    className={`global-search-result${idx === activeIdx ? ' active' : ''}`}
                    onClick={() => openNav(item)}
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
          ))}
        </div>
      </div>
    </div>
  );
}
