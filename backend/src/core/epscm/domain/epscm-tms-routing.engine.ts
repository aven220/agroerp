import { roundQty } from './epscm-planning.engine';

export type TmsStopInput = {
  stopKey: string;
  latitude?: number | null;
  longitude?: number | null;
  weight?: number;
  volume?: number;
  windowStart?: Date | null;
  windowEnd?: Date | null;
  sequence?: number;
};

export function generateEpscmTmsKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return roundQty(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)), 4);
}

export function estimateDurationMinutes(distanceKm: number, avgSpeedKmh = 40): number {
  if (avgSpeedKmh <= 0) return 0;
  return roundQty((distanceKm / avgSpeedKmh) * 60, 2);
}

export function optimizeByDistance(stops: TmsStopInput[], originLat = 4.65, originLon = -74.05): TmsStopInput[] {
  const remaining = [...stops];
  const ordered: TmsStopInput[] = [];
  let curLat = originLat;
  let curLon = originLon;
  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const s = remaining[i];
      const lat = s.latitude ?? originLat;
      const lon = s.longitude ?? originLon;
      const d = haversineKm(curLat, curLon, lat, lon);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    curLat = next.latitude ?? curLat;
    curLon = next.longitude ?? curLon;
  }
  return ordered.map((s, i) => ({ ...s, sequence: i + 1 }));
}

export function optimizeByTime(stops: TmsStopInput[]): TmsStopInput[] {
  return [...stops]
    .sort((a, b) => {
      const aStart = a.windowStart?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bStart = b.windowStart?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aStart - bStart;
    })
    .map((s, i) => ({ ...s, sequence: i + 1 }));
}

export function optimizeByCapacity(
  stops: TmsStopInput[],
  maxWeight: number,
  maxVolume: number,
): { feasible: boolean; stops: TmsStopInput[]; totalWeight: number; totalVolume: number } {
  const totalWeight = roundQty(stops.reduce((s, x) => s + (x.weight ?? 0), 0), 4);
  const totalVolume = roundQty(stops.reduce((s, x) => s + (x.volume ?? 0), 0), 4);
  const feasible = (maxWeight <= 0 || totalWeight <= maxWeight) && (maxVolume <= 0 || totalVolume <= maxVolume);
  const ordered = [...stops].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0)).map((s, i) => ({ ...s, sequence: i + 1 }));
  return { feasible, stops: ordered, totalWeight, totalVolume };
}

export function computeRouteTotals(stops: TmsStopInput[], originLat = 4.65, originLon = -74.05): { distanceKm: number; durationMin: number } {
  if (!stops.length) return { distanceKm: 0, durationMin: 0 };
  let dist = 0;
  let prevLat = originLat;
  let prevLon = originLon;
  for (const s of stops) {
    const lat = s.latitude ?? originLat;
    const lon = s.longitude ?? originLon;
    dist += haversineKm(prevLat, prevLon, lat, lon);
    prevLat = lat;
    prevLon = lon;
  }
  return { distanceKm: roundQty(dist, 4), durationMin: estimateDurationMinutes(dist) };
}

export function validateTimeWindows(stops: TmsStopInput[], startTime: Date, minutesPerStop = 15): boolean {
  let cursor = startTime.getTime();
  for (const s of stops) {
    if (s.windowStart && cursor < s.windowStart.getTime()) cursor = s.windowStart.getTime();
    if (s.windowEnd && cursor > s.windowEnd.getTime()) return false;
    cursor += minutesPerStop * 60_000;
  }
  return true;
}

export function groupDeliveriesByProximity(stops: TmsStopInput[], clusterKm = 5): TmsStopInput[][] {
  const groups: TmsStopInput[][] = [];
  const used = new Set<string>();
  for (const stop of stops) {
    if (used.has(stop.stopKey)) continue;
    const group = [stop];
    used.add(stop.stopKey);
    const lat = stop.latitude ?? 0;
    const lon = stop.longitude ?? 0;
    for (const other of stops) {
      if (used.has(other.stopKey)) continue;
      const d = haversineKm(lat, lon, other.latitude ?? lat, other.longitude ?? lon);
      if (d <= clusterKm) {
        group.push(other);
        used.add(other.stopKey);
      }
    }
    groups.push(group);
  }
  return groups;
}

export function aggregateTmsDashboard(input: {
  vehicleCount: number;
  driverCount: number;
  activeTrips: number;
  pendingDeliveries: number;
  completedDeliveries: number;
  openIncidents: number;
  totalCost: number;
  avgCostPerDelivery: number;
}): Record<string, number> {
  return { ...input };
}
