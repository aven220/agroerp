import { useEffect, useRef, useState } from 'react';
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

function NavLinkItem({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const { addFavorite, removeFavorite, isFavorite } = useNavigation();
  const navigate = useNavigate();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fav = isFavorite(item.id);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  return (
    <div
      className="nav-item-row"
      onContextMenu={(e) => {
        e.preventDefault();
        setMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      <NavLink
        to={item.to}
        end={item.exact ?? item.to === '/'}
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        onClick={onNavigate}
      >
        <span className="nav-icon" aria-hidden>{item.icon}</span>
        <span className="nav-label">{item.label}</span>
      </NavLink>
      {item.id !== 'nav-inicio' ? (
        <button
          type="button"
          className={`nav-fav-btn${fav ? ' active' : ''}`}
          title={fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          aria-label={fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (fav) removeFavorite(item.id);
            else addFavorite(item);
          }}
        >
          {fav ? '★' : '☆'}
        </button>
      ) : null}

      {menu ? (
        <div
          ref={menuRef}
          className="nav-context-menu"
          role="menu"
          style={{ top: menu.y, left: menu.x }}
        >
          <button
            type="button"
            role="menuitem"
            className="nav-context-item"
            onClick={() => {
              navigate(item.to);
              setMenu(null);
              onNavigate?.();
            }}
          >
            Abrir
          </button>
          {item.id !== 'nav-inicio' ? (
            <button
              type="button"
              role="menuitem"
              className="nav-context-item"
              onClick={() => {
                if (fav) removeFavorite(item.id);
                else addFavorite(item);
                setMenu(null);
              }}
            >
              {fav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="nav-context-item"
            onClick={() => {
              void navigator.clipboard?.writeText(window.location.origin + item.to);
              setMenu(null);
            }}
          >
            Copiar enlace
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function SmartSidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const experience = useExperienceCenterOptional();
  const {
    visibleCategories,
    collapsedGroups,
    toggleGroup,
    sidebarOpen,
    setSidebarOpen,
    sidebarScroll,
    setSidebarScroll,
  } = useNavigation();
  const navRef = useRef<HTMLElement>(null);

  const closeMobile = () => setSidebarOpen(false);

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

  const isGroupActive = (categoryId: NavCategoryId, items: NavItem[]) => {
    if (categoryId === 'home') {
      return location.pathname === '/operacion' || location.pathname === '/';
    }
    return items.some((item) => {
      const match = findNavItemByPath(location.pathname);
      if (item.exact) {
        return location.pathname === item.to || match?.id === item.id;
      }
      return (
        match?.id === item.id ||
        location.pathname === item.to ||
        location.pathname.startsWith(`${item.to}/`)
      );
    });
  };

  const packageLabel =
    experience?.packageId === 'coop-cafe-co'
      ? 'Cooperativa cafetera'
      : 'Plataforma completa';

  return (
    <>
      <button
        type="button"
        className="sidebar-mobile-toggle"
        aria-label="Abrir menú de navegación"
        onClick={() => setSidebarOpen(true)}
      >
        ☰
      </button>
      {sidebarOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Cerrar menú"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <aside className={`sidebar smart-sidebar${sidebarOpen ? ' open' : ''}`} aria-label="Navegación principal">
        <div className="sidebar-brand">
          <div className="brand-logo" aria-hidden>A</div>
          <div className="sidebar-brand-text">
            <strong className="sidebar-brand-name">AGROERP</strong>
            <span className="sidebar-brand-sub">{packageLabel}</span>
          </div>
          <button
            type="button"
            className="sidebar-close-mobile"
            aria-label="Cerrar menú"
            onClick={() => setSidebarOpen(false)}
          >
            ×
          </button>
        </div>

        <nav ref={navRef} className="sidebar-nav" aria-label="Menú por experiencias">
          {visibleCategories.map((category) => {
            const defaultCollapsed =
              category.defaultCollapsed ?? !DEFAULT_EXPANDED_CATEGORIES.includes(category.id);
            const collapsed = collapsedGroups[category.id] ?? defaultCollapsed;
            const active = isGroupActive(category.id, category.items);
            const isSingle = category.items.length === 1 && category.id === 'home';

            if (isSingle) {
              return (
                <div key={category.id} className="nav-category nav-category-single">
                  <NavLinkItem item={category.items[0]} onNavigate={closeMobile} />
                </div>
              );
            }

            return (
              <div
                key={category.id}
                className={`nav-category${active ? ' has-active' : ''}${collapsed ? '' : ' is-open'}`}
              >
                <button
                  type="button"
                  className={`nav-category-header${collapsed ? ' collapsed' : ''}${active ? ' active' : ''}`}
                  aria-expanded={!collapsed}
                  onClick={() => toggleGroup(category.id)}
                >
                  <span className="nav-category-icon" aria-hidden>{category.icon}</span>
                  <span className="nav-category-label">{category.label}</span>
                  {!category.hideCount && category.items.length > 0 ? (
                    <span className="nav-category-count" aria-hidden>{category.items.length}</span>
                  ) : null}
                  <span className="nav-category-chevron" aria-hidden>{collapsed ? '▸' : '▾'}</span>
                </button>
                <div className={`nav-category-items${collapsed ? ' collapsed' : ''}`}>
                  {category.items.map((item) => (
                    <NavLinkItem key={item.id} item={item} onNavigate={closeMobile} />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="org-badge">{user?.organization.name}</div>
          <div className="user-mini">
            {user?.firstName} {user?.lastName}
          </div>
        </div>
      </aside>
    </>
  );
}
