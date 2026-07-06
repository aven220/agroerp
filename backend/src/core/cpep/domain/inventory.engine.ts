export type InventoryMovementType =
  | 'entry'
  | 'transfer'
  | 'adjustment'
  | 'transformation'
  | 'exit'
  | 'reservation'
  | 'block'
  | 'release';

export type InventoryLotStatus =
  | 'available'
  | 'reserved'
  | 'blocked'
  | 'in_transit'
  | 'transformed'
  | 'dispatched'
  | 'sold'
  | 'closed';

export interface CostSnapshot {
  unitCost: number;
  averageCost: number;
  totalCost: number;
  quantityKg: number;
}

export interface KardexDelta {
  entryKg: number;
  exitKg: number;
  balanceKg: number;
  unitCost: number;
  averageCost: number;
  totalCost: number;
  balanceCost: number;
}

export function generateInventoryLotKey(ticketKey: string): string {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 12);
  return `LOT-INV-${ticketKey.slice(0, 12)}-${stamp}`.toUpperCase();
}

export function generateLotCodes(lotKey: string) {
  return {
    qrCode: `CPEP-INV:${lotKey}`,
    barcode: lotKey.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 24),
  };
}

export function generateMovementKey(lotKey: string, type: InventoryMovementType, seq = 1): string {
  return `MOV-${type.toUpperCase()}-${lotKey.slice(0, 16)}-${String(seq).padStart(3, '0')}`;
}

export function computeAverageCost(
  currentQty: number,
  currentAvgCost: number,
  incomingQty: number,
  incomingUnitCost: number,
): number {
  const totalQty = currentQty + incomingQty;
  if (totalQty <= 0) return incomingUnitCost;
  const totalValue = currentQty * currentAvgCost + incomingQty * incomingUnitCost;
  return Number((totalValue / totalQty).toFixed(6));
}

export function applyMovementToBalances(
  availableKg: number,
  reservedKg: number,
  blockedKg: number,
  type: InventoryMovementType,
  quantityKg: number,
): { availableKg: number; reservedKg: number; blockedKg: number; status: InventoryLotStatus } {
  let available = availableKg;
  let reserved = reservedKg;
  let blocked = blockedKg;

  switch (type) {
    case 'entry':
    case 'release':
      available += quantityKg;
      if (type === 'release') reserved = Math.max(0, reserved - quantityKg);
      break;
    case 'exit':
    case 'transformation':
      available = Math.max(0, available - quantityKg);
      break;
    case 'transfer':
      // transfer out from current warehouse balance handled by caller
      available = Math.max(0, available - quantityKg);
      break;
    case 'adjustment':
      available = Math.max(0, available + quantityKg);
      break;
    case 'reservation':
      available = Math.max(0, available - quantityKg);
      reserved += quantityKg;
      break;
    case 'block':
      available = Math.max(0, available - quantityKg);
      blocked += quantityKg;
      break;
    default:
      break;
  }

  let status: InventoryLotStatus = 'available';
  if (available <= 0 && reserved <= 0 && blocked <= 0) status = 'closed';
  else if (blocked > 0 && available <= 0) status = 'blocked';
  else if (reserved > 0 && available <= 0) status = 'reserved';
  else if (type === 'transformation') status = 'transformed';
  else if (type === 'exit') status = available > 0 ? 'available' : 'dispatched';

  return {
    availableKg: Number(available.toFixed(3)),
    reservedKg: Number(reserved.toFixed(3)),
    blockedKg: Number(blocked.toFixed(3)),
    status,
  };
}

export function buildKardexDelta(
  previousBalanceKg: number,
  previousBalanceCost: number,
  type: InventoryMovementType,
  quantityKg: number,
  unitCost: number,
  averageCost: number,
): KardexDelta {
  const isEntry = type === 'entry' || type === 'release' || (type === 'adjustment' && quantityKg > 0);
  const qty = Math.abs(quantityKg);
  const entryKg = isEntry ? qty : 0;
  const exitKg = isEntry ? 0 : qty;
  const balanceKg = Number((previousBalanceKg + entryKg - exitKg).toFixed(3));
  const movementCost = qty * (isEntry ? unitCost : averageCost);
  const balanceCost = Number(
    Math.max(0, previousBalanceCost + (isEntry ? movementCost : -movementCost)).toFixed(2),
  );
  return {
    entryKg,
    exitKg,
    balanceKg,
    unitCost,
    averageCost,
    totalCost: Number(movementCost.toFixed(2)),
    balanceCost,
  };
}

export const TRACE_STAGES = [
  'producer',
  'farm',
  'agricultural_lot',
  'purchase',
  'weighing',
  'quality',
  'settlement',
  'inventory',
  'movement',
  'transformation',
  'dispatch',
  'sale',
] as const;

export type TraceStage = (typeof TRACE_STAGES)[number];
