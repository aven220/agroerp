import { useMemo, useState } from 'react';
import type { Permission } from '../../types';

const ACTION_LABELS: Record<string, string> = {
  read: 'Leer',
  create: 'Crear',
  update: 'Editar',
  delete: 'Eliminar',
  submit: 'Enviar',
  publish: 'Publicar',
  approve: 'Aprobar',
  execute: 'Ejecutar',
  assign: 'Asignar',
  import: 'Importar',
  export: 'Exportar',
  admin: 'Administrar',
  design: 'Diseñar',
  cancel: 'Cancelar',
};

const RESOURCE_LABELS: Record<string, string> = {
  producer: 'Productores',
  farm: 'Fincas',
  field_lot: 'Lotes',
  lot: 'Lotes',
  form: 'Formularios',
  user: 'Usuarios',
  role: 'Roles',
  permission: 'Permisos',
  workflow: 'Workflows',
  bpms: 'BPMS',
  resource: 'Recursos',
  event: 'Eventos',
  sync: 'Sincronización',
  audit: 'Auditoría',
  notification: 'Notificaciones',
  alert: 'Alertas',
  analytics: 'Analítica',
  dashboard: 'Dashboards',
  kpi: 'KPIs',
  query: 'Consultas',
  ai: 'IA / Copiloto',
  gis: 'GIS',
  eims: 'Inventario EIMS',
  escm: 'Comercial ESCM',
  emfg: 'Manufactura EMFG',
  epscm: 'Cadena EPSCM',
  eam: 'Activos EAM',
  hcm: 'RRHH HCM',
  efm: 'Finanzas EFM',
  scheduler: 'Scheduler',
  organization: 'Organización',
};

type ModuleDef = {
  id: string;
  label: string;
  match: (resource: string) => boolean;
};

const MODULES: ModuleDef[] = [
  {
    id: 'prm',
    label: 'PRM — Productores',
    match: (r) => r === 'producer' || r.startsWith('producer') || r.startsWith('prm'),
  },
  {
    id: 'ftip',
    label: 'FTIP — Fincas',
    match: (r) => r === 'farm' || r.startsWith('farm') || r.startsWith('ftip'),
  },
  {
    id: 'fmdt',
    label: 'FMDT — Lotes',
    match: (r) =>
      r === 'lot' || r === 'field_lot' || r.startsWith('lot') || r.startsWith('field_lot') || r.startsWith('fmdt'),
  },
  {
    id: 'forms',
    label: 'Formularios UDFE',
    match: (r) => r === 'form' || r.startsWith('form'),
  },
  {
    id: 'iam',
    label: 'Identity & Access',
    match: (r) =>
      ['user', 'role', 'permission', 'organization', 'session'].includes(r) ||
      r.startsWith('iam') ||
      r.startsWith('eiamp'),
  },
  {
    id: 'workflow',
    label: 'Procesos & Workflow',
    match: (r) => r === 'workflow' || r === 'bpms' || r.startsWith('workflow') || r.startsWith('bpms'),
  },
  {
    id: 'ops',
    label: 'Operaciones',
    match: (r) =>
      ['resource', 'event', 'sync', 'audit', 'notification', 'alert', 'scheduler'].includes(r),
  },
  {
    id: 'intel',
    label: 'Inteligencia & BI',
    match: (r) =>
      ['analytics', 'dashboard', 'kpi', 'query', 'ai', 'report'].includes(r) ||
      r.startsWith('bi') ||
      r.startsWith('ebiap'),
  },
  {
    id: 'agritech',
    label: 'AgriTech',
    match: (r) =>
      ['gis', 'eatp', 'eapp', 'eiwp', 'ephp', 'eatr', 'eacc', 'effm', 'eaip'].includes(r) ||
      r.startsWith('gis') ||
      r.startsWith('eatp') ||
      r.startsWith('eapp'),
  },
  {
    id: 'supply',
    label: 'Cadena & Inventario',
    match: (r) =>
      ['eims', 'epscm', 'escm'].includes(r) ||
      r.startsWith('eims') ||
      r.startsWith('epscm') ||
      r.startsWith('escm'),
  },
  {
    id: 'mfg',
    label: 'Manufactura & Activos',
    match: (r) =>
      ['emfg', 'eam', 'hcm', 'efm'].includes(r) ||
      r.startsWith('emfg') ||
      r.startsWith('eam') ||
      r.startsWith('hcm') ||
      r.startsWith('efm'),
  },
];

function resolveModule(resource: string): ModuleDef {
  return MODULES.find((m) => m.match(resource)) ?? {
    id: 'other',
    label: 'Otros módulos',
    match: () => true,
  };
}

function resourceLabel(resource: string): string {
  return RESOURCE_LABELS[resource] ?? resource.replace(/_/g, ' ');
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, ' ').replace(/:/g, ' · ');
}

function permKey(p: Permission): string {
  return `${p.resource}:${p.action}`;
}

export interface PermissionMatrixProps {
  permissions: Permission[];
  selected: string[];
  onChange: (next: string[]) => void;
  readOnly?: boolean;
}

export function PermissionMatrix({
  permissions,
  selected,
  onChange,
  readOnly = false,
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
      const mod = resolveModule(p.resource).label.toLowerCase();
      const res = resourceLabel(p.resource).toLowerCase();
      const act = actionLabel(p.action).toLowerCase();
      return key.includes(q) || mod.includes(q) || res.includes(q) || act.includes(q);
    });
  }, [permissions, search]);

  const tree = useMemo(() => {
    const byModule = new Map<
      string,
      {
        module: ModuleDef;
        resources: Map<string, Permission[]>;
      }
    >();

    for (const p of filtered) {
      const mod = resolveModule(p.resource);
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
            placeholder="Buscar módulo, recurso o permiso…"
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
            <div className="ds-empty-state-desc">Prueba otro término de búsqueda.</div>
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
                    <strong>{module.label}</strong>
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
                      <span>Módulo</span>
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
                                <code className="perm-resource-code">{resource}</code>
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
                                  <span>Grupo</span>
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
                                        <span className="perm-action-label">{actionLabel(p.action)}</span>
                                        <span className="perm-action-key">{p.action}</span>
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
