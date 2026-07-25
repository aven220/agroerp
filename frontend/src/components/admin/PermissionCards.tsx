import { useMemo, useState } from 'react';
import type { Permission } from '../../types';
import {
  humanPermissionPhrase,
  resourceAreaLabel,
  resourceIcon,
} from '../../lib/adminFunctionalAreas';
import {
  actionLabel,
  ADMIN_MODULES,
  permKey,
  resolveAdminModule,
  resourceLabel,
} from '../../lib/adminPermissions';

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
  moduleId: string;
  moduleLabel: string;
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
      const mod = resolveAdminModule(p.resource);
      const bucket =
        map.get(p.resource) ??
        ({
          resource: p.resource,
          label: resourceAreaLabel(p.resource),
          icon: resourceIcon(p.resource),
          permissions: [],
          moduleId: mod.id,
          moduleLabel: mod.label,
        } satisfies ResourceBucket);
      bucket.permissions.push(p);
      map.set(p.resource, bucket);
    }
    return Array.from(map.values()).sort((a, b) => {
      const modCmp = a.moduleLabel.localeCompare(b.moduleLabel, 'es');
      if (modCmp !== 0) return modCmp;
      return a.label.localeCompare(b.label, 'es');
    });
  }, [permissions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return resources;
    return resources.filter((r) => {
      if (r.label.toLowerCase().includes(q)) return true;
      if (r.moduleLabel.toLowerCase().includes(q)) return true;
      if (r.resource.toLowerCase().includes(q)) return true;
      return r.permissions.some((p) => {
        const key = permKey(p).toLowerCase();
        const phrase = humanPermissionPhrase(p.resource, p.action).toLowerCase();
        return key.includes(q) || phrase.includes(q) || actionLabel(p.action).includes(q);
      });
    });
  }, [resources, search]);

  const byModule = useMemo(() => {
    const groups: Array<{ id: string; label: string; description: string; buckets: ResourceBucket[] }> =
      [];
    const seen = new Set<string>();
    for (const mod of ADMIN_MODULES) {
      const buckets = filtered.filter((b) => b.moduleId === mod.id);
      if (buckets.length === 0) continue;
      groups.push({
        id: mod.id,
        label: mod.label,
        description: mod.description,
        buckets,
      });
      seen.add(mod.id);
    }
    const other = filtered.filter((b) => !seen.has(b.moduleId));
    if (other.length > 0) {
      groups.push({
        id: 'other',
        label: 'Otros',
        description: 'Permisos adicionales del sistema.',
        buckets: other,
      });
    }
    return groups;
  }, [filtered]);

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
          placeholder="Buscar: compras, café, inventario, eint…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar permisos"
        />
        <span className="muted admin-perm-search-count">
          {selected.length} seleccionado{selected.length === 1 ? '' : 's'}
        </span>
      </div>

      <p className="muted admin-perm-hint">
        Los nombres aparecen en español. El código técnico (ej. <code>coffee:read</code>) se muestra
        debajo por si el sistema lo pide. Para entrar a <strong>Compras</strong> active al menos{' '}
        <strong>Puede consultar compras de café</strong>.
      </p>

      {byModule.map((group) => (
        <section key={group.id} className="admin-perm-module">
          <header className="admin-perm-module-head">
            <h3 className="admin-perm-module-title">{group.label}</h3>
            <p className="muted admin-perm-module-desc">{group.description}</p>
          </header>
          <div className="admin-perm-cards">
            {group.buckets.map((bucket) => {
              const keys = bucket.permissions.map(permKey);
              const selectedCount = keys.filter((k) => selectedSet.has(k)).length;
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
                          {selectedCount} de {keys.length} capacidades · código{' '}
                          <code>{bucket.resource}</code>
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
                        return (
                          <ActionRow
                            key={action}
                            action={action}
                            resource={bucket.resource}
                            perms={perms}
                            selectedSet={selectedSet}
                            readOnly={readOnly}
                            onToggle={toggleKeys}
                          />
                        );
                      })}

                      {Array.from(actionsByType.entries())
                        .filter(
                          ([action]) =>
                            !STANDARD_ACTIONS.includes(
                              action as (typeof STANDARD_ACTIONS)[number],
                            ),
                        )
                        .map(([action, perms]) => (
                          <ActionRow
                            key={action}
                            action={action}
                            resource={bucket.resource}
                            perms={perms}
                            selectedSet={selectedSet}
                            readOnly={readOnly}
                            onToggle={toggleKeys}
                          />
                        ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {filtered.length === 0 ? (
        <p className="muted admin-perm-cards-empty">Ningún permiso coincide con su búsqueda.</p>
      ) : null}
    </div>
  );
}

function ActionRow({
  action,
  resource,
  perms,
  selectedSet,
  readOnly,
  onToggle,
}: {
  action: string;
  resource: string;
  perms: Permission[];
  selectedSet: Set<string>;
  readOnly: boolean;
  onToggle: (keys: string[], enabled: boolean) => void;
}) {
  const actionKeys = perms.map(permKey);
  const on = actionKeys.every((k) => selectedSet.has(k));
  const partial = actionKeys.some((k) => selectedSet.has(k)) && !on;
  const tech = `${resource}:${action}`;

  const help =
    action === 'read'
      ? 'Consultar información / entrar al módulo (obligatorio para ver la sección)'
      : action === 'create'
        ? 'Registrar nuevos elementos'
        : action === 'update'
          ? 'Modificar registros existentes'
          : action === 'delete'
            ? 'Eliminar de forma permanente'
            : action === 'admin'
              ? 'Control total sobre esta área'
              : actionLabel(action);

  return (
    <label
      className={`admin-perm-action${on ? ' admin-perm-action--on' : ''}${partial ? ' admin-perm-action--partial' : ''}`}
    >
      <input
        type="checkbox"
        checked={on}
        disabled={readOnly}
        ref={(el) => {
          if (el) el.indeterminate = partial;
        }}
        onChange={(e) => onToggle(actionKeys, e.target.checked)}
      />
      <span className="admin-perm-action-body">
        <strong>{humanPermissionPhrase(resource, action)}</strong>
        <span className="muted">{help}</span>
        <span className="admin-perm-tech">
          Código: <code>{tech}</code>
          {resourceLabel(resource) !== resource ? (
            <>
              {' '}
              · área: {resourceLabel(resource)}
            </>
          ) : null}
        </span>
      </span>
    </label>
  );
}
