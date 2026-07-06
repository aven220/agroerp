export type EimsMovementType =
  | 'entry'
  | 'exit'
  | 'transfer'
  | 'adjustment_positive'
  | 'adjustment_negative'
  | 'reservation'
  | 'release'
  | 'block'
  | 'unblock'
  | 'transformation'
  | 'consumption'
  | 'production'
  | 'return'
  | 'shrinkage'
  | 'loss'
  | 'donation'
  | 'intercompany_transfer';

export const EIMS_MOVEMENT_TYPES_PHASE2: Array<{ entryKey: EimsMovementType; name: string }> = [
  { entryKey: 'entry', name: 'Entrada' },
  { entryKey: 'exit', name: 'Salida' },
  { entryKey: 'transfer', name: 'Traslado' },
  { entryKey: 'adjustment_positive', name: 'Ajuste positivo' },
  { entryKey: 'adjustment_negative', name: 'Ajuste negativo' },
  { entryKey: 'reservation', name: 'Reserva' },
  { entryKey: 'release', name: 'Liberación de reserva' },
  { entryKey: 'block', name: 'Bloqueo' },
  { entryKey: 'unblock', name: 'Desbloqueo' },
  { entryKey: 'transformation', name: 'Transformación' },
  { entryKey: 'consumption', name: 'Consumo' },
  { entryKey: 'production', name: 'Producción' },
  { entryKey: 'return', name: 'Devolución' },
  { entryKey: 'shrinkage', name: 'Merma' },
  { entryKey: 'loss', name: 'Pérdida' },
  { entryKey: 'donation', name: 'Donación' },
  { entryKey: 'intercompany_transfer', name: 'Transferencia entre empresas' },
];

export interface StockSnapshot {
  onHandQty: number;
  reservedQty: number;
  blockedQty: number;
  availableQty: number;
  averageCost: number;
  totalCost: number;
}

export interface BalanceDelta {
  onHandDelta: number;
  reservedDelta: number;
  blockedDelta: number;
  costDelta: number;
  requiresSource: boolean;
  requiresDestination: boolean;
}

export function generateMovementKey(type: EimsMovementType, seq = 1): string {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `EMV-${type.toUpperCase().slice(0, 8)}-${stamp}-${String(seq).padStart(4, '0')}`;
}

