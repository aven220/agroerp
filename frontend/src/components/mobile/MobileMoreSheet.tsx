import { Link } from 'react-router-dom';
import { Drawer } from '../ui/Drawer';
import { useMobile } from '../../context/MobileContext';
import { useNavigation } from '../../context/NavigationContext';
import { NAV_CATEGORIES } from '../../config/navigation';

export function MobileMoreSheet() {
  const { moreOpen, setMoreOpen } = useMobile();
  const { filterNavItem, favorites } = useNavigation();

  return (
    <Drawer open={moreOpen} title="Menú" onClose={() => setMoreOpen(false)}>
      <div className="mobile-more-sheet">
        {favorites.length > 0 ? (
          <section>
            <h3 className="mobile-more-heading">Favoritos</h3>
            <ul className="mobile-more-list">
              {favorites.map((f) => (
                <li key={f.id}>
                  <Link to={f.to} className="mobile-more-link" onClick={() => setMoreOpen(false)}>
                    {f.icon} {f.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {NAV_CATEGORIES.filter((c) => c.id !== 'favorites').map((cat) => {
          const items = cat.items.filter(filterNavItem);
          if (!items.length) return null;
          return (
            <section key={cat.id}>
              <h3 className="mobile-more-heading">{cat.icon} {cat.label}</h3>
              <ul className="mobile-more-list">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link to={item.to} className="mobile-more-link" onClick={() => setMoreOpen(false)}>
                      {item.icon} {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </Drawer>
  );
}
