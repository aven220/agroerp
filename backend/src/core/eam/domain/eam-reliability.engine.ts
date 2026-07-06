import { EamConditionMetricKind, EamEnergyType, EamRelSimulationType } from '@prisma/client';

export function generateEamReliabilityKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

export const STANDARD_CONDITION_METRICS: EamConditionMetricKind[] = [
  'temperature',
  'vibration',
  'pressure',
  'humidity',
  'voltage',
  'current',
  'rpm',
  'operating_hours',
  'motor_hours',
  'work_cycles',
];

export type ReliabilityEventInput = {
  downtimeHours: number;
  repairHours: number;
  costImpact: number;
};

export type ReliabilityComputeInput = {
  operatingHours: number;
  events: ReliabilityEventInput[];
};

export function computeReliabilityIndicators(input: ReliabilityComputeInput) {
  const failureCount = input.events.length;
  const totalDowntime = input.events.reduce((s, e) => s + e.downtimeHours, 0);
  const totalRepair = input.events.reduce((s, e) => s + e.repairHours, 0);
  const unavailabilityCost = input.events.reduce((s, e) => s + e.costImpact, 0);
  const mtbf = failureCount > 0 ? Math.round((input.operatingHours / failureCount) * 100) / 100 : input.operatingHours;
  const mttr = failureCount > 0 ? Math.round((totalRepair / failureCount) * 100) / 100 : 0;
  const totalWindow = input.operatingHours + totalDowntime;
  const availability = totalWindow > 0
    ? Math.round((input.operatingHours / totalWindow) * 10000) / 100
    : 100;
  const reliability = availability / 100;
  const maintainability = mttr > 0 ? Math.round((1 / mttr) * 10000) / 10000 : 0;
  return {
    mtbf,
    mttr,
    availability,
    reliability,
    maintainability,
    downtimeHours: Math.round(totalDowntime * 100) / 100,
    operatingHours: input.operatingHours,
    failureCount,
    unavailabilityCost: Math.round(unavailabilityCost * 100) / 100,
  };
}

export type EnergyReadingInput = {
  energyType: EamEnergyType;
  quantity: number;
  totalCost: number;
  assetKey?: string;
  locationKey?: string;
};

export function aggregateEnergyReadings(readings: EnergyReadingInput[]) {
  const byType: Record<string, { quantity: number; cost: number }> = {};
  const byAsset: Record<string, number> = {};
  const byLocation: Record<string, number> = {};
  let totalCost = 0;
  for (const r of readings) {
    const t = byType[r.energyType] ?? { quantity: 0, cost: 0 };
    t.quantity += r.quantity;
    t.cost += r.totalCost;
    byType[r.energyType] = t;
    totalCost += r.totalCost;
    if (r.assetKey) byAsset[r.assetKey] = (byAsset[r.assetKey] ?? 0) + r.totalCost;
    if (r.locationKey) byLocation[r.locationKey] = (byLocation[r.locationKey] ?? 0) + r.totalCost;
  }
  return {
    byType,
    byAsset,
    byLocation,
    totalCost: Math.round(totalCost * 100) / 100,
  };
}

export type AnalyticsAssetRow = {
  assetKey: string;
  totalCost: number;
  failureCount: number;
  downtimeHours: number;
  familyKey?: string;
  locationKey?: string;
};

export function aggregateAssetAnalytics(rows: AnalyticsAssetRow[]) {
  const mostCostly = [...rows].sort((a, b) => b.totalCost - a.totalCost).slice(0, 10);
  const mostFailures = [...rows].sort((a, b) => b.failureCount - a.failureCount).slice(0, 10);
  const mostDowntime = [...rows].sort((a, b) => b.downtimeHours - a.downtimeHours).slice(0, 10);
  const byFamily: Record<string, number> = {};
  const byLocation: Record<string, number> = {};
  for (const r of rows) {
    if (r.familyKey) byFamily[r.familyKey] = (byFamily[r.familyKey] ?? 0) + r.totalCost;
    if (r.locationKey) byLocation[r.locationKey] = (byLocation[r.locationKey] ?? 0) + r.totalCost;
  }
  return { mostCostly, mostFailures, mostDowntime, costByFamily: byFamily, costByLocation: byLocation };
}

