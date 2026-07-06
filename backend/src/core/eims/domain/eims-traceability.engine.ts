export type EimsLotStatusValue =
  | 'available'
  | 'reserved'
  | 'blocked'
  | 'expired'
  | 'quarantined'
  | 'transformed'
  | 'dispatched'
  | 'sold'
  | 'closed';

export type EimsTransformTypeValue =
  | 'split'
  | 'merge'
  | 'mix'
  | 'repack'
  | 'presentation_change'
  | 'industrial_process';

export type EimsTraceStage =
  | 'producer'
  | 'farm'
  | 'agricultural_lot'
  | 'purchase'
  | 'weighing'
  | 'quality'
  | 'settlement'
  | 'inventory_entry'
  | 'movement'
  | 'transfer'
  | 'transformation'
  | 'mix'
  | 'split'
  | 'dispatch'
  | 'sale'
  | 'customer'
  | 'document'
  | 'incident'
  | 'reclassification'
  | 'expiry'
  | 'serial'
  | 'maintenance';

export function generateLotKey(itemKey: string, seq = 1): string {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `LOT-${itemKey}-${stamp}-${String(seq).padStart(4, '0')}`;
}

export function generateLotQrCode(lotKey: string, itemKey?: string): string {
  return itemKey ? `EIMS:LOT:${itemKey}:${lotKey}` : `EIMS:LOT:${lotKey}:${Date.now().toString(36)}`;
}

export function generateLotBarcode(lotKey: string, itemKey?: string): string {
  const compact = `${itemKey ?? ''}${lotKey}`.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return compact.slice(0, 32) || `LOT${Date.now()}`;
}

export function generateTransformationKey(type: EimsTransformTypeValue, seq = 1): string {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `TRF-${type.toUpperCase().slice(0, 8)}-${stamp}-${String(seq).padStart(4, '0')}`;
}

export function generateTraceEventKey(lotKey: string, stage: string, seq = 1): string {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `TRC-${lotKey.slice(0, 24)}-${stage.slice(0, 12)}-${stamp}-${String(seq).padStart(3, '0')}`;
}

export function generateSerialKey(prefix = 'SER'): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function generateIncidentKey(lotKey: string): string {
  return `INC-${lotKey.slice(0, 20)}-${Date.now()}`;
}

export function generateAlertKey(lotKey: string, daysToExpiry: number): string {
  return `EXP-${lotKey}-${daysToExpiry}`;
}

