import { useMemo, useState } from 'react';
import type { Permission } from '../../types';
import {
  actionLabel,
  ADMIN_MODULES,
  permKey,
  resolveAdminModule,
  resourceLabel,
} from '../../lib/adminPermissions';

export interface PermissionMatrixProps {
  permissions: Permission[];
  selected: string[];
  onChange: (next: string[]) => void;
  readOnly?: boolean;
  showTechnicalKeys?: boolean;
}

export function PermissionMatrix({
  permissions,
  selected,
  onChange,
  readOnly = false,
  showTechnicalKeys = false,
}: PermissionMatrixProps) {
  const [search, setSearch] = useState('');
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});
  const [collapsedResources, setCollapsedResources] = useState<Record<string, boolean>>({});

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return permissions;
    return permissions.filter((p) => {
      const key = permKey(p).toLowerCase();
      const mod = resolveAdminModule(p.resource);
      const res = resourceLabel(p.resource).toLowerCase();
      const act = actionLabel(p.action).toLowerCase();
      return (
        key.includes(q) ||
        mod.label.toLowerCase().includes(q) ||
        mod.description.toLowerCase().includes(q) ||
        res.includes(q) ||
        act.includes(q)
      );
    });
  }, [permissions, search]);

  const tree = useMemo(() => {
    const byModule = new Map<
      string,
      {
        module: ReturnType<typeof resolveAdminModule>;
        resources: Map<string, Permission[]>;
      }
    >();

    for (const p of filtered) {
      const mod = resolveAdminModule(p.resource);
      if (!byModule.has(mod.id)) {
        byModule.set(mod.id, { module: mod, resources: new Map() });
      }
      const bucket = byModule.get(mod.id)!;
      const list = bucket.resources.get(p.resource) ?? [];
      list.push(p);
      bucket.resources.set(p.resource, list);
    }

    return Array.from(byModule.values()).sort((a, b) =>
      a.module.label.localeCompare(b.module.label, 'es'),
    );
  }, [filtered]);

  const allKeys = useMemo(() => filtered.map(permKey), [filtered]);
  const selectedVisible = allKeys.filter((k) => selectedSet.has(k)).length;

  function setKeys(keys: string[], enabled: boolean) {
    if (readOnly) return;
    const next = new Set(selected);
    for (const key of keys) {
      if (enabled) next.add(key);
      else next.delete(key);
    }
    onChange(Array.from(next));
  }

  function toggleKey(key: string) {
    if (readOnly) return;
    if (selectedSet.has(key)) onChange(selected.filter((k) => k !== key));
    else onChange([...selected, key]);
  }

  function toggleModuleCollapse(id: string) {
    setCollapsedModules((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleResourceCollapse(id: string) {
    setCollapsedResources((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function expandAll() {
    setCollapsedModules({});
    setCollapsedResources({});
  }

  function collapseAll() {
    const modules: Record<string, boolean> = {};
    for (const node of tree) modules[node.module.id] = true;
    setCollapsedModules(modules);
  }

  return (
    <div className="perm-matrix">
      <div className="perm-matrix-toolbar">
        <div className="perm-matrix-search">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por área, recurso o acción…"
            aria-label="Buscar permisos"
          />
        </div>
        <div className="perm-matrix-stats">
          <span className="ds-badge">{selectedVisible} / {allKeys.length} visibles</span>
          <span className="ds-badge ds-badge-info">{selected.length} seleccionados</span>
        </div>
      </div>

      {!readOnly ? (
        <div className="perm-matrix-actions ds-cluster">
          <button type="button" className="btn btn-sm" onClick={() => setKeys(allKeys, true)}>
            Seleccionar visibles
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setKeys(allKeys, false)}>
            Limpiar visibles
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={expandAll}>
            Expandir todo
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={collapseAll}>
            Contraer todo
          </button>
        </div>
      ) : null}

      <div className="perm-matrix-body">
        {tree.length === 0 ? (
          <div className="ds-empty-state" style={{ padding: 'var(--ds-space-8)' }}>
            <div className="ds-empty-state-title">Sin resultados</div>
            <div className="ds-empty-state-desc">Pruebe otro término de búsqueda.</div>
          </div>
        ) : (
          tree.map(({ module, resources }) => {
            const moduleKeys = Array.from(resources.values()).flat().map(permKey);
            const moduleSelected = moduleKeys.filter((k) => selectedSet.has(k)).length;
            const moduleCollapsed = collapsedModules[module.id] === true;
            const allModuleOn = moduleKeys.length > 0 && moduleSelected === moduleKeys.length;
            const someModuleOn = moduleSelected > 0 && !allModuleOn;

            return (
              <section key={module.id} className="perm-module">
                <header className="perm-module-header">
                  <button
                    type="button"
                    className="perm-collapse-btn"
                    onClick={() => toggleModuleCollapse(module.id)}
                    aria-expanded={!moduleCollapsed}
                  >
                    <span aria-hidden>{moduleCollapsed ? '▸' : '▾'}</span>
                    <div className="perm-module-titles">
                      <strong>{module.label}</strong>
                      <span className="muted perm-module-desc">{module.description}</span>
                    </div>
                  </button>
                  <span className="ds-badge">
                    {moduleSelected}/{moduleKeys.length}
                  </span>
                  {!readOnly ? (
                    <label className="perm-bulk-check">
                      <input
                        type="checkbox"
                        checked={allModuleOn}
                        ref={(el) => {
                          if (el) el.indeterminate = someModuleOn;
                        }}
                        onChange={(e) => setKeys(moduleKeys, e.target.checked)}
                      />
                      <span>Todo el área</span>
                    </label>
                  ) : null}
                </header>

                {!moduleCollapsed ? (
                  <div className="perm-module-body">
                    {Array.from(resources.entries())
                      .sort(([a], [b]) => resourceLabel(a).localeCompare(resourceLabel(b), 'es'))
                      .map(([resource, perms]) => {
                        const resId = `${module.id}:${resource}`;
                        const keys = perms.map(permKey);
                        const selectedCount = keys.filter((k) => selectedSet.has(k)).length;
                        const collapsed = collapsedResources[resId] === true;
                        const allOn = keys.length > 0 && selectedCount === keys.length;
                        const someOn = selectedCount > 0 && !allOn;

                        return (
                          <div key={resId} className="perm-resource-card">
                            <header className="perm-resource-header">
                              <button
                                type="button"
                                className="perm-collapse-btn"
                                onClick={() => toggleResourceCollapse(resId)}
                                aria-expanded={!collapsed}
                              >
                                <span aria-hidden>{collapsed ? '▸' : '▾'}</span>
                                <span className="perm-resource-title">{resourceLabel(resource)}</span>
                                {showTechnicalKeys ? (
                                  <code className="perm-resource-code">{resource}</code>
                                ) : null}
                              </button>
                              <span className="ds-badge ds-badge-info">
                                {selectedCount}/{keys.length}
                              </span>
                              {!readOnly ? (
                                <label className="perm-bulk-check">
                                  <input
                                    type="checkbox"
                                    checked={allOn}
                                    ref={(el) => {
                                      if (el) el.indeterminate = someOn;
                                    }}
                                    onChange={(e) => setKeys(keys, e.target.checked)}
                                  />
                                  <span>Todo</span>
                                </label>
                              ) : null}
                            </header>

                            {!collapsed ? (
                              <div className="perm-actions-grid">
                                {perms
                                  .slice()
                                  .sort((a, b) => a.action.localeCompare(b.action))
                                  .map((p) => {
                                    const key = permKey(p);
                                    return (
                                      <label key={p.id} className="perm-action-item">
                                        <input
                                          type="checkbox"
                                          checked={selectedSet.has(key)}
                                          disabled={readOnly}
                                          onChange={() => toggleKey(key)}
                                        />
                                        <span className="perm-action-label">
                                          {actionLabel(p.action).replace(/^\w/, (c) => c.toUpperCase())}
                                        </span>
                                        {showTechnicalKeys ? (
                                          <span className="perm-action-key">{p.action}</span>
                                        ) : null}
                                      </label>
                                    );
                                  })}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                  </div>
                ) : null}
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}

export { ADMIN_MODULES };
