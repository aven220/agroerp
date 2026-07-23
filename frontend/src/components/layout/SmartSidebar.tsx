/**
 * PM-43 — Enterprise Sidebar (estructura visual limpia).
 * Solo presentación. Permisos / rutas / packageAccess intactos.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { useExperienceCenterOptional } from '../../context/ExperienceCenterContext';
import {
  DEFAULT_EXPANDED_CATEGORIES,
  findNavItemByPath,
  type NavCategoryId,
  type NavItem,
} from '../../config/navigation';
import { LogOut } from 'lucide-react';
import { NavIcon, SidebarChromeIcons } from './navIcons';
import { CenterSelector } from './CenterSelector';

function matchItemActive(pathname: string, item: NavItem): boolean {
  const match = findNavItemByPath(pathname);
  if (item.exact) {
    return pathname === item.to || match?.id === item.id;
  }
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

function NavItemLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={item.to}
      end={item.exact ?? item.to === '/'}
      className={({ isActive }) => `esb-item${isActive ? ' is-active' : ''}`}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
    >
      <span className="esb-item-icon">
        <NavIcon name={item.icon} size={18} />
      </span>
      {!collapsed ? <span className="esb-item-label">{item.label}</span> : null}
    </NavLink>
  );
}

export function SmartSidebar() {
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
    sidebarCollapsed,
    setSidebarCollapsed,
    sidebarScroll,
    setSidebarScroll,
    setSearchOpen,
    addRecentSearch,
  } = useNavigation();

  const navRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState('');

  const closeMobile = () => setSidebarOpen(false);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--sidebar-w', sidebarCollapsed ? '72px' : '280px');
    root.classList.toggle('esb-rail', sidebarCollapsed);
    return () => {
      root.classList.remove('esb-rail');
    };
  }, [sidebarCollapsed]);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    el.scrollTop = sidebarScroll;
  }, [sidebarScroll]);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const onScroll = () => setSidebarScroll(el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [setSidebarScroll]);

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

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Usuario';
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || 'U';
  const role = roleLabel(user?.roles?.[0]);

  const menuCategories = visibleCategories.filter((c) => c.id !== 'home' && c.id !== 'favorites');
  const homeItem = visibleCategories.find((c) => c.id === 'home')?.items[0];
  const rail = sidebarCollapsed;

  return (
    <>
      <button
        type="button"
        className="esb-mobile-toggle"
        aria-label="Abrir menú de navegación"
        onClick={() => setSidebarOpen(true)}
      >
        <SidebarChromeIcons.menu size={20} strokeWidth={1.75} />
      </button>

      {sidebarOpen ? (
        <button
          type="button"
          className="esb-backdrop"
          aria-label="Cerrar menú"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={[
          'sidebar',
          'enterprise-sidebar',
          'enterprise-sidebar-pm43',
          sidebarOpen ? 'is-open' : '',
          rail ? 'is-collapsed' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="Navegación principal"
      >
        <header className="esb-header">
          <div className="esb-brand">
            <div className="esb-logo" aria-hidden>
              <span>A</span>
            </div>
            {!rail ? (
              <div className="esb-brand-text">
                <strong className="esb-brand-name">AgroERP</strong>
                <span className="esb-brand-package">{packageLabel}</span>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="esb-icon-btn esb-collapse-btn"
            aria-label={rail ? 'Expandir menú' : 'Colapsar menú'}
            title={rail ? 'Expandir' : 'Colapsar'}
            onClick={() => setSidebarCollapsed(!rail)}
          >
            {rail ? (
              <SidebarChromeIcons.panelOpen size={18} strokeWidth={1.75} />
            ) : (
              <SidebarChromeIcons.panelClose size={18} strokeWidth={1.75} />
            )}
          </button>
          <button
            type="button"
            className="esb-icon-btn esb-close-mobile"
            aria-label="Cerrar menú"
            onClick={() => setSidebarOpen(false)}
          >
            ×
          </button>
        </header>

        {!rail ? (
          <div className="esb-center">
            <CenterSelector />
          </div>
        ) : null}

        <div className="esb-search">
          {rail ? (
            <button
              type="button"
              className="esb-icon-btn esb-search-rail"
              aria-label="Buscar"
              title="Buscar"
              onClick={() => {
                setSidebarCollapsed(false);
                setSearchOpen(true);
              }}
            >
              <SidebarChromeIcons.search size={18} strokeWidth={1.75} />
            </button>
          ) : (
            <label className="esb-search-field">
              <SidebarChromeIcons.search size={16} strokeWidth={1.75} className="esb-search-icon" />
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
                    closeMobile();
                  }
                }}
              />
            </label>
          )}
        </div>

        <nav ref={navRef} className="esb-nav sidebar-nav" aria-label="Menú enterprise">
          {!rail && query.trim() ? (
            <div className="esb-search-results">
              {searchResults.length === 0 ? (
                <p className="esb-empty">Sin coincidencias</p>
              ) : (
                searchResults.map((item) => (
                  <NavItemLink
                    key={item.id}
                    item={item}
                    collapsed={false}
                    onNavigate={() => {
                      addRecentSearch(query);
                      setQuery('');
                      closeMobile();
                    }}
                  />
                ))
              )}
            </div>
          ) : (
            <>
              {homeItem ? (
                <div className="esb-home">
                  <NavItemLink item={homeItem} collapsed={rail} onNavigate={closeMobile} />
                </div>
              ) : null}

              {menuCategories.map((category) => {
                const defaultCollapsed =
                  category.defaultCollapsed ??
                  !DEFAULT_EXPANDED_CATEGORIES.includes(category.id);
                const collapsed = collapsedGroups[category.id] ?? defaultCollapsed;
                const active = isGroupActive(category.id, category.items);
                const open = !collapsed;

                if (rail) {
                  return (
                    <div
                      key={category.id}
                      className={`esb-group esb-group-rail${active ? ' has-active' : ''}`}
                    >
                      <button
                        type="button"
                        className={`esb-group-toggle${active ? ' is-active' : ''}`}
                        title={category.label}
                        aria-label={category.label}
                        onClick={() => {
                          setSidebarCollapsed(false);
                          if (collapsed) toggleGroup(category.id);
                        }}
                      >
                        <NavIcon name={category.icon} size={18} />
                      </button>
                    </div>
                  );
                }

                return (
                  <section
                    key={category.id}
                    className={`esb-group${active ? ' has-active' : ''}${open ? ' is-open' : ''}`}
                  >
                    <button
                      type="button"
                      className={`esb-group-toggle${active ? ' is-active' : ''}`}
                      aria-expanded={open}
                      onClick={() => toggleGroup(category.id)}
                    >
                      <span className="esb-group-label">{category.label}</span>
                      <span className="esb-group-chevron" aria-hidden>
                        {open ? (
                          <SidebarChromeIcons.chevronDown size={16} strokeWidth={1.75} />
                        ) : (
                          <SidebarChromeIcons.chevronRight size={16} strokeWidth={1.75} />
                        )}
                      </span>
                    </button>
                    {open ? (
                      <div className="esb-group-items">
                        {category.items.map((item) => (
                          <NavItemLink
                            key={item.id}
                            item={item}
                            collapsed={false}
                            onNavigate={closeMobile}
                          />
                        ))}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </>
          )}
        </nav>

        <footer className="esb-footer">
          <div className="esb-user">
            <div className="esb-avatar" aria-hidden>
              {initials}
            </div>
            {!rail ? (
              <div className="esb-profile">
                <strong className="esb-profile-name">{displayName}</strong>
                <span className="esb-profile-role">{role}</span>
              </div>
            ) : (
              <span className="sr-only">{displayName}, {role}</span>
            )}
          </div>
          <button
            type="button"
            className="esb-logout"
            title="Salir"
            aria-label="Salir"
            onClick={() => void logout()}
          >
            <LogOut size={16} strokeWidth={1.75} />
            {!rail ? <span>Salir</span> : null}
          </button>
        </footer>
      </aside>
    </>
  );
}
