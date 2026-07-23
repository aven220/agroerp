import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { useCommandPaletteOptional } from '../../context/CommandProvider';
import { useKeyboardShortcuts } from '../../context/KeyboardShortcutsContext';
import { useGuidedWorkspaceOptional } from '../../context/GuidedWorkspaceContext';
import { useSmartAssistantOptional } from '../../context/SmartAssistantProvider';
import { useAdaptiveWorkspaceOptional } from '../../context/AdaptiveWorkspaceProvider';
import { SmartAssistantTrigger } from '../smart-assistant/RecommendationCenter';
import { FocusModeToggle } from '../adaptive-workspace/AdaptiveToolbar';
import { ThemeToggle } from './ThemeToggle';
import { MoreHorizontal, Search } from 'lucide-react';

/**
 * PM-43 — Topbar mínima del shell.
 * Búsqueda y perfil viven en el sidebar; aquí solo herramientas compactas.
 */
export function AppShellBar({ compact = false }: { compact?: boolean }) {
  const { logout } = useAuth();
  const { setSearchOpen, favorites, navHistory, lastMenuPath } = useNavigation();
  const command = useCommandPaletteOptional();
  const { setHelpOpen, setPrefsOpen } = useKeyboardShortcuts();
  const gw = useGuidedWorkspaceOptional();
  const assistant = useSmartAssistantOptional();
  const adaptive = useAdaptiveWorkspaceOptional();
  const focusMode = adaptive?.focusMode ?? false;
  const navigate = useNavigate();
  const workspaceBadge = gw
    ? gw.pinned.length + gw.tasks.filter((t) => !t.done).length
    : 0;

  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const resumeTarget = navHistory[1]?.to ?? (lastMenuPath || null);
  const resumeLabel = navHistory[1]?.label ?? 'Última pantalla';

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
    <header className={`app-shell-bar app-shell-bar-pm43${compact ? ' compact' : ''}`} role="banner">
      <div className="app-shell-bar-left">
        {resumeTarget ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm app-shell-resume"
            title={`Volver: ${resumeLabel}`}
            onClick={() => navigate(resumeTarget)}
          >
            ← Volver
          </button>
        ) : (
          <span className="app-shell-bar-spacer" aria-hidden />
        )}
      </div>

      <div className="app-shell-bar-right">
        <button
          type="button"
          className="btn btn-ghost btn-sm app-shell-search-btn"
          aria-label="Búsqueda rápida"
          title="Buscar (⌘K)"
          onClick={() => (command ? command.openPalette('launcher') : setSearchOpen(true))}
        >
          <Search size={16} strokeWidth={1.75} />
        </button>

        {!focusMode ? (
          <div className="app-shell-more" ref={moreRef}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              aria-label="Más herramientas"
              title="Más"
              onClick={() => setMoreOpen((v) => !v)}
            >
              <MoreHorizontal size={16} strokeWidth={1.75} />
            </button>
            {moreOpen ? (
              <div className="app-shell-more-menu" role="menu">
                {favorites.length > 0 ? (
                  <>
                    <div className="app-shell-nav-menu-title">Favoritos</div>
                    {favorites
                      .slice()
                      .sort((a, b) => a.order - b.order)
                      .slice(0, 6)
                      .map((f) => (
                        <Link
                          key={f.id}
                          to={f.to}
                          role="menuitem"
                          className="app-shell-more-item"
                          onClick={() => setMoreOpen(false)}
                        >
                          {f.label}
                        </Link>
                      ))}
                  </>
                ) : null}
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
                    Mi jornada
                    {workspaceBadge > 0 ? (
                      <span className="gwp-toggle-badge" aria-hidden>
                        {workspaceBadge}
                      </span>
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
                  Preferencias
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="app-shell-more-item"
                  onClick={() => {
                    void logout();
                    setMoreOpen(false);
                  }}
                >
                  Salir
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <FocusModeToggle />
        )}

        <ThemeToggle />
      </div>
    </header>
  );
}
