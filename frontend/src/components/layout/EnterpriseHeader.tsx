/**
 * PM-50 — Enterprise Header unificado (una fila).
 * Brand · Nav curada · Buscar · Utilidades · Cuenta.
 * Sin selects permanentes de centro/paquete (viven en menú de cuenta).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, PanelRight, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { useCommandPaletteOptional } from '../../context/CommandProvider';
import { useKeyboardShortcuts } from '../../context/KeyboardShortcutsContext';
import { useExperienceCenterOptional } from '../../context/ExperienceCenterContext';
import { useGuidedWorkspaceOptional } from '../../context/GuidedWorkspaceContext';
import { useUserPreferencesOptional } from '../../context/UserPreferencesContext';
import { cacheCompanyProfile, readCachedCompanyProfile } from '../../config/navProgression';
import { loadCompanyProfile } from '../../lib/companyProfile';
import { findNavItemByPath, type NavItem } from '../../config/navigation';
import {
  HEADER_MENU_PILLARS,
  type HeaderMenuEntry,
  type HeaderMenuPillar,
} from '../../config/headerNavigation';
import type { ExperienceCenterId } from '../../config/experienceCenters';
import { NavIcon } from './navIcons';

function roleLabel(role?: string): string {
  if (!role) return 'Usuario';
  const key = role.toLowerCase();
  const map: Record<string, string> = {
    admin: 'Administrador',
    administrator: 'Administrador',
    manager: 'Gerente',
    gerencia: 'Gerencia',
    operator: 'Operador',
    operador: 'Operador',
    viewer: 'Consulta',
  };
  return map[key] ?? role.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function itemIsActive(pathname: string, item: NavItem): boolean {
  const match = findNavItemByPath(pathname);
  if (item.exact) return pathname === item.to || match?.id === item.id;
  return match?.id === item.id || pathname === item.to || pathname.startsWith(`${item.to}/`);
}

type ResolvedEntry = HeaderMenuEntry & { item: NavItem };

function resolvePillar(
  pillar: HeaderMenuPillar,
  byId: Map<string, NavItem>,
): { pillar: HeaderMenuPillar; entries: ResolvedEntry[] } {
  const entries: ResolvedEntry[] = [];
  for (const entry of pillar.entries) {
    const item = byId.get(entry.id);
    if (item) entries.push({ ...entry, item });
  }
  return { pillar, entries };
}

function NavDropdown({
  pillar,
  entries,
  open,
  onOpen,
  onClose,
}: {
  pillar: HeaderMenuPillar;
  entries: ResolvedEntry[];
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const active = entries.some((e) => itemIsActive(pathname, e.item));

  useEffect(() => {
    if (!open || !btnRef.current) {
      setCoords(null);
      return;
    }
    const place = () => {
      const r = btnRef.current!.getBoundingClientRect();
      const width = 300;
      const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
      setCoords({ top: r.bottom + 6, left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || menuRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const menu =
    open && coords
      ? createPortal(
          <div
            ref={menuRef}
            className="enh-dropdown enh-dropdown-portal"
            role="menu"
            style={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 400 }}
          >
            <div className="enh-dropdown-head">
              <div className="enh-dropdown-title">{pillar.label}</div>
              <p className="enh-dropdown-blurb">{pillar.blurb}</p>
            </div>
            <div className="enh-dropdown-list">
              {entries.map((entry) => {
                const activeItem = itemIsActive(pathname, entry.item);
                return (
                  <Link
                    key={entry.id}
                    to={entry.item.to}
                    role="menuitem"
                    className={`enh-dropdown-item${activeItem ? ' is-active' : ''}`}
                    onClick={onClose}
                  >
                    <span className="enh-dropdown-icon" aria-hidden>
                      <NavIcon name={entry.item.icon} size={16} />
                    </span>
                    <span className="enh-dropdown-copy">
                      <span className="enh-dropdown-label">{entry.label}</span>
                      <span className="enh-dropdown-hint">{entry.hint}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={`enh-nav-item${active ? ' is-active' : ''}${open ? ' is-open' : ''}`} ref={ref}>
      <button
        ref={btnRef}
        type="button"
        className="enh-nav-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => (open ? onClose() : onOpen())}
      >
        {pillar.label}
        <ChevronDown size={14} strokeWidth={1.75} className="enh-nav-caret" aria-hidden />
      </button>
      {menu}
    </div>
  );
}

/**
 * Header enterprise — navegación horizontal curada, una sola fila.
 */
