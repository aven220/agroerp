import { useEffect, useRef, useState } from 'react';
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

export function AppShellBar({ compact = false }: { compact?: boolean }) {
  const { user, logout } = useAuth();
  const { setSearchOpen } = useNavigation();
  const command = useCommandPaletteOptional();
  const { setHelpOpen, setPrefsOpen } = useKeyboardShortcuts();
  const gw = useGuidedWorkspaceOptional();
  const assistant = useSmartAssistantOptional();
  const adaptive = useAdaptiveWorkspaceOptional();
  const focusMode = adaptive?.focusMode ?? false;
  const workspaceBadge = gw
    ? gw.pinned.length + gw.tasks.filter((t) => !t.done).length
    : 0;

  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

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
        {!focusMode ? (
          <div className="app-shell-more" ref={moreRef}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              aria-label="Más herramientas"
              title="Más herramientas"
              onClick={() => setMoreOpen((v) => !v)}
            >
              ⋯
            </button>
            {moreOpen ? (
              <div className="app-shell-more-menu" role="menu">
                {gw ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="app-shell-more-item"
                    onClick={() => {
                      gw.togglePanel();
                      setMoreOpen(false);
                    }}
                  >
                    <span aria-hidden>📋</span>
                    Mi jornada
                    {workspaceBadge > 0 ? (
                      <span className="gwp-toggle-badge" aria-hidden>{workspaceBadge}</span>
                    ) : null}
                  </button>
                ) : null}
                {adaptive ? (
                  <div
                    className="app-shell-more-item app-shell-more-item-embed"
                    role="none"
                    onClick={() => setMoreOpen(false)}
                  >
                    <FocusModeToggle />
                  </div>
                ) : null}
                {assistant ? (
                  <div
                    className="app-shell-more-item app-shell-more-item-embed"
                    role="none"
                    onClick={() => setMoreOpen(false)}
                  >
                    <SmartAssistantTrigger />
                  </div>
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  className="app-shell-more-item"
                  onClick={() => {
                    setHelpOpen(true);
                    setMoreOpen(false);
                  }}
                >
                  <span aria-hidden>?</span>
                  Atajos de teclado
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="app-shell-more-item"
                  onClick={() => {
                    setPrefsOpen(true);
                    setMoreOpen(false);
                  }}
                >
                  <span aria-hidden>⚙</span>
                  Preferencias
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <FocusModeToggle />
        )}

        <ThemeToggle />

        <div className="user-chip compact">
          <span className="avatar" aria-hidden>
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </span>
          {!compact ? (
            <div>
              <strong>{user?.firstName} {user?.lastName}</strong>
              <small>{user?.organization?.name}</small>
            </div>
          ) : null}
        </div>

        <button type="button" className="btn btn-ghost btn-sm" onClick={() => logout()}>
          Salir
        </button>
      </div>
    </header>
  );
}
