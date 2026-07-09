import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useMobile } from '../../context/MobileContext';
import { useNavigation } from '../../context/NavigationContext';
import { ROLE_LABELS } from '../../config/mobileNavigation';
import { getQuickActionsForRole } from '../../config/widgetRegistry';
import { NAV_CATEGORIES } from '../../config/navigation';
import { getContinueWorkItems, kindIcon } from '../../lib/workEntityHistory';
import { useDeviceCapabilities } from '../../hooks/useDeviceCapabilities';
import { useToast } from '../../context/ToastContext';

export function MobileHome() {
  const { user, hasPermission } = useAuth();
  const { dashboardRole, favorites, navHistory, filterNavItem } = useNavigation();
  const { quickTiles, pendingCount, online, queueItems } = useMobile();
  const device = useDeviceCapabilities();
  const toast = useToast();
  const quickActions = getQuickActionsForRole(dashboardRole, hasPermission);
  const continueItems = getContinueWorkItems(user?.id, 4);

  async function handleDeviceAction(action: string) {
    if (action === 'gps') {
      const gps = await device.getGPS();
      if (gps) toast.success(`GPS: ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`);
      else toast.error('No se pudo obtener ubicación');
      device.haptic(15);
      return;
    }
    if (action === 'scan') {
      const code = await device.scanQR();
      if (code) {
        await device.copyToClipboard(code);
        toast.success(`Código: ${code}`);
      } else toast.info('Escaneo no disponible — use cámara del dispositivo');
      device.haptic(15);
    }
  }

  const pendingItems = queueItems.filter((i) => i.status === 'pending' || i.status === 'failed').slice(0, 5);
  const recent = navHistory.slice(0, 6);

  return (
    <div className="mobile-home">
      <header className="mobile-home-header">
        <div>
          <p className="mobile-home-greeting">
            {user?.lastLoginAt ? 'Bienvenido nuevamente' : 'Buenos días'}, {user?.firstName ?? 'Usuario'}
          </p>
          <h1 className="mobile-home-title">{ROLE_LABELS[dashboardRole]}</h1>
          <p className="mobile-home-org">{user?.organization.name}</p>
        </div>
        <div className={`mobile-status-chip${online ? ' online' : ' offline'}`}>
          {online ? 'En línea' : 'Offline'}
          {pendingCount > 0 ? ` · ${pendingCount} pend.` : ''}
        </div>
      </header>

      <section className="mobile-home-section">
        <h2 className="mobile-section-title">¿Qué desea hacer hoy?</h2>
        <div className="mobile-action-list">
          {quickActions.map((a) => (
            <Link key={a.id} to={a.to} className="mobile-action-row">
              <span aria-hidden>{a.icon}</span>
              <span>{a.label}</span>
              <span className="mobile-chevron" aria-hidden>›</span>
            </Link>
          ))}
        </div>
      </section>

      {continueItems.length > 0 ? (
        <section className="mobile-home-section">
          <h2 className="mobile-section-title">Continuar donde quedó</h2>
          <ul className="mobile-recent-list">
            {continueItems.map((item) => (
              <li key={`${item.kind}-${item.id}`}>
                <Link to={item.to} className="mobile-recent-link">
                  <span aria-hidden>{kindIcon(item.kind)}</span> {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {pendingItems.length > 0 ? (
        <section className="mobile-home-section">
          <h2 className="mobile-section-title">Pendientes de sincronización</h2>
          <ul className="mobile-pending-list">
            {pendingItems.map((item) => (
              <li key={item.id} className="mobile-pending-item">
                <span>{item.label}</span>
                <span className={`mobile-badge mobile-badge-${item.status}`}>{item.status}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {favorites.length > 0 ? (
        <section className="mobile-home-section">
          <h2 className="mobile-section-title">Favoritos</h2>
          <div className="mobile-chip-row">
            {favorites.slice(0, 8).map((f) => (
              <Link key={f.id} to={f.to} className="mobile-chip">
                {f.icon} {f.label}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {recent.length > 0 ? (
        <section className="mobile-home-section">
          <h2 className="mobile-section-title">Recientes</h2>
          <ul className="mobile-recent-list">
            {recent.map((item) => (
              <li key={item.id}>
                <Link to={item.to} className="mobile-recent-link">
                  <span aria-hidden>{item.icon}</span> {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mobile-home-section">
        <h2 className="mobile-section-title">Herramientas de campo</h2>
        <div className="mobile-quick-grid">
          {quickTiles.map((tile) =>
            tile.to.startsWith('#') ? (
              <button
                key={tile.id}
                type="button"
                className="mobile-quick-tile"
                onClick={() => handleDeviceAction(tile.to.slice(1))}
              >
                <span className="mobile-quick-icon" aria-hidden>{tile.icon}</span>
                <span>{tile.label}</span>
              </button>
            ) : (
              <Link key={tile.id} to={tile.to} className="mobile-quick-tile">
                <span className="mobile-quick-icon" aria-hidden>{tile.icon}</span>
                <span>{tile.label}</span>
              </Link>
            ),
          )}
        </div>
      </section>

      <section className="mobile-home-section">
        <h2 className="mobile-section-title">Módulos</h2>
        <div className="mobile-module-grid">
          {NAV_CATEGORIES.filter((c) => c.id !== 'home' && c.id !== 'favorites').map((cat) => {
            const visible = cat.items.filter(filterNavItem);
            if (!visible.length) return null;
            const first = visible[0];
            return (
              <Link key={cat.id} to={first.to} className="mobile-module-card">
                <span className="mobile-module-icon" aria-hidden>{cat.icon}</span>
                <span className="mobile-module-label">{cat.label}</span>
                <span className="mobile-module-count">{visible.length}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
