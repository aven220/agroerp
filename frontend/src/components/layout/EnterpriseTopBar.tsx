/**
 * PM-42 — Barra superior enterprise.
 * Solo: Logo · Empresa · Centro · Buscador · Notificaciones · Usuario
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '../../context/NavigationContext';
import { useCommandPaletteOptional } from '../../context/CommandProvider';
import { useKeyboardShortcuts } from '../../context/KeyboardShortcutsContext';
import { useExperienceCenterOptional } from '../../context/ExperienceCenterContext';
import { cacheCompanyProfile, readCachedCompanyProfile } from '../../config/navProgression';
import { loadCompanyProfile } from '../../lib/companyProfile';
import type { ExperienceCenterId } from '../../config/experienceCenters';

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

export function EnterpriseTopBar() {
  const { user, logout } = useAuth();
  const { setSearchOpen } = useNavigation();
  const command = useCommandPaletteOptional();
  const { setPrefsOpen } = useKeyboardShortcuts();
  const experience = useExperienceCenterOptional();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
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
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const displayName = useMemo(
    () => [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Usuario',
    [user?.firstName, user?.lastName],
  );
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || 'U';
  const role = roleLabel(user?.roles?.[0]);

  const openSearch = () => {
    if (command) command.openPalette('launcher');
    else setSearchOpen(true);
  };

  return (
    <header className="etb" role="banner">
      <div className="etb-left">
        <Link to="/operacion" className="etb-brand" aria-label="AgroERP — Inicio">
          <span className="etb-logo" aria-hidden>
            A
          </span>
          <span className="etb-brand-name">AgroERP</span>
        </Link>
        <span className="etb-sep" aria-hidden />
        <span className="etb-company" title={orgName}>
          {orgName}
        </span>
        {experience ? (
          <>
            <span className="etb-sep" aria-hidden />
            <label className="etb-center">
              <span className="sr-only">Centro de trabajo</span>
              <select
                className="etb-center-select"
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
              <ChevronDown size={14} strokeWidth={1.75} className="etb-center-caret" aria-hidden />
            </label>
          </>
        ) : null}
      </div>

      <div className="etb-center-slot">
        <button type="button" className="etb-search" onClick={openSearch} aria-label="Buscar (⌘K)">
          <Search size={16} strokeWidth={1.75} />
          <span className="etb-search-label">Buscar…</span>
          <kbd className="etb-search-kbd">⌘K</kbd>
        </button>
      </div>

      <div className="etb-right">
        <Link
          to="/notificaciones"
          className="etb-icon-btn"
          aria-label="Notificaciones"
          title="Notificaciones"
        >
          <Bell size={18} strokeWidth={1.75} />
        </Link>

        <div className="etb-user" ref={menuRef}>
          <button
            type="button"
            className="etb-user-btn"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="etb-avatar" aria-hidden>
              {initials}
            </span>
            <span className="etb-user-meta">
              <strong className="etb-user-name">{displayName}</strong>
              <span className="etb-user-role">{role}</span>
            </span>
            <ChevronDown size={14} strokeWidth={1.75} aria-hidden />
          </button>
          {menuOpen ? (
            <div className="etb-user-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                className="etb-user-item"
                onClick={() => {
                  setMenuOpen(false);
                  setPrefsOpen(true);
                }}
              >
                Mi perfil
              </button>
              <button
                type="button"
                role="menuitem"
                className="etb-user-item"
                onClick={() => {
                  setMenuOpen(false);
                  setPrefsOpen(true);
                }}
              >
                Preferencias
              </button>
              <button
                type="button"
                role="menuitem"
                className="etb-user-item"
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/configuracion');
                }}
              >
                Centro de trabajo
              </button>
              <button
                type="button"
                role="menuitem"
                className="etb-user-item"
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/implementacion/empresa');
                }}
              >
                Cambiar empresa
              </button>
              <div className="etb-user-sep" role="separator" />
              <button
                type="button"
                role="menuitem"
                className="etb-user-item etb-user-logout"
                onClick={() => {
                  setMenuOpen(false);
                  void logout();
                }}
              >
                Salir
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
