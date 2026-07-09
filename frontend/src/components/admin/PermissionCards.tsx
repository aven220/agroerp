import { useMemo, useState } from 'react';
import type { Permission } from '../../types';
import {
  humanPermissionPhrase,
  resourceAreaLabel,
  resourceIcon,
} from '../../lib/adminFunctionalAreas';
import { actionLabel, permKey } from '../../lib/adminPermissions';

interface PermissionCardsProps {
  permissions: Permission[];
  selected: string[];
  onChange: (next: string[]) => void;
  readOnly?: boolean;
}

const STANDARD_ACTIONS = ['read', 'create', 'update', 'delete', 'admin'] as const;

type ResourceBucket = {
  resource: string;
  label: string;
  icon: string;
  permissions: Permission[];
};

export function PermissionCards({
  permissions,
  selected,
  onChange,
  readOnly = false,
}: PermissionCardsProps) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const resources = useMemo(() => {
    const map = new Map<string, ResourceBucket>();
    for (const p of permissions) {
      const bucket =
        map.get(p.resource) ??
        ({
          resource: p.resource,
          label: resourceAreaLabel(p.resource),
          icon: resourceIcon(p.resource),
          permissions: [],
        } satisfies ResourceBucket);
      bucket.permissions.push(p);
      map.set(p.resource, bucket);
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, [permissions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return resources;
    return resources.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.permissions.some((p) =>
          humanPermissionPhrase(p.resource, p.action).toLowerCase().includes(q),
        ),
    );
  }, [resources, search]);

  function toggleKeys(keys: string[], enabled: boolean) {
    if (readOnly) return;
    const next = new Set(selected);
    for (const k of keys) {
      if (enabled) next.add(k);
      else next.delete(k);
    }
    onChange(Array.from(next));
  }

  function toggleCollapse(resource: string) {
    setCollapsed((prev) => ({ ...prev, [resource]: !prev[resource] }));
  }

  if (resources.length === 0) {
    return (
      <p className="muted admin-perm-cards-empty">
        No hay permisos disponibles para asignar en este momento.
      </p>
    );
  }

  return (
    <div className="admin-perm-cards-wrap">
      <div className="admin-perm-cards-toolbar">
        <input
          type="search"
          className="admin-perm-search"
          placeholder="Buscar área o capacidad…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar permisos"
        />
        <span className="muted admin-perm-search-count">
          {selected.length} seleccionado{selected.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="admin-perm-cards">
        {filtered.map((bucket) => {
          const keys = bucket.permissions.map(permKey);
          const selectedCount = keys.filter((k) => selectedSet.has(k)).length;
          const allOn = keys.length > 0 && selectedCount === keys.length;
          const isCollapsed = collapsed[bucket.resource] ?? false;

          const actionsByType = new Map<string, Permission[]>();
          for (const p of bucket.permissions) {
            const list = actionsByType.get(p.action) ?? [];
            list.push(p);
            actionsByType.set(p.action, list);
          }

          return (
            <article key={bucket.resource} className="admin-perm-card">
              <header className="admin-perm-card-head">
                <button
                  type="button"
                  className="admin-perm-card-title-btn"
                  onClick={() => toggleCollapse(bucket.resource)}
                  aria-expanded={!isCollapsed}
                >
                  <span className="admin-perm-card-icon" aria-hidden>
                    {bucket.icon}
                  </span>
                  <span>
                    <h3>{bucket.label}</h3>
                    <span className="muted admin-perm-card-meta">
                      {selectedCount} de {keys.length} capacidades
                    </span>
                  </span>
                  <span className="admin-perm-card-chevron" aria-hidden>
                    {isCollapsed ? '▸' : '▾'}
                  </span>
                </button>
                {!readOnly ? (
                  <div className="admin-perm-card-tools">
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => toggleKeys(keys, true)}
                    >
                      Seleccionar todos
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => toggleKeys(keys, false)}
                    >
                      Limpiar
                    </button>
                  </div>
                ) : null}
              </header>

              {!isCollapsed ? (
                <div className="admin-perm-card-actions">
                  {STANDARD_ACTIONS.map((action) => {
                    const perms = actionsByType.get(action);
                    if (!perms?.length) return null;
                    const actionKeys = perms.map(permKey);
                    const on = actionKeys.every((k) => selectedSet.has(k));
                    const partial =
                      actionKeys.some((k) => selectedSet.has(k)) &&
                      !on;

                    return (
                      <label
                        key={action}
                        className={`admin-perm-action${on ? ' admin-perm-action--on' : ''}${partial ? ' admin-perm-action--partial' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={readOnly}
                          ref={(el) => {
                            if (el) el.indeterminate = partial;
                          }}
                          onChange={(e) => toggleKeys(actionKeys, e.target.checked)}
                        />
                        <span className="admin-perm-action-body">
                          <strong>{humanPermissionPhrase(bucket.resource, action)}</strong>
                          <span className="muted">
                            {action === 'read'
                              ? 'Consultar información sin modificarla'
                              : action === 'create'
                                ? 'Registrar nuevos elementos'
                                : action === 'update'
                                  ? 'Modificar registros existentes'
                                  : action === 'delete'
                                    ? 'Eliminar de forma permanente'
                                    : 'Control total sobre esta área'}
                          </span>
                        </span>
                      </label>
                    );
                  })}

                  {Array.from(actionsByType.entries())
                    .filter(([action]) => !STANDARD_ACTIONS.includes(action as (typeof STANDARD_ACTIONS)[number]))
                    .map(([action, perms]) => {
                      const actionKeys = perms.map(permKey);
                      const on = actionKeys.every((k) => selectedSet.has(k));
                      const partial =
                        actionKeys.some((k) => selectedSet.has(k)) && !on;

                      return (
                        <label
                          key={action}
                          className={`admin-perm-action${on ? ' admin-perm-action--on' : ''}${partial ? ' admin-perm-action--partial' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={readOnly}
                            ref={(el) => {
                              if (el) el.indeterminate = partial;
                            }}
                            onChange={(e) => toggleKeys(actionKeys, e.target.checked)}
                          />
                          <span className="admin-perm-action-body">
                            <strong>{humanPermissionPhrase(bucket.resource, action)}</strong>
                            <span className="muted">{actionLabel(action)}</span>
                          </span>
                        </label>
                      );
                    })}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="muted admin-perm-cards-empty">Ningún permiso coincide con su búsqueda.</p>
      ) : null}
    </div>
  );
}
