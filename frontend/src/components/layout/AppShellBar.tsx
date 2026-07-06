import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { useKeyboardShortcuts } from '../../context/KeyboardShortcutsContext';
import { Breadcrumbs } from './Breadcrumbs';
import { ThemeToggle } from './ThemeToggle';
import { Tooltip } from '../ui/Tooltip';

export function AppShellBar({ compact = false }: { compact?: boolean }) {
  const { user, logout } = useAuth();
  const { setSearchOpen, navHistory } = useNavigation();
  const { setHelpOpen, setPrefsOpen } = useKeyboardShortcuts();

  return (
    <header className={`app-shell-bar${compact ? ' compact' : ''}`} role="banner">
      <div className="app-shell-bar-left">
        <Breadcrumbs />
      </div>
      <div className="app-shell-bar-center">
        <button
          type="button"
          className="global-search-trigger"
          onClick={() => setSearchOpen(true)}
          aria-label="Abrir búsqueda global"
        >
          <span aria-hidden>⌕</span>
          <span className="global-search-trigger-text">Buscar en AGROERP...</span>
          <kbd aria-hidden>⌘K</kbd>
        </button>
      </div>
      <div className="app-shell-bar-right">
        <Tooltip content="Atajos de teclado (?)">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setHelpOpen(true)} aria-label="Ayuda de atajos">
            ?
          </button>
        </Tooltip>
        <Tooltip content="Preferencias (⌘,)">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPrefsOpen(true)} aria-label="Preferencias">
            ⚙
          </button>
        </Tooltip>
        <ThemeToggle />
        {navHistory.length > 0 ? (
          <div className="recent-nav" aria-label="Navegación reciente">
            {navHistory.slice(0, 3).map((h) => (
              <Link key={h.id} to={h.to} className="recent-nav-chip" title={h.label}>
                {h.icon} {h.label}
              </Link>
            ))}
          </div>
        ) : null}
        <div className="user-chip compact">
          <span className="avatar" aria-hidden>
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </span>
          <div>
            <strong>{user?.firstName} {user?.lastName}</strong>
            <small>{user?.organization?.name}</small>
          </div>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => logout()}>
          Salir
        </button>
      </div>
    </header>
  );
}
