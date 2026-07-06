export type EimsReservationTypeValue =
  | 'sales_order'
  | 'work_order'
  | 'production'
  | 'customer'
  | 'project'
  | 'temporary';

export type EimsSuggestionTypeValue = 'purchase' | 'transfer' | 'production' | 'replenishment';

export interface StockLevelConfig {
  minStock: number;
  maxStock?: number | null;
  safetyStock: number;
  reorderPoint: number;
  economicOrderQty?: number | null;
  coverageDays?: number | null;
  leadTimeDays: number;
  seasonalityFactor?: number;
}

export interface StockPosition {
  onHandQty: number;
  reservedQty: number;
  availableQty: number;
  incomingQty?: number;
}

export function generateReservationKey(type: EimsReservationTypeValue, seq = 1): string {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `RSV-${type.toUpperCase().slice(0, 8)}-${stamp}-${String(seq).padStart(4, '0')}`;
}

export function generateProfileKey(itemKey: string, warehouseKey?: string | null): string {
  return warehouseKey ? `LVL-${itemKey}-${warehouseKey}` : `LVL-${itemKey}-GLOBAL`;
}

export function generateSuggestionKey(type: EimsSuggestionTypeValue, itemKey: string, seq = 1): string {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `SUG-${type.toUpperCase().slice(0, 6)}-${itemKey.slice(0, 12)}-${stamp}-${seq}`;
}

export function generateForecastKey(itemKey: string, periodStart: string): string {
  return `FC-${itemKey.slice(0, 20)}-${periodStart.replace(/-/g, '')}`;
}

export function generateScenarioKey(name: string): string {
  const slug = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 16);
  return `SCN-${slug}-${Date.now()}`;
}

export function generateSupplyAlertKey(alertType: string, itemKey: string, warehouseKey?: string): string {
  return `SAL-${alertType}-${itemKey}-${warehouseKey ?? 'ALL'}-${Date.now()}`;
}

export function generateCalendarEventKey(prefix: string): string {
  return `CAL-${prefix}-${Date.now()}`;
}

export function computeAvailableQty(position: StockPosition): number {
  return Number(Math.max(0, position.onHandQty - position.reservedQty).toFixed(6));
}

export function resolveEffectiveLevels(
  itemDefaults: Partial<StockLevelConfig>,
  profile?: Partial<StockLevelConfig> | null,
): StockLevelConfig {
  const merged = { ...itemDefaults, ...(profile ?? {}) };
  const minStock = merged.minStock ?? 0;
  const safetyStock = merged.safetyStock ?? minStock;
  const reorderPoint = merged.reorderPoint ?? minStock + safetyStock;
  return {
    minStock,
    maxStock: merged.maxStock ?? null,
    safetyStock,
    reorderPoint,
    economicOrderQty: merged.economicOrderQty ?? null,
    coverageDays: merged.coverageDays ?? null,
    leadTimeDays: merged.leadTimeDays ?? 7,
    seasonalityFactor: merged.seasonalityFactor ?? 1,
  };
}

export function computeReplenishmentQty(
  position: StockPosition,
  levels: StockLevelConfig,
  dailyDemand = 0,
): { suggestedQty: number; targetQty: number; reason: string } {
  const available = computeAvailableQty(position);
  const seasonality = levels.seasonalityFactor ?? 1;
  const adjustedDemand = dailyDemand * seasonality;
  const coverageTarget =
    levels.coverageDays != null && levels.coverageDays > 0
      ? adjustedDemand * levels.coverageDays
      : levels.maxStock ?? levels.reorderPoint + (levels.economicOrderQty ?? 0);

  let targetQty = coverageTarget;
  if (levels.maxStock != null && levels.maxStock > 0) {
    targetQty = Math.min(targetQty, levels.maxStock);
  }
  if (available >= levels.reorderPoint && available >= levels.minStock) {
    return { suggestedQty: 0, targetQty, reason: 'Stock sobre punto de reorden' };
  }

  let suggestedQty = Math.max(0, targetQty - available);
  if (levels.economicOrderQty != null && levels.economicOrderQty > 0) {
    const eoq = levels.economicOrderQty;
    suggestedQty = Math.ceil(suggestedQty / eoq) * eoq;
  }
  const reason =
    available < levels.safetyStock
      ? 'Bajo stock de seguridad'
      : available < levels.minStock
        ? 'Bajo stock mínimo'
        : 'Bajo punto de reorden';
  return { suggestedQty: Number(suggestedQty.toFixed(6)), targetQty, reason };
}

export function computeTransferSuggestion(
  source: { warehouseKey: string; availableQty: number },
  target: { warehouseKey: string; availableQty: number; neededQty: number },
): { suggestedQty: number; fromWarehouseKey: string } | null {
  if (source.warehouseKey === target.warehouseKey) return null;
  if (source.availableQty <= 0 || target.neededQty <= 0) return null;
  const qty = Math.min(source.availableQty, target.neededQty);
  return { suggestedQty: Number(qty.toFixed(6)), fromWarehouseKey: source.warehouseKey };
}

export function movingAverageForecast(history: number[], window = 3): number {
  if (!history.length) return 0;
  const slice = history.slice(-window);
  return Number((slice.reduce((s, v) => s + v, 0) / slice.length).toFixed(6));
}