export function EnterpriseHeader() {
  const { user, logout } = useAuth();
  const { visibleCategories, setSearchOpen } = useNavigation();
  const command = useCommandPaletteOptional();
  const { setPrefsOpen } = useKeyboardShortcuts();
  const experience = useExperienceCenterOptional();
  const guided = useGuidedWorkspaceOptional();
  const prefs = useUserPreferencesOptional();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  const [orgName, setOrgName] = useState(
    () => readCachedCompanyProfile()?.legalName || user?.organization?.name || 'Empresa',
  );

  useEffect(() => {
    let cancelled = false;
    loadCompanyProfile()
      .then((profile) => {
        if (cancelled) return;
        cacheCompanyProfile(profile);
        if (profile.legalName.trim()) setOrgName(profile.legalName.trim());
      })
      .catch(() => {
        /* silencioso */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setOpenMenu(null);
    setUserOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!userOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [userOpen]);

  const displayName = useMemo(
    () => [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Usuario',
    [user?.firstName, user?.lastName],
  );
  const initials =
    displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || 'U';
  const role = roleLabel(user?.roles?.[0]);

  const homeItem = visibleCategories.find((c) => c.id === 'home')?.items[0];
  const homeActive = pathname === '/operacion' || pathname === '/' || pathname === homeItem?.to;

  const menuPillars = useMemo(() => {
    const byId = new Map<string, NavItem>();
    for (const cat of visibleCategories) {
      for (const item of cat.items) byId.set(item.id, item);
    }
    return HEADER_MENU_PILLARS.map((pillar) => resolvePillar(pillar, byId)).filter(
      (p) => p.entries.length > 0,
    );
  }, [visibleCategories]);

  const openSearch = () => {
    if (command) command.openPalette('launcher');
    else setSearchOpen(true);
  };

  const assistantEnabled = prefs?.assistantEnabled ?? false;
  const packageLabel =
    experience?.packageId === 'full-platform'
      ? 'Pro'
      : experience?.packageId === 'custom'
        ? 'Custom'
        : 'Piloto';

  return (
    <header className="enh enh-pm50" role="banner">
      <div className="enh-chrome">
        <div className="enh-chrome-left">
          <Link to={homeItem?.to ?? '/operacion'} className="enh-brand" aria-label="AgroERP — Inicio">
            <span className="enh-logo" aria-hidden>
              A
            </span>
            <span className="enh-brand-name">AgroERP</span>
          </Link>
        </div>

        <nav className="enh-nav" aria-label="Navegación principal">
          {homeItem ? (
            <NavLink
              to={homeItem.to}
              end
              className={() => `enh-nav-link${homeActive ? ' is-active' : ''}`}
              onClick={() => setOpenMenu(null)}
            >
              Inicio
            </NavLink>
          ) : null}

          {menuPillars.map(({ pillar, entries }) => (
            <NavDropdown
              key={pillar.categoryId}
              pillar={pillar}
              entries={entries}
              open={openMenu === pillar.categoryId}
              onOpen={() => {
                setUserOpen(false);
                setOpenMenu(pillar.categoryId);
              }}
              onClose={() => setOpenMenu(null)}
            />
          ))}
        </nav>

        <div className="enh-chrome-center">
          <button type="button" className="enh-search" onClick={openSearch} aria-label="Buscar (⌘K)">
            <Search size={16} strokeWidth={1.75} />
            <span className="enh-search-label">Buscar…</span>
            <kbd className="enh-search-kbd">⌘K</kbd>
          </button>
        </div>

        <div className="enh-chrome-right">
          {assistantEnabled && guided ? (
            <button
              type="button"
              className="enh-icon-btn"
              aria-label="Espacio de trabajo"
              title="Espacio de trabajo"
              aria-pressed={guided.panelOpen}
              onClick={() => guided.togglePanel()}
            >
              <PanelRight size={18} strokeWidth={1.75} />
            </button>
          ) : null}

          <Link to="/notificaciones" className="enh-icon-btn" aria-label="Notificaciones" title="Notificaciones">
            <Bell size={18} strokeWidth={1.75} />
          </Link>

          <div className="enh-user" ref={userRef}>
            <button
              type="button"
              className="enh-user-btn"
              aria-label="Mi cuenta"
              title="Mi cuenta"
              aria-expanded={userOpen}
              aria-haspopup="menu"
              onClick={() => {
                setOpenMenu(null);
                setUserOpen((v) => !v);
              }}
            >
              <span className="enh-avatar" aria-hidden>
                {initials}
              </span>
              <span className="enh-user-meta">
                <strong className="enh-user-name">{displayName}</strong>
                <span className="enh-user-role">{role}</span>
              </span>
              <ChevronDown size={14} strokeWidth={1.75} aria-hidden />
            </button>
            {userOpen ? (
              <div className="enh-user-menu" role="menu">
                <div className="enh-user-org" aria-hidden>
                  <strong>{orgName}</strong>
                  <span>
                    {experience?.centerMeta.shortLabel ?? 'Operación'} · {packageLabel}
                  </span>
                </div>
                <div className="enh-user-sep" role="separator" />
                <button
                  type="button"
                  role="menuitem"
                  className="enh-user-item"
                  onClick={() => {
                    setUserOpen(false);
                    setPrefsOpen(true);
                  }}
                >
                  Mi perfil
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="enh-user-item"
                  onClick={() => {
                    setUserOpen(false);
                    setPrefsOpen(true);
                  }}
                >
                  Preferencias
                </button>
                {experience ? (
                  <div className="enh-user-center-block">
                    <label className="enh-user-center-label">
                      Inicio de trabajo
                      <select
                        className="enh-center-select enh-user-center-select"
                        value={experience.center}
                        aria-label="Inicio de trabajo"
                        onChange={(e) => {
                          const next = e.target.value as ExperienceCenterId;
                          if (next !== experience.center) experience.setCenter(next);
                        }}
                      >
                        {experience.centers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.shortLabel}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  className="enh-user-item"
                  onClick={() => {
                    setUserOpen(false);
                    navigate('/implementacion/modulos');
                  }}
                >
                  Paquete ({packageLabel})
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="enh-user-item"
                  onClick={() => {
                    setUserOpen(false);
                    navigate('/implementacion/empresa');
                  }}
                >
                  Empresa
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="enh-user-item"
                  onClick={() => {
                    setUserOpen(false);
                    navigate('/ayuda');
                  }}
                >
                  Centro de ayuda
                </button>
                <div className="enh-user-sep" role="separator" />
                <button
                  type="button"
                  role="menuitem"
                  className="enh-user-item enh-user-logout"
                  onClick={() => {
                    setUserOpen(false);
                    void logout();
                  }}
                >
                  Salir
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

/** Alias de compatibilidad PM-42 */
export { EnterpriseHeader as EnterpriseTopBar };
