import { roundQty } from './epscm-planning.engine';

export type WmsLocationCandidate = {
  locationKey: string;
  code: string;
  capacityQty: number;
  occupiedQty: number;
  mapX?: number | null;
  mapY?: number | null;
};

export function generateEpscmWmsKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

export function computeOccupancyPct(occupiedQty: number, capacityQty: number): number {
  if (capacityQty <= 0) return occupiedQty > 0 ? 100 : 0;
  return roundQty((occupiedQty / capacityQty) * 100, 2);
}

export function canStoreAtLocation(occupiedQty: number, capacityQty: number, addQty: number): boolean {
  if (capacityQty <= 0) return true;
  return roundQty(occupiedQty + addQty, 4) <= capacityQty;
}

export function suggestLocation(
  candidates: WmsLocationCandidate[],
  requiredQty: number,
  preferFixed = true,
): WmsLocationCandidate | null {
  const available = candidates
    .filter((c) => canStoreAtLocation(c.occupiedQty, c.capacityQty, requiredQty))
    .sort((a, b) => {
      const aFree = (a.capacityQty || 999999) - a.occupiedQty;
      const bFree = (b.capacityQty || 999999) - b.occupiedQty;
      return preferFixed ? aFree - bFree : bFree - aFree;
    });
  return available[0] ?? null;
}

export function computePickVariance(requestedQty: number, pickedQty: number): number {
  return roundQty(pickedQty - requestedQty, 4);
}

export function computeReceiptVariance(expectedQty: number, receivedQty: number): number {
  return roundQty(receivedQty - expectedQty, 4);
}

export function computeBoxVolume(length?: number | null, width?: number | null, height?: number | null): number {
  if (!length || !width || !height) return 0;
  return roundQty(length * width * height, 4);
}

export function aggregatePackTotals(boxes: Array<{ weight: number; volume: number }>): { totalWeight: number; totalVolume: number } {
  return {
    totalWeight: roundQty(boxes.reduce((s, b) => s + b.weight, 0), 4),
    totalVolume: roundQty(boxes.reduce((s, b) => s + b.volume, 0), 4),
  };
}

export function isPartialDispatch(requestedQty: number, shippedQty: number): boolean {
  return shippedQty > 0 && shippedQty < requestedQty;
}

export function isFullDispatch(requestedQty: number, shippedQty: number): boolean {
  return shippedQty >= requestedQty && requestedQty > 0;
}

export function aggregateWmsDashboard(input: {
  locationCount: number;
  blockedLocations: number;
  openPickTasks: number;
  openTransfers: number;
  pendingReceipts: number;
  pendingDispatches: number;
  crossDockPending: number;
  occupancyAvgPct: number;
}): Record<string, number> {
  return {
    locationCount: input.locationCount,
    blockedLocations: input.blockedLocations,
    openPickTasks: input.openPickTasks,
    openTransfers: input.openTransfers,
    pendingReceipts: input.pendingReceipts,
    pendingDispatches: input.pendingDispatches,
    crossDockPending: input.crossDockPending,
    occupancyAvgPct: input.occupancyAvgPct,
  };
}

export function sortPickTasksByPriority<T extends { priority: number; taskKey: string }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => b.priority - a.priority || a.taskKey.localeCompare(b.taskKey));
}

export function groupPickTasksByZone<T extends { locationKey?: string | null; zoneKey?: string }>(
  tasks: T[],
  zoneByLocation: Map<string, string>,
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const task of tasks) {
    const zone = task.zoneKey ?? (task.locationKey ? zoneByLocation.get(task.locationKey) : undefined) ?? 'UNASSIGNED';
    const list = groups.get(zone) ?? [];
    list.push(task);
    groups.set(zone, list);
  }
  return groups;
}