export function generateBatchKey(): string {
  return `BATCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function locationScope(locationId?: string | null): string {
  return locationId ?? '_';
}

export function computeAvailable(onHand: number, reserved: number, blocked: number): number {
  return Number(Math.max(0, onHand - reserved - blocked).toFixed(6));
}

export function movementDelta(type: EimsMovementType, quantity: number, unitCost = 0): BalanceDelta {
  const qty = Math.abs(quantity);
  const cost = qty * unitCost;
  switch (type) {
    case 'entry':
    case 'adjustment_positive':
    case 'production':
    case 'return':
      return { onHandDelta: qty, reservedDelta: 0, blockedDelta: 0, costDelta: cost, requiresSource: false, requiresDestination: true };
    case 'exit':
    case 'adjustment_negative':
    case 'consumption':
    case 'shrinkage':
    case 'loss':
    case 'donation':
    case 'transformation':
      return { onHandDelta: -qty, reservedDelta: 0, blockedDelta: 0, costDelta: -cost, requiresSource: true, requiresDestination: false };
    case 'reservation':
      return { onHandDelta: 0, reservedDelta: qty, blockedDelta: 0, costDelta: 0, requiresSource: true, requiresDestination: false };
    case 'release':
      return { onHandDelta: 0, reservedDelta: -qty, blockedDelta: 0, costDelta: 0, requiresSource: true, requiresDestination: false };
    case 'block':
      return { onHandDelta: 0, reservedDelta: 0, blockedDelta: qty, costDelta: 0, requiresSource: true, requiresDestination: false };
    case 'unblock':
      return { onHandDelta: 0, reservedDelta: 0, blockedDelta: -qty, costDelta: 0, requiresSource: true, requiresDestination: false };
    case 'transfer':
    case 'intercompany_transfer':
      return { onHandDelta: -qty, reservedDelta: 0, blockedDelta: 0, costDelta: -cost, requiresSource: true, requiresDestination: true };
    default:
      return { onHandDelta: 0, reservedDelta: 0, blockedDelta: 0, costDelta: 0, requiresSource: false, requiresDestination: false };
  }
}

export function applyDelta(snapshot: StockSnapshot, delta: BalanceDelta): StockSnapshot {
  const onHandQty = Number((snapshot.onHandQty + delta.onHandDelta).toFixed(6));
  const reservedQty = Number(Math.max(0, snapshot.reservedQty + delta.reservedDelta).toFixed(6));
  const blockedQty = Number(Math.max(0, snapshot.blockedQty + delta.blockedDelta).toFixed(6));
  const totalCost = Number(Math.max(0, snapshot.totalCost + delta.costDelta).toFixed(6));
  const averageCost = onHandQty > 0 ? Number((totalCost / onHandQty).toFixed(6)) : 0;
  return {
    onHandQty,
    reservedQty,
    blockedQty,
    availableQty: computeAvailable(onHandQty, reservedQty, blockedQty),
    averageCost,
    totalCost,
  };
}

export function validateStockAvailability(
  snapshot: StockSnapshot,
  type: EimsMovementType,
  quantity: number,
  allowNegative: boolean,
): string | null {
  const qty = Math.abs(quantity);
  if (type === 'reservation' && snapshot.availableQty < qty) {
    return `Disponible insuficiente (${snapshot.availableQty}) para reservar ${qty}`;
  }
  if (type === 'block' && snapshot.availableQty < qty) {
    return `Disponible insuficiente (${snapshot.availableQty}) para bloquear ${qty}`;
  }
  if (type === 'release' && snapshot.reservedQty < qty) {
    return `Reservado insuficiente (${snapshot.reservedQty})`;
  }
  if (type === 'unblock' && snapshot.blockedQty < qty) {
    return `Bloqueado insuficiente (${snapshot.blockedQty})`;
  }
  const delta = movementDelta(type, qty);
  if (delta.onHandDelta < 0 && !allowNegative && snapshot.availableQty < Math.abs(delta.onHandDelta)) {
    return `Existencias disponibles insuficientes (${snapshot.availableQty}) para ${type} de ${qty}`;
  }
  return null;
}

export function validateMovementInput(input: {
  movementType: EimsMovementType;
  quantity: number;
  fromWarehouseId?: string | null;
  toWarehouseId?: string | null;
  trackLot?: boolean;
  lotKey?: string | null;
  trackSerial?: boolean;
  serialNumber?: string | null;
  trackExpiry?: boolean;
  expiryDate?: Date | string | null;
}): string | null {
  if (!input.quantity || input.quantity <= 0) return 'Cantidad inválida';
  const delta = movementDelta(input.movementType, input.quantity);
  if (delta.requiresSource && !input.fromWarehouseId) return 'Bodega de origen requerida';
  if (delta.requiresDestination && !input.toWarehouseId) return 'Bodega de destino requerida';
  if (input.movementType === 'transfer' || input.movementType === 'intercompany_transfer') {
    if (!input.fromWarehouseId || !input.toWarehouseId) return 'Traslado requiere origen y destino';
    if (input.fromWarehouseId === input.toWarehouseId && !input.toWarehouseId) {
      // same warehouse transfer between locations is allowed
    }
  }
  if (input.trackLot && !input.lotKey && delta.requiresDestination) {
    // lot can be auto-generated on entry
  }
  if (input.trackSerial && !input.serialNumber && ['entry', 'production'].includes(input.movementType)) {
    return 'Número de serie requerido';
  }
  if (input.trackExpiry && !input.expiryDate && ['entry', 'production'].includes(input.movementType)) {
    return 'Fecha de vencimiento requerida';
  }
  return null;
}

export function parseCsvMovements(csv: string): Array<Record<string, string>> {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? '';
    });
    return row;
  });
}
