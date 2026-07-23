/**
 * PM-46 — Navigation Drawer (panel derecho).
 * Reemplaza el sidebar fijo. Solo presentación.
 */

import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { useExperienceCenterOptional } from '../../context/ExperienceCenterContext';
import {
  DEFAULT_EXPANDED_CATEGORIES,
  findNavItemByPath,
  type NavCategoryId,
  type NavItem,
} from '../../config/navigation';
import { NavIcon, SidebarChromeIcons } from './navIcons';
import { CenterSelector } from './CenterSelector';

function matchItemActive(pathname: string, item: NavItem): boolean {
  const match = findNavItemByPath(pathname);
  if (item.exact) return pathname === item.to || match?.id === item.id;
  return (
    match?.id === item.id ||
    pathname === item.to ||
    pathname.startsWith(`${item.to}/`)
  );
}

function roleLabel(role?: string): string {
  if (!role) return 'Usuario';
  const key = role.toLowerCase();
  const map: Record<string, string> = {
    admin: 'Administrador',
    administrator: 'Administrador',
    manager: 'Gerente',
    gerencia: 'Gerencia',
    operator: 'Operador',
    operador: 'Operador',
    viewer: 'Consulta',
    consultor: 'Consultor',
  };
  return map[key] ?? role.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function DrawerLink({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={item.to}
      end={item.exact ?? item.to === '/'}
      className={({ isActive }) => `nd-item${isActive ? ' is-active' : ''}`}
      onClick={onNavigate}
    >
      <span className="nd-item-icon">
        <NavIcon name={item.icon} size={16} />
      </span>
      <span className="nd-item-label">{item.label}</span>
    </NavLink>
  );
}

export function NavigationDrawer() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const experience = useExperienceCenterOptional();
  const {
    visibleCategories,
    collapsedGroups,
    toggleGroup,
    sidebarOpen,
    setSidebarOpen,
    favorites,
    removeFavorite,
    addRecentSearch,
  } = useNavigation();

  const [query, setQuery] = useState('');
  const open = sidebarOpen;

  const close = () => setSidebarOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('nd-drawer-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('nd-drawer-open');
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const searchableItems = useMemo(
    () => visibleCategories.flatMap((c) => c.items),
    [visibleCategories],
  );

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return searchableItems
      .filter((item) => {
        const hay = [item.label, ...(item.keywords ?? [])].join(' ').toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 12);
  }, [query, searchableItems]);

  const isGroupActive = (categoryId: NavCategoryId, items: NavItem[]) => {
    if (categoryId === 'home') {
      return location.pathname === '/operacion' || location.pathname === '/';
    }
    return items.some((item) => matchItemActive(location.pathname, item));
  };

  const packageLabel =
    experience?.packageId === 'coop-cafe-co'
      ? 'Cooperativa Cafetera'
      : 'Plataforma completa';
  const companyLabel = user?.organization?.name?.trim() || 'Empresa';
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Usuario';
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || 'U';
  const role = roleLabel(user?.roles?.[0]);

  const menuCategories = visibleCategories.filter((c) => c.id !== 'home' && c.id !== 'favorites');
  const homeItem = visibleCategories.find((c) => c.id === 'home')?.items[0];
  const favSorted = favorites.slice().sort((a, b) => a.order - b.order);

  return (
    <>
      <div
        className={`nd-overlay${open ? ' is-open' : ''}`}
        aria-hidden={!open}
        onClick={close}
      />
      <aside
        className={`nd-drawer${open ? ' is-open' : ''}`}
        aria-label="Navegación"
        aria-hidden={!open}
        role="dialog"
        aria-modal="true"
      >
        <header className="nd-drawer-header">
          <div className="nd-brand">
            <div className="nd-logo" aria-hidden>
              A
            </div>
            <div className="nd-brand-text">
              <strong className="nd-brand-name">AgroERP</strong>
              <span className="nd-brand-meta">{packageLabel}</span>
              <span className="nd-brand-meta">{companyLabel}</span>
            </div>
          </div>
          <button type="button" className="nd-icon-btn" aria-label="Cerrar menú" onClick={close}>
            <X size={18} strokeWidth={1.75} />
          </button>
        </header>

        <div className="nd-block">
          <CenterSelector />
        </div>

        <div className="nd-block nd-search">
          <label className="nd-search-field">
            <SidebarChromeIcons.search size={15} strokeWidth={1.75} className="nd-search-icon" />
            <input
              type="search"
              value={query}
              placeholder="Buscar…"
              aria-label="Buscar en el menú"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchResults[0]) {
                  addRecentSearch(query);
                  navigate(searchResults[0].to);
                  setQuery('');
                  close();
                }
              }}
            />
          </label>
        </div>

        <div className="nd-sep" aria-hidden />

        <nav className="nd-nav" aria-label="Menú principal">
          {query.trim() ? (
            <div className="nd-block">
              {searchResults.length === 0 ? (
                <p className="nd-empty">Sin coincidencias</p>
              ) : (
                searchResults.map((item) => (
                  <DrawerLink
                    key={item.id}
                    item={item}
                    onNavigate={() => {
                      addRecentSearch(query);
                      setQuery('');
                      close();
                    }}
                  />
                ))
              )}
            </div>
          ) : (
            <>
              {homeItem ? (
                <div className="nd-block">
                  <DrawerLink item={homeItem} onNavigate={close} />
                </div>
              ) : null}

              {menuCategories.map((category) => {
                const defaultCollapsed =
                  category.defaultCollapsed ??
                  !DEFAULT_EXPANDED_CATEGORIES.includes(category.id);
                const collapsed = collapsedGroups[category.id] ?? defaultCollapsed;
                const active = isGroupActive(category.id, category.items);
                const expanded = !collapsed;

                return (
                  <section
                    key={category.id}
                    className={`nd-group${active ? ' has-active' : ''}${expanded ? ' is-open' : ''}`}
                  >
                    <button
                      type="button"
                      className={`nd-group-toggle${active ? ' is-active' : ''}`}
                      aria-expanded={expanded}
                      onClick={() => toggleGroup(category.id)}
                    >
                      <span className="nd-group-label">{category.label}</span>
                      <span className="nd-group-chevron" aria-hidden>
                        {expanded ? (
                          <SidebarChromeIcons.chevronDown size={14} strokeWidth={1.75} />
                        ) : (
                          <SidebarChromeIcons.chevronRight size={14} strokeWidth={1.75} />
                        )}
                      </span>
                    </button>
                    <div className={`nd-group-items${expanded ? ' is-open' : ''}`}>
                      <div className="nd-group-items-inner">
                        {category.items.map((item) => (
                          <DrawerLink key={item.id} item={item} onNavigate={close} />
                        ))}
                      </div>
                    </div>
                  </section>
                );
              })}

              <div className="nd-sep" aria-hidden />

              <section className="nd-block nd-favorites" aria-label="Favoritos">
                <div className="nd-section-label">Favoritos</div>
                {favSorted.length === 0 ? (
                  <p className="nd-empty">Sin favoritos aún</p>
                ) : (
                  favSorted.map((fav) => (
                    <div key={fav.id} className="nd-fav-row">
                      <NavLink
                        to={fav.to}
                        className={({ isActive }) => `nd-item${isActive ? ' is-active' : ''}`}
                        onClick={close}
                      >
                        <span className="nd-item-icon">
                          <NavIcon name={fav.icon || 'star'} size={16} />
                        </span>
                        <span className="nd-item-label">{fav.label}</span>
                      </NavLink>
                      <button
                        type="button"
                        className="nd-fav-remove"
                        aria-label="Quitar favorito"
                        onClick={() => removeFavorite(fav.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </section>
            </>
          )}
        </nav>

        <div className="nd-sep" aria-hidden />

        <footer className="nd-footer">
          <div className="nd-user">
            <div className="nd-avatar" aria-hidden>
              {initials}
            </div>
            <div className="nd-profile">
              <strong className="nd-profile-name">{displayName}</strong>
              <span className="nd-profile-role">{role}</span>
            </div>
          </div>
          <button
            type="button"
            className="nd-logout"
            onClick={() => {
              close();
              void logout();
            }}
          >
            <LogOut size={15} strokeWidth={1.75} />
            <span>Salir</span>
          </button>
        </footer>
      </aside>
    </>
  );
}

/** Botón hamburguesa — esquina superior derecha del header */
export function NavMenuButton({ className = '' }: { className?: string }) {
  const { setSidebarOpen, sidebarOpen } = useNavigation();
  return (
    <button
      type="button"
      className={`nd-menu-btn ${className}`.trim()}
      aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
      aria-expanded={sidebarOpen}
      title="Menú"
      onClick={() => setSidebarOpen(!sidebarOpen)}
    >
      <SidebarChromeIcons.menu size={20} strokeWidth={1.75} />
    </button>
  );
}
