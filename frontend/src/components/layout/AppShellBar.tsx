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

function ShellPopover({
  label,
  icon,
  children,
  empty,
}: {
  label: string;
  icon: string;
  children: React.ReactNode;
  empty?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="app-shell-popover" ref={ref}>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        title={label}
        onClick={() => setOpen((v) => !v)}
      >
        {icon}
      </button>
      {open ? (
        <div className="app-shell-more-menu app-shell-nav-menu" role="menu">
          <div className="app-shell-nav-menu-title">{label}</div>
          {children ?? (empty ? <p className="app-shell-nav-empty">{empty}</p> : null)}
        </div>
      ) : null}
    </div>
  );
}

export function AppShellBar({ compact = false }: { compact?: boolean }) {
  const { user, logout } = useAuth();
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
    <header className={`app-shell-bar${compact ? ' compact' : ''}`} role="banner">
      <div className="app-shell-bar-left">
        {resumeTarget ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm app-shell-resume"
            title={`Volver donde estaba: ${resumeLabel}`}
            onClick={() => navigate(resumeTarget)}
          >
            ← Volver
          </button>
        ) : null}
      </div>

      <div className="app-shell-bar-center">
        <button
          type="button"
          className="global-search-trigger"
          onClick={() => (command ? command.openPalette('launcher') : setSearchOpen(true))}
          aria-label="Búsqueda rápida"
        >
          <span aria-hidden>⌕</span>
          <span className="global-search-trigger-text">Buscar productores, compras, docs…</span>
          <kbd aria-hidden>⌘K</kbd>
        </button>
      </div>

      <div className="app-shell-bar-right">
        {!focusMode ? (
          <>
            <ShellPopover label="Favoritos" icon="★" empty="Marque ★ en el menú para fijar accesos.">
              {favorites.length > 0
                ? favorites
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((f) => (
                      <Link
                        key={f.id}
                        to={f.to}
                        role="menuitem"
                        className="app-shell-more-item"
                        onClick={() => undefined}
                      >
                        <span aria-hidden>{f.icon}</span>
                        {f.label}
                      </Link>
                    ))
                : null}
            </ShellPopover>

            <ShellPopover label="Recientes" icon="🕒" empty="Aún no hay pantallas recientes.">
              {navHistory.length > 0
                ? navHistory.slice(0, 8).map((h) => (
                    <Link key={`${h.id}-${h.to}`} to={h.to} role="menuitem" className="app-shell-more-item">
                      <span aria-hidden>{h.icon}</span>
                      {h.label}
                    </Link>
                  ))
                : null}
            </ShellPopover>
          </>
        ) : null}

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