export function daysToExpiry(expiryDate: Date | string | null | undefined, now = new Date()): number | null {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  return Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

export function computeExpiryDate(productionDate: Date | string, shelfLifeDays: number): Date {
  const d = new Date(productionDate);
  d.setUTCDate(d.getUTCDate() + shelfLifeDays);
  return d;
}

export function isExpired(expiryDate: Date | string | null | undefined, now = new Date()): boolean {
  const days = daysToExpiry(expiryDate, now);
  return days !== null && days < 0;
}

export function expiryAlertSeverity(days: number | null): 'critical' | 'warning' | 'info' | null {
  if (days === null) return null;
  if (days < 0) return 'critical';
  if (days <= 7) return 'critical';
  if (days <= 30) return 'warning';
  if (days <= 60) return 'info';
  return null;
}

export function shouldBlockExpiredLot(
  status: string,
  expiryDate: Date | string | null | undefined,
  blockOnExpiry: boolean,
  now = new Date(),
): boolean {
  if (status === 'blocked' || status === 'expired' || status === 'quarantined') return true;
  return blockOnExpiry && isExpired(expiryDate, now);
}

export function resolveLotStatusAfterQty(
  onHandQty: number,
  reservedQty: number,
  blockedQty: number,
  expiryDate?: Date | string | null,
  forceStatus?: EimsLotStatusValue,
): EimsLotStatusValue {
  if (forceStatus) return forceStatus;
  if (onHandQty <= 0) return 'closed';
  if (isExpired(expiryDate)) return 'expired';
  if (blockedQty > 0) return 'blocked';
  if (reservedQty > 0) return 'reserved';
  return 'available';
}

export interface GenealogyNode {
  lotKey: string;
  role: 'self' | 'parent' | 'child' | 'ancestor' | 'descendant';
  transformType?: string | null;
  quantity?: number | null;
  children: GenealogyNode[];
  parents: GenealogyNode[];
}

export function buildGenealogyTree(
  lotKey: string,
  links: Array<{ parentLotKey: string; childLotKey: string; transformType?: string | null; quantity?: number | null }>,
  maxDepth = 12,
): GenealogyNode {
  const parentsOf = new Map<string, typeof links>();
  const childrenOf = new Map<string, typeof links>();
  for (const link of links) {
    const p = parentsOf.get(link.childLotKey) ?? [];
    p.push(link);
    parentsOf.set(link.childLotKey, p);
    const c = childrenOf.get(link.parentLotKey) ?? [];
    c.push(link);
    childrenOf.set(link.parentLotKey, c);
  }

  const walkParents = (key: string, depth: number, seen: Set<string>): GenealogyNode[] => {
    if (depth >= maxDepth || seen.has(key)) return [];
    seen.add(key);
    return (parentsOf.get(key) ?? []).map((link) => ({
      lotKey: link.parentLotKey,
      role: depth === 0 ? 'parent' : 'ancestor',
      transformType: link.transformType,
      quantity: link.quantity,
      children: [],
      parents: walkParents(link.parentLotKey, depth + 1, new Set(seen)),
    }));
  };

  const walkChildren = (key: string, depth: number, seen: Set<string>): GenealogyNode[] => {
    if (depth >= maxDepth || seen.has(key)) return [];
    seen.add(key);
    return (childrenOf.get(key) ?? []).map((link) => ({
      lotKey: link.childLotKey,
      role: depth === 0 ? 'child' : 'descendant',
      transformType: link.transformType,
      quantity: link.quantity,
      children: walkChildren(link.childLotKey, depth + 1, new Set(seen)),
      parents: [],
    }));
  };

  return {
    lotKey,
    role: 'self',
    children: walkChildren(lotKey, 0, new Set()),
    parents: walkParents(lotKey, 0, new Set()),
  };
}

export function collectAncestryKeys(tree: GenealogyNode): string[] {
  const keys = new Set<string>();
  const walk = (node: GenealogyNode) => {
    keys.add(node.lotKey);
    for (const p of node.parents) walk(p);
    for (const c of node.children) walk(c);
  };
  walk(tree);
  return [...keys];
}

export function validateTransformInput(input: {
  transformType: EimsTransformTypeValue;
  parents: Array<{ lotKey: string; quantity: number }>;
  children: Array<{ lotKey?: string; quantity: number; itemKey?: string }>;
}): string | null {
  if (!input.parents.length) return 'Se requiere al menos un lote origen';
  if (!input.children.length) return 'Se requiere al menos un lote destino';
  if (input.parents.some((p) => p.quantity <= 0)) return 'Cantidad de origen inválida';
  if (input.children.some((c) => c.quantity <= 0)) return 'Cantidad de destino inválida';
  if (input.transformType === 'split' && input.parents.length !== 1) {
    return 'División requiere un único lote origen';
  }
  if (input.transformType === 'merge' && input.parents.length < 2) {
    return 'Unificación requiere al menos dos lotes origen';
  }
  if (input.transformType === 'mix' && input.parents.length < 2) {
    return 'Mezcla requiere al menos dos lotes origen';
  }
  const parentKeys = new Set(input.parents.map((p) => p.lotKey));
  for (const child of input.children) {
    if (child.lotKey && parentKeys.has(child.lotKey)) {
      return 'El lote destino no puede ser igual a un origen';
    }
  }
  return null;
}

export function allocateParentCost(
  parents: Array<{ quantity: number; unitCost: number; accumulatedCost: number }>,
  childQty: number,
  totalChildQty: number,
): { unitCost: number; accumulatedCost: number } {
  const totalParentQty = parents.reduce((s, p) => s + p.quantity, 0);
  const totalParentCost = parents.reduce(
    (s, p) => s + (p.accumulatedCost > 0 ? p.accumulatedCost : p.quantity * p.unitCost),
    0,
  );
  if (totalParentQty <= 0 || totalChildQty <= 0) {
    return { unitCost: 0, accumulatedCost: 0 };
  }
  const share = childQty / totalChildQty;
  const accumulatedCost = Number((totalParentCost * share).toFixed(6));
  const unitCost = Number((accumulatedCost / childQty).toFixed(6));
  return { unitCost, accumulatedCost };
}

export function movementStage(movementType: string): EimsTraceStage {
  switch (movementType) {
    case 'transfer':
    case 'intercompany_transfer':
      return 'transfer';
    case 'transformation':
      return 'transformation';
    case 'entry':
    case 'production':
    case 'return':
      return 'inventory_entry';
    case 'exit':
    case 'donation':
      return 'dispatch';
    default:
      return 'movement';
  }
}
