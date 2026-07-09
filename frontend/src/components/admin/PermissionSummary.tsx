import { useMemo } from 'react';
import type { Permission } from '../../types';
import {
  ADMIN_MODULES,
  describePermission,
  permKey,
  resolveAdminModule,
  resourceLabel,
} from '../../lib/adminPermissions';

interface PermissionSummaryProps {
  permissions: Permission[];
  selected: string[];
  roleName?: string;
  compact?: boolean;
}

export function PermissionSummary({
  permissions,
  selected,
  roleName,
  compact = false,
}: PermissionSummaryProps) {
  const summary = useMemo(() => {
    const selectedPerms = permissions.filter((p) => selected.includes(permKey(p)));
    const byModule = new Map<string, { label: string; description: string; items: string[] }>();

    for (const p of selectedPerms) {
      const mod = resolveAdminModule(p.resource);
      if (!byModule.has(mod.id)) {
        byModule.set(mod.id, {
          label: mod.label,
          description: mod.description,
          items: [],
        });
      }
      const bucket = byModule.get(mod.id)!;
      const line = describePermission(p);
      if (!bucket.items.includes(line)) bucket.items.push(line);
    }

    return Array.from(byModule.values()).sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, [permissions, selected]);

  if (selected.length === 0) {
    return (
      <div className="admin-perm-summary admin-perm-summary-empty">
        <p className="admin-perm-summary-title">Sin permisos seleccionados</p>
        <p className="muted">
          {roleName
            ? `El rol «${roleName}» no podrá realizar acciones hasta que seleccione permisos.`
            : 'Seleccione permisos para ver un resumen de las capacidades del rol.'}
        </p>
      </div>
    );
  }

  return (
    <div className="admin-perm-summary">
      <header className="admin-perm-summary-head">
        <div>
          <p className="admin-perm-summary-title">
            {roleName ? `Resumen: ${roleName}` : 'Resumen de permisos'}
          </p>
          <p className="muted">
            {selected.length} permiso{selected.length === 1 ? '' : 's'} en {summary.length} área
            {summary.length === 1 ? '' : 's'}
          </p>
        </div>
      </header>

      {compact ? (
        <ul className="admin-perm-summary-list">
          {summary.flatMap((mod) =>
            mod.items.slice(0, 3).map((item) => <li key={item}>{item}</li>),
          )}
          {selected.length > 6 ? (
            <li className="muted">… y {selected.length - 6} permisos más</li>
          ) : null}
        </ul>
      ) : (
        <div className="admin-perm-summary-modules">
          {summary.map((mod) => (
            <section key={mod.label} className="admin-perm-summary-module">
              <h4>{mod.label}</h4>
              {!compact ? <p className="muted admin-perm-summary-desc">{mod.description}</p> : null}
              <ul>
                {mod.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {summary.length === 0 && selected.length > 0 ? (
        <ul className="admin-perm-summary-list">
          {selected.slice(0, 8).map((key) => {
            const [resource, action] = key.split(':');
            return (
              <li key={key}>
                Puede {action} {resourceLabel(resource)}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function PermissionModuleLegend() {
  return (
    <div className="admin-module-legend">
      {ADMIN_MODULES.map((mod) => (
        <div key={mod.id} className="admin-module-legend-item">
          <strong>{mod.label}</strong>
          <span className="muted">{mod.description}</span>
        </div>
      ))}
    </div>
  );
}
