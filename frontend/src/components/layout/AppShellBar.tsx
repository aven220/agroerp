import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { useCommandPaletteOptional } from '../../context/CommandProvider';
import { useKeyboardShortcuts } from '../../context/KeyboardShortcutsContext';
import { useGuidedWorkspaceOptional } from '../../context/GuidedWorkspaceContext';
import { useSmartAssistantOptional } from '../../context/SmartAssistantProvider';
import { useAdaptiveWorkspaceOptional } from '../../context/AdaptiveWorkspaceProvider';
import { SmartAssistantTrigger } from '../smart-assistant/RecommendationCenter';
import { FocusModeToggle } from '../adaptive-workspace/AdaptiveToolbar';
import { Breadcrumbs } from './Breadcrumbs';
import { ThemeToggle } from './ThemeToggle';
import { CenterSelector } from './CenterSelector';
import { Tooltip } from '../ui/Tooltip';

export function AppShellBar({ compact = false }: { compact?: boolean }) {
  const { user, logout } = useAuth();
  const { setSearchOpen, navHistory } = useNavigation();
  const command = useCommandPaletteOptional();
  const { setHelpOpen, setPrefsOpen } = useKeyboardShortcuts();
  const gw = useGuidedWorkspaceOptional();
  const assistant = useSmartAssistantOptional();
  const adaptive = useAdaptiveWorkspaceOptional();
  const focusMode = adaptive?.focusMode ?? false;
  const workspaceBadge = gw
    ? gw.pinned.length + gw.tasks.filter((t) => !t.done).length
    : 0;

  return (
    <header className={`app-shell-bar${compact ? ' compact' : ''}`} role="banner">
      <div className="app-shell-bar-left">
        {!focusMode ? <CenterSelector compact={compact} /> : null}
        {!compact && !focusMode ? <span className="app-shell-bar-divider" aria-hidden /> : null}
        <Breadcrumbs />
      </div>
      <div className="app-shell-bar-center">
        <button
          type="button"
          className="global-search-trigger"
          onClick={() => (command ? command.openPalette('launcher') : setSearchOpen(true))}
          aria-label="Abrir búsqueda global"
        >
          <span aria-hidden>⌕</span>
          <span className="global-search-trigger-text">Buscar en AGROERP...</span>
          <kbd aria-hidden>⌘K</kbd>
        </button>
      </div>
      <div className="app-shell-bar-right">
        {gw && !focusMode ? (
          <Tooltip content="Mi espacio de trabajo — fijados, pendientes y recientes">
            <button
              type="button"
              className="btn btn-ghost btn-sm gwp-shell-toggle"
              onClick={() => gw.togglePanel()}
              aria-pressed={gw.panelOpen}
              aria-label="Abrir mi espacio de trabajo"
            >
              <span aria-hidden>📋</span>
              {!compact ? <span>Mi jornada</span> : null}
              {workspaceBadge > 0 ? (
                <span className="gwp-toggle-badge" aria-hidden>{workspaceBadge}</span>
              ) : null}
            </button>
          </Tooltip>
        ) : null}
        {adaptive && !focusMode ? (
          <Tooltip content="Modo concentración — oculta elementos secundarios">
            <FocusModeToggle />
          </Tooltip>
        ) : adaptive && focusMode ? <FocusModeToggle /> : null}
        {assistant && !focusMode ? (
          <Tooltip content="Asistente de trabajo — sugerencias proactivas">
            <SmartAssistantTrigger />
          </Tooltip>
        ) : null}
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
        {navHistory.length > 0 && !focusMode ? (
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