export function seasonalForecast(history: number[], seasonalityIndex = 1): number {
  const base = movingAverageForecast(history, Math.min(6, history.length || 1));
  return Number((base * seasonalityIndex).toFixed(6));
}

export function projectStockoutDate(
  availableQty: number,
  dailyDemand: number,
  fromDate = new Date(),
): Date | null {
  if (dailyDemand <= 0 || availableQty <= 0) return availableQty <= 0 ? fromDate : null;
  const days = Math.floor(availableQty / dailyDemand);
  const d = new Date(fromDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function computeRotationRate(exitQty: number, avgInventory: number, periodDays: number): number {
  if (avgInventory <= 0 || periodDays <= 0) return 0;
  return Number(((exitQty / avgInventory) * (365 / periodDays)).toFixed(4));
}

export function detectDemandAnomaly(history: number[], threshold = 2): boolean {
  if (history.length < 4) return false;
  const mean = history.reduce((s, v) => s + v, 0) / history.length;
  const variance = history.reduce((s, v) => s + (v - mean) ** 2, 0) / history.length;
  const std = Math.sqrt(variance);
  const last = history[history.length - 1];
  return std > 0 && Math.abs(last - mean) > threshold * std;
}

export function evaluateStockAlerts(input: {
  itemKey: string;
  warehouseKey?: string;
  position: StockPosition;
  levels: StockLevelConfig;
  daysSinceLastMovement?: number;
  expiryWithinDays?: number | null;
  expiredReservations?: number;
}): Array<{ alertType: string; severity: string; title: string; message: string }> {
  const alerts: Array<{ alertType: string; severity: string; title: string; message: string }> = [];
  const available = computeAvailableQty(input.position);

  if (available < input.levels.minStock) {
    alerts.push({
      alertType: 'low_stock',
      severity: available < input.levels.safetyStock ? 'critical' : 'warning',
      title: 'Stock bajo',
      message: `${input.itemKey} disponible ${available} < mínimo ${input.levels.minStock}`,
    });
  }
  if (input.levels.maxStock != null && input.position.onHandQty > input.levels.maxStock) {
    alerts.push({
      alertType: 'overstock',
      severity: 'warning',
      title: 'Sobrestock',
      message: `${input.itemKey} en mano ${input.position.onHandQty} > máximo ${input.levels.maxStock}`,
    });
  }
  if (input.daysSinceLastMovement != null && input.daysSinceLastMovement >= 90 && input.position.onHandQty > 0) {
    alerts.push({
      alertType: 'dead_stock',
      severity: 'info',
      title: 'Inventario inmovilizado',
      message: `${input.itemKey} sin movimiento ${input.daysSinceLastMovement} días`,
    });
  }
  if (input.daysSinceLastMovement != null && input.daysSinceLastMovement >= 30 && input.position.onHandQty > 0) {
    alerts.push({
      alertType: 'no_movement',
      severity: 'info',
      title: 'Sin movimiento',
      message: `${input.itemKey} sin movimiento reciente`,
    });
  }
  if (input.expiryWithinDays != null && input.expiryWithinDays <= 30) {
    alerts.push({
      alertType: 'expiry_soon',
      severity: input.expiryWithinDays <= 7 ? 'critical' : 'warning',
      title: 'Próximo vencimiento',
      message: `${input.itemKey} vence en ${input.expiryWithinDays} días`,
    });
  }
  if ((input.expiredReservations ?? 0) > 0) {
    alerts.push({
      alertType: 'reservation_expired',
      severity: 'warning',
      title: 'Reservas vencidas',
      message: `${input.expiredReservations} reservas vencidas para ${input.itemKey}`,
    });
  }
  return alerts;
}

export function simulateScenario(input: {
  items: Array<{
    itemKey: string;
    availableQty: number;
    dailyDemand: number;
    leadTimeDays: number;
    unitCost: number;
  }>;
  horizonDays: number;
  demandMultiplier?: number;
}): {
  projectedValue: number;
  stockouts: number;
  purchaseNeed: number;
  lines: Array<{ itemKey: string; stockoutDay: number | null; purchaseQty: number }>;
} {
  const multiplier = input.demandMultiplier ?? 1;
  let projectedValue = 0;
  let stockouts = 0;
  let purchaseNeed = 0;
  const lines = input.items.map((item) => {
    const demand = item.dailyDemand * multiplier;
    const stockoutDay =
      demand > 0 && item.availableQty > 0
        ? Math.floor(item.availableQty / demand)
        : item.availableQty <= 0
          ? 0
          : null;
    if (stockoutDay != null && stockoutDay < input.horizonDays) stockouts += 1;
    const purchaseQty =
      stockoutDay != null && stockoutDay < item.leadTimeDays
        ? Math.max(0, demand * input.horizonDays - item.availableQty)
        : 0;
    purchaseNeed += purchaseQty * item.unitCost;
    projectedValue += item.availableQty * item.unitCost;
    return { itemKey: item.itemKey, stockoutDay, purchaseQty: Number(purchaseQty.toFixed(2)) };
  });
  return {
    projectedValue: Number(projectedValue.toFixed(2)),
    stockouts,
    purchaseNeed: Number(purchaseNeed.toFixed(2)),
    lines,
  };
}
