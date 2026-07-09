export type EntitySyncKind = 'producer' | 'farm' | 'lot' | 'form' | 'purchase' | 'inventory';

export function notifyEntityUpdated(kind: EntitySyncKind, id: string) {
  window.dispatchEvent(
    new CustomEvent('agroerp:entity-updated', { detail: { kind, id } }),
  );
}