export type SimulationParams = {
  downtimeHours?: number;
  hourlyDowntimeCost?: number;
  replacementCost?: number;
  annualMaintCost?: number;
  maintIncreasePct?: number;
  availabilityTarget?: number;
};

export function runSimulation(
  type: EamRelSimulationType,
  baseline: SimulationParams,
  params: SimulationParams,
): Record<string, unknown> {
  switch (type) {
    case 'downtime': {
      const hours = params.downtimeHours ?? baseline.downtimeHours ?? 0;
      const rate = params.hourlyDowntimeCost ?? baseline.hourlyDowntimeCost ?? 0;
      const impact = Math.round(hours * rate * 100) / 100;
      return { downtimeHours: hours, economicImpact: impact, availabilityDelta: -hours };
    }
    case 'asset_replacement': {
      const cost = params.replacementCost ?? 0;
      const savedMaint = (baseline.annualMaintCost ?? 0) * 0.15;
      return { replacementCost: cost, annualSavings: Math.round(savedMaint * 100) / 100, paybackYears: savedMaint > 0 ? Math.round((cost / savedMaint) * 100) / 100 : null };
    }
    case 'maintenance_increase': {
      const pct = params.maintIncreasePct ?? 10;
      const base = baseline.annualMaintCost ?? 0;
      const extra = Math.round(base * (pct / 100) * 100) / 100;
      const downtimeReduction = Math.round((baseline.downtimeHours ?? 0) * (pct / 200) * 100) / 100;
      return { extraMaintCost: extra, downtimeReductionHours: downtimeReduction, netBenefit: Math.round((downtimeReduction * (baseline.hourlyDowntimeCost ?? 0) - extra) * 100) / 100 };
    }
    case 'scenario_compare': {
      const scenarioA = runSimulation('downtime', baseline, params);
      const scenarioB = runSimulation('maintenance_increase', baseline, params);
      const downtimeImpact = scenarioA.economicImpact as number;
      const maintBenefit = scenarioB.netBenefit as number;
      return { scenarioA, scenarioB, preferred: maintBenefit > downtimeImpact * -1 ? 'maintenance' : 'status_quo' };
    }
    default:
      return {};
  }
}

export function evaluateConditionThreshold(
  value: number,
  warn?: number | null,
  crit?: number | null,
): 'normal' | 'warning' | 'critical' {
  if (crit != null && value >= crit) return 'critical';
  if (warn != null && value >= warn) return 'warning';
  return 'normal';
}

export type ConditionTrendPoint = { recordedAt: Date; value: number };

export function computeConditionTrend(points: ConditionTrendPoint[]) {
  if (points.length < 2) return { trend: 'stable' as const, delta: 0 };
  const sorted = [...points].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
  const first = sorted[0].value;
  const last = sorted[sorted.length - 1].value;
  const delta = Math.round((last - first) * 100) / 100;
  const trend = delta > 0.01 ? 'rising' : delta < -0.01 ? 'falling' : 'stable';
  return { trend, delta, latest: last, points: sorted.length };
}

export function aggregatePlantAvailability(
  assets: Array<{ plantKey: string; availability: number }>,
) {
  const byPlant: Record<string, { sum: number; count: number }> = {};
  for (const a of assets) {
    const p = byPlant[a.plantKey] ?? { sum: 0, count: 0 };
    p.sum += a.availability;
    p.count += 1;
    byPlant[a.plantKey] = p;
  }
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(byPlant)) {
    result[k] = Math.round((v.sum / v.count) * 100) / 100;
  }
  return result;
}

export function computeMaintenanceCompliance(
  planned: number,
  completed: number,
) {
  if (planned === 0) return 100;
  return Math.round((completed / planned) * 10000) / 100;
}
