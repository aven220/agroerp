import { useMemo } from 'react';
import type { Permission } from '../../types';
import {
  humanPermissionPhrase,
  NOTABLE_CAPABILITIES,
} from '../../lib/adminFunctionalAreas';
import { permKey } from '../../lib/adminPermissions';

interface PermissionReviewProps {
  permissions: Permission[];
  selected: string[];
  roleName: string;
}

export function PermissionReview({ permissions, selected, roleName }: PermissionReviewProps) {
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const canDo = useMemo(() => {
    const lines: string[] = [];
    for (const p of permissions) {
      const key = permKey(p);
      if (!selectedSet.has(key)) continue;
      const line = humanPermissionPhrase(p.resource, p.action);
      if (!lines.includes(line)) lines.push(line);
    }
    return lines.sort((a, b) => a.localeCompare(b, 'es'));
  }, [permissions, selectedSet]);

  const cannotDo = useMemo(() => {
    const missing: string[] = [];
    for (const cap of NOTABLE_CAPABILITIES) {
      const key = `${cap.resource}:${cap.action}`;
      const exists = permissions.some((p) => permKey(p) === key);
      if (exists && !selectedSet.has(key)) {
        missing.push(cap.label);
      }
    }
    if (missing.length < 3) {
      for (const p of permissions) {
        const key = permKey(p);
        if (selectedSet.has(key)) continue;
        const line = humanPermissionPhrase(p.resource, p.action);
        if (!missing.includes(line) && missing.length < 8) {
          const sensitive = ['admin', 'delete', 'user', 'role', 'permission'].some(
            (s) => p.resource.includes(s) || p.action === s,
          );
          if (sensitive) missing.push(line);
        }
      }
    }
    return missing.slice(0, 8);
  }, [permissions, selectedSet]);

  return (
    <div className="admin-perm-review">
      <section className="admin-perm-review-section admin-perm-review-section--can">
        <h3>El rol «{roleName}» podrá:</h3>
        {canDo.length === 0 ? (
          <p className="muted">Aún no tiene permisos seleccionados.</p>
        ) : (
          <ul>
            {canDo.map((line) => (
              <li key={line}>
                <span className="admin-perm-review-mark admin-perm-review-mark--yes" aria-hidden>
                  ✔
                </span>
                {line}
              </li>
            ))}
          </ul>
        )}
      </section>

      {cannotDo.length > 0 ? (
        <section className="admin-perm-review-section admin-perm-review-section--cannot">
          <h3>No podrá:</h3>
          <ul>
            {cannotDo.map((line) => (
              <li key={line}>
                <span className="admin-perm-review-mark admin-perm-review-mark--no" aria-hidden>
                  ✖
                </span>
                {line}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
