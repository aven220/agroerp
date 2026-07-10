import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { useExperienceCenterOptional } from '../../context/ExperienceCenterContext';
import {
  DEFAULT_EXPANDED_CATEGORIES,
  findNavItemByPath,
  type NavCategoryId,
  type NavItem,
} from '../../config/navigation';
import { FavoritesPanel } from './FavoritesPanel';

function NavLinkItem({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const { addFavorite, removeFavorite, isFavorite } = useNavigation();

  return (
    <div className="nav-item-row">
      <NavLink
        to={item.to}
        end={item.exact ?? item.to === '/'}
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        onClick={onNavigate}
      >
        <span className="nav-icon" aria-hidden>{item.icon}</span>
        <span className="nav-label">{item.label}</span>
      </NavLink>
      {item.id !== 'home-dashboard' ? (
        <button
          type="button"
          className={`nav-fav-btn${isFavorite(item.id) ? ' active' : ''}`}
          title={isFavorite(item.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          aria-label={isFavorite(item.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isFavorite(item.id)) removeFavorite(item.id);
            else addFavorite(item);
          }}
        >
          {isFavorite(item.id) ? '★' : '☆'}
        </button>
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
  } = useNavigation();

  const closeMobile = () => setSidebarOpen(false);

  const isGroupActive = (categoryId: NavCategoryId, items: NavItem[]) => {
    if (categoryId === 'home') {
      const homePaths = ['/', '/operacion', '/gerencia', '/implementacion'];
      return homePaths.includes(location.pathname);
    }
    if (categoryId === 'favorites') {
      return items.some((item) => {
        const match = findNavItemByPath(location.pathname);
        return match?.id === item.id || location.pathname === item.to;
      });
    }
    return items.some((item) => {
      const match = findNavItemByPath(location.pathname);
      return match?.id === item.id || location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
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
          <div>
            <strong>AGROERP</strong>
            <span>{packageLabel}</span>
            {experience ? (
              <span className="sidebar-center-badge">{experience.centerMeta.shortLabel}</span>
            ) : null}
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

        <nav className="sidebar-nav" aria-label="Menú por áreas">
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
                className={`nav-category${active ? ' has-active' : ''}${category.id === 'advanced' ? ' nav-category-advanced' : ''}`}
              >
                <button
                  type="button"
                  className={`nav-category-header${collapsed ? ' collapsed' : ''}`}
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
                  {category.id === 'favorites' ? (
                    <FavoritesPanel onNavigate={closeMobile} />
                  ) : (
                    category.items.map((item) => (
                      <NavLinkItem key={item.id} item={item} onNavigate={closeMobile} />
                    ))
                  )}
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
