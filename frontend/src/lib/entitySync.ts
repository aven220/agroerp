import { useEffect, useRef } from 'react';

export type EntitySyncKind =
  | 'producer'
  | 'farm'
  | 'lot'
  | 'form'
  | 'purchase'
  | 'inventory'
  | 'document'
  | 'workflow'
  | 'capture';

export interface EntitySyncDetail {
  kind: EntitySyncKind;
  id: string;
}

const URE_KIND_MAP: Record<string, EntitySyncKind> = {
  Producer: 'producer',
  Farm: 'farm',
  Lot: 'lot',
};

export function notifyEntityUpdated(kind: EntitySyncKind, id: string) {
  window.dispatchEvent(
    new CustomEvent<EntitySyncDetail>('agroerp:entity-updated', { detail: { kind, id } }),
  );
}

export function matchesEntityUpdate(
  detail: EntitySyncDetail,
  kinds?: EntitySyncKind | EntitySyncKind[],
  recordId?: string,
  entityType?: string,
): boolean {
  const allowed = kinds
    ? Array.isArray(kinds)
      ? kinds
      : [kinds]
    : null;

  if (allowed && !allowed.includes(detail.kind)) {
    if (!entityType || URE_KIND_MAP[entityType] !== detail.kind) return false;
  }

  if (recordId && detail.id !== recordId && detail.id !== '*') {
    return false;
  }

  return true;
}

export function useOnEntityUpdated(
  reload: () => void,
  kinds?: EntitySyncKind | EntitySyncKind[],
  recordId?: string,
  entityType?: string,
) {
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useEffect(() => {
    const onEntityUpdated = (event: Event) => {
      const detail = (event as CustomEvent<EntitySyncDetail>).detail;
      if (!detail) {
        reloadRef.current();
        return;
      }
      if (matchesEntityUpdate(detail, kinds, recordId, entityType)) {
        reloadRef.current();
      }
    };
    window.addEventListener('agroerp:entity-updated', onEntityUpdated);
    return () => window.removeEventListener('agroerp:entity-updated', onEntityUpdated);
  }, [kinds, recordId, entityType]);
}
