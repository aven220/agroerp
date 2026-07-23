/**
 * PM-42 — Sidebar fijo enterprise (250–280px), colapsable.
 * Sin buscador, sin bloque de usuario. Favoritos solo si hay ítems.
 */

import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useNavigation } from '../../context/NavigationContext';
import {
  DEFAULT_EXPANDED_CATEGORIES,
  findNavItemByPath,
  type NavCategoryId,
  type NavItem,
} from '../../config/navigation';
import { NavIcon, SidebarChromeIcons } from './navIcons';

function matchItemActive(pathname: string, item: NavItem): boolean {
  const match = findNavItemByPath(pathname);
  if (item.exact) return pathname === item.to || match?.id === item.id;
  return (
    match?.id === item.id ||
    pathname === item.to ||
    pathname.startsWith(`${item.to}/`)
  );
}

function SideLink({
  item,
  collapsed,
}: {
  item: NavItem;
  collapsed?: boolean;
}) {
  return (
    <NavLink
      to={item.to}
      end={item.exact ?? item.to === '/'}
      className={({ isActive }) => `esb-item${isActive ? ' is-active' : ''}`}
      title={collapsed ? item.label : undefined}
    >
      <span className="esb-item-icon">
        <NavIcon name={item.icon} size={16} />
      </span>
      {!collapsed ? <span className="esb-item-label">{item.label}</span> : null}
    </NavLink>
  );
}

/**
 * Sidebar fijo izquierdo — PM-42.
 */
export function EnterpriseSidebar() {
  const location = useLocation();
  const {
    visibleCategories,
    collapsedGroups,
    toggleGroup,
    sidebarCollapsed,
    setSidebarCollapsed,
    favorites,
    removeFavorite,
    sidebarScroll,
    setSidebarScroll,
  } = useNavigation();

  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = navRef.current;
    if (!el || sidebarScroll <= 0) return;
    el.scrollTop = sidebarScroll;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--sidebar-w', sidebarCollapsed ? '72px' : '264px');
    return () => {
      /* PM-42 mantiene el token vía CSS; no limpiar a 0 */
    };
  }, [sidebarCollapsed]);

  const menuCategories = visibleCategories.filter((c) => c.id !== 'home' && c.id !== 'favorites');
  const homeItem = visibleCategories.find((c) => c.id === 'home')?.items[0];
  const favSorted = favorites.slice().sort((a, b) => a.order - b.order);
  const showFavorites = favSorted.length > 0 && !sidebarCollapsed;

  const isGroupActive = (categoryId: NavCategoryId, items: NavItem[]) => {
    if (categoryId === 'home') {
      return location.pathname === '/operacion' || location.pathname === '/';
    }
    return items.some((item) => matchItemActive(location.pathname, item));
  };

  return (
    <aside
      className={`enterprise-sidebar enterprise-sidebar-pm42${sidebarCollapsed ? ' is-collapsed' : ''}`}
      aria-label="Navegación principal"
    >
      <div className="esb-toolbar">
        <button
          type="button"
          className="esb-collapse-btn"
          aria-label={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          title={sidebarCollapsed ? 'Expandir' : 'Colapsar'}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? (
            <SidebarChromeIcons.panelOpen size={18} strokeWidth={1.75} />
          ) : (
            <SidebarChromeIcons.panelClose size={18} strokeWidth={1.75} />
          )}
        </button>
        {!sidebarCollapsed ? <span className="esb-toolbar-label">Menú</span> : null}
      </div>

      <nav
        ref={navRef}
        className="esb-nav"
        aria-label="Módulos"
        onScroll={(e) => setSidebarScroll((e.target as HTMLElement).scrollTop)}
      >
        {homeItem ? (
          <div className="esb-home">
            <SideLink item={homeItem} collapsed={sidebarCollapsed} />
          </div>
        ) : null}

        {menuCategories.map((category) => {
          const defaultCollapsed =
            category.defaultCollapsed ?? !DEFAULT_EXPANDED_CATEGORIES.includes(category.id);
          const collapsed = collapsedGroups[category.id] ?? defaultCollapsed;
          const active = isGroupActive(category.id, category.items);
          const expanded = !collapsed && !sidebarCollapsed;

          return (
            <section
              key={category.id}
              className={`esb-group${active ? ' has-active' : ''}${expanded ? ' is-open' : ''}`}
            >
              <button
                type="button"
                className={`esb-group-toggle${active ? ' is-active' : ''}`}
                aria-expanded={expanded}
                title={sidebarCollapsed ? category.label : undefined}
                onClick={() => {
                  if (sidebarCollapsed) setSidebarCollapsed(false);
                  toggleGroup(category.id);
                }}
              >
                <span className="esb-group-icon" aria-hidden>
                  <NavIcon name={category.icon || category.id} size={16} />
                </span>
                {!sidebarCollapsed ? (
                  <>
                    <span className="esb-group-label">{category.label}</span>
                    <span className="esb-group-chevron" aria-hidden>
                      {expanded ? (
                        <SidebarChromeIcons.chevronDown size={14} strokeWidth={1.75} />
                      ) : (
                        <SidebarChromeIcons.chevronRight size={14} strokeWidth={1.75} />
                      )}
                    </span>
                  </>
                ) : null}
              </button>
              {expanded ? (
                <div className="esb-group-items">
                  {category.items.map((item) => (
                    <SideLink key={item.id} item={item} />
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}

        {showFavorites ? (
          <section className="esb-favorites" aria-label="Favoritos">
            <div className="esb-section-label">Favoritos</div>
            {favSorted.map((fav) => (
              <div key={fav.id} className="esb-fav-row">
                <NavLink
                  to={fav.to}
                  className={({ isActive }) => `esb-item${isActive ? ' is-active' : ''}`}
                >
                  <span className="esb-item-icon">
                    <NavIcon name={fav.icon || 'star'} size={16} />
                  </span>
                  <span className="esb-item-label">{fav.label}</span>
                </NavLink>
                <button
                  type="button"
                  className="esb-fav-remove"
                  aria-label="Quitar favorito"
                  onClick={() => removeFavorite(fav.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </section>
        ) : null}
      </nav>
    </aside>
  );
}
