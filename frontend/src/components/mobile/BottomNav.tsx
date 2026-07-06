import { NavLink, useLocation } from 'react-router-dom';
import { useMobile } from '../../context/MobileContext';
import { useNavigation } from '../../context/NavigationContext';

export function BottomNav() {
  const { mobileTabs } = useMobile();
  const { setSearchOpen } = useNavigation();
  const { setMoreOpen } = useMobile();
  const location = useLocation();

  function isActive(tab: (typeof mobileTabs)[0]) {
    if (tab.to.startsWith('#')) return false;
    if (tab.exact) return location.pathname === tab.to;
    return location.pathname === tab.to || location.pathname.startsWith(`${tab.to}/`);
  }

  return (
    <nav className="mobile-bottom-nav" aria-label="Navegación principal">
      {mobileTabs.map((tab) => {
        const active = isActive(tab);
        if (tab.to === '#search') {
          return (
            <button
              key={tab.id}
              type="button"
              className="mobile-nav-item"
              aria-label={tab.label}
              onClick={() => setSearchOpen(true)}
            >
              <span className="mobile-nav-icon" aria-hidden>{tab.icon}</span>
              <span className="mobile-nav-label">{tab.label}</span>
            </button>
          );
        }
        if (tab.to === '#more') {
          return (
            <button
              key={tab.id}
              type="button"
              className={`mobile-nav-item${active ? ' active' : ''}`}
              aria-label={tab.label}
              aria-expanded={false}
              onClick={() => setMoreOpen(true)}
            >
              <span className="mobile-nav-icon" aria-hidden>{tab.icon}</span>
              <span className="mobile-nav-label">{tab.label}</span>
            </button>
          );
        }
        return (
          <NavLink
            key={tab.id}
            to={tab.to}
            end={tab.exact}
            className={({ isActive: navActive }) =>
              `mobile-nav-item${navActive || active ? ' active' : ''}`
            }
            aria-label={tab.label}
          >
            <span className="mobile-nav-icon" aria-hidden>{tab.icon}</span>
            <span className="mobile-nav-label">{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
