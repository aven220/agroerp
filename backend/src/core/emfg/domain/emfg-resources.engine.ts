import { computeCapacityLoadFactor, roundQty } from './emfg-manufacturing.engine';

export type CapacityEntity = {
  entityKey: string;
  entityType: string;
  installedMinutes: number;
  utilizedMinutes: number;
};

export function computeUtilizationPct(installed: number, utilized: number): number {
  if (installed <= 0) return 0;
  return roundQty(Math.min(100, (utilized / installed) * 100), 2);
}

export function computeIdleMinutes(installed: number, utilized: number): number {
  return roundQty(Math.max(0, installed - utilized), 2);
}

export function computeShiftCapacity(installedPerShift: number, loadMinutes: number) {
  const utilized = roundQty(loadMinutes, 2);
  const idle = computeIdleMinutes(installedPerShift, utilized);
  const utilizationPct = computeUtilizationPct(installedPerShift, utilized);
  return { installedMinutes: installedPerShift, utilizedMinutes: utilized, idleMinutes: idle, utilizationPct };
}

export function detectBottlenecks(entities: CapacityEntity[], thresholdPct = 85): CapacityEntity[] {
  return entities
    .filter((e) => computeUtilizationPct(e.installedMinutes, e.utilizedMinutes) >= thresholdPct)
    .sort((a, b) => computeUtilizationPct(b.installedMinutes, b.utilizedMinutes) - computeUtilizationPct(a.installedMinutes, a.utilizedMinutes));
}

export function computeMtbf(failureCount: number, operatingHours: number): number {
  if (failureCount <= 0) return operatingHours;
  return roundQty(operatingHours / failureCount, 2);
}

export function computeMttr(totalRepairMinutes: number, repairCount: number): number {
  if (repairCount <= 0) return 0;
  return roundQty(totalRepairMinutes / repairCount, 2);
}

export function computeAvailabilityPct(operatingMinutes: number, downtimeMinutes: number): number {
  const total = operatingMinutes + downtimeMinutes;
  if (total <= 0) return 100;
  return roundQty((operatingMinutes / total) * 100, 2);
}

export function aggregateResourceIndicators(data: {
  equipment: Array<{ availabilityStatus: string; operatingHours: number }>;
  downtimes: Array<{ downtimeMinutes: number }>;
  maintenanceLogs: Array<{ maintenanceType: string; downtimeMinutes: number }>;
  capacities: CapacityEntity[];
}) {
  const total = data.equipment.length;
  const available = data.equipment.filter((e) => e.availabilityStatus === 'available').length;
  const inProduction = data.equipment.filter((e) => e.availabilityStatus === 'in_production').length;
  const down = data.equipment.filter((e) => ['out_of_service', 'maintenance', 'blocked'].includes(e.availabilityStatus)).length;
  const totalDowntime = data.downtimes.reduce((s, d) => s + d.downtimeMinutes, 0);
  const totalOperatingHours = data.equipment.reduce((s, e) => s + e.operatingHours, 0);
  const corrective = data.maintenanceLogs.filter((m) => m.maintenanceType === 'corrective');
  const failures = corrective.length;
  const repairMinutes = corrective.reduce((s, m) => s + m.downtimeMinutes, 0);

  const avgUtil = data.capacities.length
    ? roundQty(
        data.capacities.reduce((s, c) => s + computeUtilizationPct(c.installedMinutes, c.utilizedMinutes), 0) / data.capacities.length,
        2,
      )
    : 0;

  return {
    equipmentCount: total,
    availableCount: available,
    inProductionCount: inProduction,
    downCount: down,
    availabilityPct: total > 0 ? roundQty((available / total) * 100, 2) : 0,
    avgUtilizationPct: avgUtil,
    operatingHours: roundQty(totalOperatingHours, 2),
    downtimeMinutes: roundQty(totalDowntime, 2),
    mtbf: computeMtbf(failures, totalOperatingHours),
    mttr: computeMttr(repairMinutes, failures),
    bottlenecks: detectBottlenecks(data.capacities).map((b) => ({
      entityKey: b.entityKey,
      entityType: b.entityType,
      utilizationPct: computeUtilizationPct(b.installedMinutes, b.utilizedMinutes),
    })),
  };
}

export function canTransitionAvailability(from: string, to: string): boolean {
  if (from === to) return false;
  const blocked = ['blocked'];
  if (blocked.includes(from) && to === 'in_production') return false;
  return true;
}

export function computeLineCapacity(machineCaps: number[]): number {
  return roundQty(machineCaps.reduce((s, c) => s + c, 0), 2);
}

export function computeCapacityLoadFactorAlias(installed: number, utilized: number): number {
  return computeCapacityLoadFactor(utilized, installed);
}
