/**
 * PM-43 — Enterprise Header con navegación horizontal.
 * Sin sidebar. Menús solo por dropdown.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { useCommandPaletteOptional } from '../../context/CommandProvider';
import { useKeyboardShortcuts } from '../../context/KeyboardShortcutsContext';
import { useExperienceCenterOptional } from '../../context/ExperienceCenterContext';
import { cacheCompanyProfile, readCachedCompanyProfile } from '../../config/navProgression';
import { loadCompanyProfile } from '../../lib/companyProfile';
import { findNavItemByPath, type NavCategory, type NavItem } from '../../config/navigation';
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

function categoryIsActive(pathname: string, category: NavCategory): boolean {
  return category.items.some((item) => itemIsActive(pathname, item));
}

function NavDropdown({
  category,
  open,
  onOpen,
  onClose,
}: {
  category: NavCategory;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const active = categoryIsActive(pathname, category);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
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

  return (
    <div className={`enh-nav-item${open ? ' is-open' : ''}${active ? ' is-active' : ''}`} ref={ref}>
      <button
        type="button"
        className="enh-nav-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => (open ? onClose() : onOpen())}
      >
        <span>{category.label}</span>
        <ChevronDown size={14} strokeWidth={1.75} className="enh-nav-caret" aria-hidden />
      </button>
      {open ? (
        <div className="enh-dropdown" role="menu" aria-label={category.label}>
          <div className="enh-dropdown-title">{category.label}</div>
          {category.items.map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.exact ?? item.to === '/'}
              role="menuitem"
              className={({ isActive }) => `enh-dropdown-item${isActive ? ' is-active' : ''}`}
              onClick={onClose}
            >
              <span className="enh-dropdown-icon" aria-hidden>
                <NavIcon name={item.icon} size={16} />
              </span>
              <span className="enh-dropdown-label">{item.label}</span>
            </NavLink>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Header enterprise fijo — navegación horizontal por dropdowns.
 */
export function EnterpriseHeader() {
  const { user, logout } = useAuth();
  const { visibleCategories, setSearchOpen } = useNavigation();
  const command = useCommandPaletteOptional();
  const { setPrefsOpen } = useKeyboardShortcuts();
  const experience = useExperienceCenterOptional();
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
  const dropdownCategories = visibleCategories.filter((c) => c.id !== 'home' && c.id !== 'favorites');
  const homeActive = pathname === '/operacion' || pathname === '/' || pathname === homeItem?.to;

  const openSearch = () => {
    if (command) command.openPalette('launcher');
    else setSearchOpen(true);
  };

  return (
    <header className="enh" role="banner">
      <div className="enh-chrome">
        <div className="enh-chrome-left">
          <Link to={homeItem?.to ?? '/operacion'} className="enh-brand" aria-label="AgroERP — Inicio">
            <span className="enh-logo" aria-hidden>
              A
            </span>
            <span className="enh-brand-name">AgroERP</span>
          </Link>
          <span className="enh-sep" aria-hidden />
          <span className="enh-company" title={orgName}>
            {orgName}
          </span>
          {experience ? (
            <>
              <span className="enh-sep" aria-hidden />
              <label className="enh-center">
                <span className="sr-only">Centro de trabajo</span>
                <select
                  className="enh-center-select"
                  value={experience.center}
                  aria-label={`Centro actual: ${experience.centerMeta.label}`}
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
                <ChevronDown size={14} strokeWidth={1.75} className="enh-center-caret" aria-hidden />
              </label>
            </>
          ) : null}
        </div>

        <div className="enh-chrome-center">
          <button type="button" className="enh-search" onClick={openSearch} aria-label="Buscar (⌘K)">
            <Search size={16} strokeWidth={1.75} />
            <span className="enh-search-label">Buscar en AgroERP…</span>
            <kbd className="enh-search-kbd">⌘K</kbd>
          </button>
        </div>

        <div className="enh-chrome-right">
          <Link to="/notificaciones" className="enh-icon-btn" aria-label="Notificaciones" title="Notificaciones">
            <Bell size={18} strokeWidth={1.75} />
          </Link>

          <div className="enh-user" ref={userRef}>
            <button
              type="button"
              className="enh-user-btn"
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
                <button
                  type="button"
                  role="menuitem"
                  className="enh-user-item"
                  onClick={() => {
                    setUserOpen(false);
                    navigate('/configuracion');
                  }}
                >
                  Centro de trabajo
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
                  Cambiar empresa
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

        {dropdownCategories.map((category) => (
          <NavDropdown
            key={category.id}
            category={category}
            open={openMenu === category.id}
            onOpen={() => {
              setUserOpen(false);
              setOpenMenu(category.id);
            }}
            onClose={() => setOpenMenu(null)}
          />
        ))}
      </nav>
    </header>
  );
}

/** Alias de compatibilidad PM-42 */
export { EnterpriseHeader as EnterpriseTopBar };
