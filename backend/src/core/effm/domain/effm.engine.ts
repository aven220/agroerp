export function generateEffmKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

export const EFFM_MACHINE_TYPES = [
  'tractor', 'harvester', 'seeder', 'sprayer', 'fumigator', 'spreader',
  'rake', 'plow', 'baler', 'custom',
];

export const EFFM_IMPLEMENT_TYPES = [
  'plow', 'harrow', 'seeder', 'sprayer', 'trailer', 'mower', 'cultivator', 'custom',
];

export const EFFM_TELEMETRY_PROTOCOLS = ['can_bus', 'isobus', 'gps', 'sensor', 'controller'];
export const EFFM_COUPLING_ACTIONS = ['attach', 'detach'];

export const EFFM_MODULE_SLOTS = [
  'eam', 'eatp', 'eapp', 'eiwp', 'ephp', 'eatr', 'eacc', 'egsip', 'ftip', 'fmdt',
  'eims', 'escm', 'epscm', 'efm', 'eint', 'ebiap', 'eiamp', 'hcm',
];

export function computeOperationMetrics(input: {
  startedAt: Date; endedAt: Date; distanceKm?: number; areaCoveredHa?: number;
}) {
  const hoursWorked = (input.endedAt.getTime() - input.startedAt.getTime()) / 3600000;
  const avgSpeedKmh = input.distanceKm && hoursWorked > 0 ? input.distanceKm / hoursWorked : undefined;
  return {
    hoursWorked: Math.round(hoursWorked * 100) / 100,
    avgSpeedKmh: avgSpeedKmh != null ? Math.round(avgSpeedKmh * 100) / 100 : undefined,
    areaCoveredHa: input.areaCoveredHa,
    distanceKm: input.distanceKm,
  };
}

export function computeFuelEfficiency(liters: number, hoursWorked?: number, areaHa?: number) {
  return {
    efficiencyLph: hoursWorked && hoursWorked > 0 ? Math.round((liters / hoursWorked) * 100) / 100 : undefined,
    litersPerHa: areaHa && areaHa > 0 ? Math.round((liters / areaHa) * 100) / 100 : undefined,
  };
}

export function computePerformanceKpis(data: {
  totalHours: number; productiveHours: number; idleMinutes: number;
  areaCoveredHa: number; fuelLiters: number; fuelCost: number;
}) {
  const utilization = data.totalHours > 0 ? (data.productiveHours / data.totalHours) * 100 : 0;
  const availability = data.totalHours > 0 ? ((data.totalHours - data.idleMinutes / 60) / data.totalHours) * 100 : 100;
  const costPerHa = data.areaCoveredHa > 0 ? data.fuelCost / data.areaCoveredHa : 0;
  return {
    utilizationPct: Math.round(utilization * 100) / 100,
    availabilityPct: Math.round(availability * 100) / 100,
    costPerHa: Math.round(costPerHa * 100) / 100,
    litersPerHa: data.areaCoveredHa > 0 ? Math.round((data.fuelLiters / data.areaCoveredHa) * 100) / 100 : 0,
    idleHours: Math.round((data.idleMinutes / 60) * 100) / 100,
  };
}

export function aggregateEffmIndicators(data: {
  activeMachines: number;
  activeImplements: number;
  operations30d: number;
  fuelLiters30d: number;
  telemetryReadings30d: number;
  activeAlarms: number;
  utilizationPct: number;
}) {
  const fleetScore = Math.min(
    100,
    data.activeMachines * 4 + Math.min(30, data.operations30d) +
      Math.min(20, data.telemetryReadings30d / 10) + data.utilizationPct * 0.3,
  );
  return { ...data, fleetScore: Math.round(fleetScore), fleetReady: fleetScore >= 40 };
}

export function simulateTelemetryPayload(protocol: string, raw: Record<string, unknown>) {
  return {
    protocol,
    engineHours: typeof raw.engineHours === 'number' ? raw.engineHours : undefined,
    rpm: typeof raw.rpm === 'number' ? raw.rpm : undefined,
    speedKmh: typeof raw.speedKmh === 'number' ? raw.speedKmh : undefined,
    gps: raw.latitude != null ? { lat: raw.latitude, lng: raw.longitude } : undefined,
    raw,
  };
}
