import { Link } from 'react-router-dom';
import { useState, useRef, useEffect, type ReactNode } from 'react';

export interface HubMoreAction {
  label: string;
  to?: string;
  onClick?: () => void;
}

interface HubToolbarProps {
  primaryAction?: { label: string; to: string };
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filterSlot?: ReactNode;
  moreActions?: HubMoreAction[];
}

/**
 * PM-25 — Toolbar de hub simplificado: Nueva acción · Buscar · Filtros · Más acciones
 */
export function HubToolbar({
  primaryAction,
  searchPlaceholder = 'Buscar…',
  searchValue,
  onSearchChange,
  filterSlot,
  moreActions = [],
}: HubToolbarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [moreOpen]);

  return (
    <div className="hub-toolbar row-actions">
      {primaryAction ? (
        <Link to={primaryAction.to} className="btn btn-primary">
          {primaryAction.label}
        </Link>
      ) : null}
      {onSearchChange ? (
        <input
          type="search"
          className="hub-toolbar-search"
          placeholder={searchPlaceholder}
          value={searchValue ?? ''}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label={searchPlaceholder}
        />
      ) : (
        <Link to="#" className="btn btn-ghost hub-toolbar-search-btn" onClick={(e) => e.preventDefault()} aria-disabled>
          Buscar
        </Link>
      )}
      {filterSlot ?? (
        <button type="button" className="btn btn-ghost" disabled title="Filtros disponibles en cada lista">
          Filtros
        </button>
      )}
      {moreActions.length > 0 ? (
        <div className="hub-toolbar-more" ref={menuRef}>
          <button
            type="button"
            className="btn btn-ghost"
            aria-expanded={moreOpen}
            aria-haspopup="menu"
            onClick={() => setMoreOpen((v) => !v)}
          >
            Más acciones
          </button>
          {moreOpen ? (
            <div className="hub-toolbar-menu" role="menu">
              {moreActions.map((action) =>
                action.to ? (
                  <Link
                    key={action.label}
                    to={action.to}
                    role="menuitem"
                    className="hub-toolbar-menu-item"
                    onClick={() => setMoreOpen(false)}
                  >
                    {action.label}
                  </Link>
                ) : (
                  <button
                    key={action.label}
                    type="button"
                    role="menuitem"
                    className="hub-toolbar-menu-item"
                    onClick={() => {
                      action.onClick?.();
                      setMoreOpen(false);
                    }}
                  >
                    {action.label}
                  </button>
                ),
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
