import { detectBottlenecks } from './emfg-resources.engine';
import { roundQty } from './emfg-manufacturing.engine';

export type CapacityEntity = {
  entityKey: string;
  entityType: string;
  installedMinutes: number;
  utilizedMinutes: number;
};

export function computeOee(availabilityPct: number, performancePct: number, qualityPct: number): number {
  return roundQty((availabilityPct / 100) * (performancePct / 100) * (qualityPct / 100) * 100, 2);
}

export function computeAvailabilityPct(plannedMinutes: number, downtimeMinutes: number): number {
  if (plannedMinutes <= 0) return 100;
  const operating = Math.max(0, plannedMinutes - downtimeMinutes);
  return roundQty((operating / plannedMinutes) * 100, 2);
}

export function computePerformancePct(
  idealCycleMinutes: number,
  actualOutput: number,
  operatingMinutes: number,
): number {
  if (operatingMinutes <= 0 || idealCycleMinutes <= 0) return 0;
  const idealOutput = operatingMinutes / idealCycleMinutes;
  if (idealOutput <= 0) return 0;
  return roundQty(Math.min(100, (actualOutput / idealOutput) * 100), 2);
}

export function computeQualityPct(goodQty: number, totalQty: number): number {
  if (totalQty <= 0) return 100;
  return roundQty((goodQty / totalQty) * 100, 2);
}

export function aggregateProductionKpis(data: {
  orders: Array<{
    status: string;
    plannedQty: number;
    producedQty: number;
    scrapQty: number;
    reworkQty: number;
    elapsedMinutes: number;
    plannedEnd?: Date | null;
    actualEnd?: Date | null;
    lineKey?: string | null;
    centerKey?: string | null;
  }>;
  capacities: CapacityEntity[];
  operations: Array<{ setupMinutes: number; runMinutes: number; completedMinutes: number }>;
}) {
  const total = data.orders.length;
  const completed = data.orders.filter((o) => o.status === 'completed').length;
  const inProgress = data.orders.filter((o) => ['released', 'in_progress', 'paused'].includes(o.status)).length;
  const now = Date.now();
  const delayed = data.orders.filter(
    (o) => o.plannedEnd && !o.actualEnd && new Date(o.plannedEnd).getTime() < now && o.status !== 'completed',
  ).length;
  const plannedQty = data.orders.reduce((s, o) => s + o.plannedQty, 0);
  const producedQty = data.orders.reduce((s, o) => s + o.producedQty, 0);
  const scrapQty = data.orders.reduce((s, o) => s + o.scrapQty, 0);
  const reworkQty = data.orders.reduce((s, o) => s + o.reworkQty, 0);
  const planCompliance = plannedQty > 0 ? roundQty((producedQty / plannedQty) * 100, 2) : 0;
  const wastePct = producedQty + scrapQty > 0 ? roundQty((scrapQty / (producedQty + scrapQty)) * 100, 2) : 0;
  const reworkPct = producedQty > 0 ? roundQty((reworkQty / producedQty) * 100, 2) : 0;

  const totalSetup = data.operations.reduce((s, o) => s + o.setupMinutes, 0);
  const totalRun = data.operations.reduce((s, o) => s + (o.completedMinutes || o.runMinutes), 0);
  const cycleTime = completed > 0 ? roundQty(data.orders.filter((o) => o.status === 'completed').reduce((s, o) => s + o.elapsedMinutes, 0) / completed, 2) : 0;

  const installed = data.capacities.reduce((s, c) => s + c.installedMinutes, 0);
  const utilized = data.capacities.reduce((s, c) => s + c.utilizedMinutes, 0);
  const capacityUtilization = installed > 0 ? roundQty((utilized / installed) * 100, 2) : 0;

  return {
    orderCount: total,
    completedOrders: completed,
    inProgressOrders: inProgress,
    delayedOrders: delayed,
    planCompliancePct: planCompliance,
    totalPlannedQty: roundQty(plannedQty, 2),
    totalProducedQty: roundQty(producedQty, 2),
    scrapQty: roundQty(scrapQty, 2),
    reworkQty: roundQty(reworkQty, 2),
    wastePct,
    reworkPct,
    avgCycleTimeMinutes: cycleTime,
    avgSetupMinutes: data.operations.length ? roundQty(totalSetup / data.operations.length, 2) : 0,
    avgRunMinutes: data.operations.length ? roundQty(totalRun / data.operations.length, 2) : 0,
    capacityUtilizationPct: capacityUtilization,
  };
}

export function aggregateAnalytics(data: {
  capacities: CapacityEntity[];
  downtimes: Array<{ entityKey: string; downtimeMinutes: number; reason?: string | null }>;
  equipment: Array<{ equipmentKey: string; name: string; availabilityStatus: string; downtimeMinutes?: number }>;
  costSummaries: Array<{ itemKey: string; marginActual: number; actualUnitCost: number }>;
  consumptions: Array<{ componentKey: string; quantity: number }>;
  operatorEfficiency: Array<{ operatorKey: string; producedQty: number; elapsedMinutes: number }>;
  shiftEfficiency: Array<{ shiftKey: string; producedQty: number; plannedQty: number }>;
  workCenterEfficiency: Array<{ workCenterKey: string; utilizationPct: number }>;
  supplierQuality: Array<{ supplierKey: string; passRate: number; inspectionCount: number }>;
}) {
  const bottlenecks = detectBottlenecks(data.capacities).map((b) => ({
    entityKey: b.entityKey,
    entityType: b.entityType,
    utilizationPct: b.installedMinutes > 0 ? roundQty((b.utilizedMinutes / b.installedMinutes) * 100, 2) : 0,
  }));

  const stopMap = new Map<string, number>();
  for (const d of data.downtimes) {
    const reason = d.reason ?? 'unspecified';
    stopMap.set(reason, (stopMap.get(reason) ?? 0) + d.downtimeMinutes);
  }
  const frequentStops = [...stopMap.entries()]
    .map(([reason, minutes]) => ({ reason, minutes: roundQty(minutes, 2) }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 10);

  const unavailableMachines = data.equipment
    .filter((e) => ['out_of_service', 'maintenance', 'blocked'].includes(e.availabilityStatus))
    .map((e) => ({
      equipmentKey: e.equipmentKey,
      name: e.name,
      downtimeMinutes: e.downtimeMinutes ?? 0,
    }))
    .sort((a, b) => b.downtimeMinutes - a.downtimeMinutes)
    .slice(0, 10);

  const profitableProducts = [...data.costSummaries]
    .sort((a, b) => b.marginActual - a.marginActual)
    .slice(0, 10);
  const lossProducts = [...data.costSummaries]
    .filter((c) => c.marginActual < 0)
    .sort((a, b) => a.marginActual - b.marginActual)
    .slice(0, 10);

  const materialConsumption = [...data.consumptions]
    .reduce((map, c) => {
      map.set(c.componentKey, (map.get(c.componentKey) ?? 0) + c.quantity);
      return map;
    }, new Map<string, number>());
  const topMaterials = [...materialConsumption.entries()]
    .map(([componentKey, quantity]) => ({ componentKey, quantity: roundQty(quantity, 2) }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  return {
    bottlenecks,
    frequentStops,
    unavailableMachines,
    profitableProducts,
    lossProducts,
    operatorEfficiency: data.operatorEfficiency.slice(0, 20),
    shiftEfficiency: data.shiftEfficiency.slice(0, 20),
    workCenterEfficiency: data.workCenterEfficiency.slice(0, 20),
    materialConsumption: topMaterials,
    supplierQuality: data.supplierQuality.slice(0, 20),
  };
}

export function runDemandSimulation(
  baseOrders: Array<{ orderKey: string; plannedQty: number }>,
  demandIncreasePct: number,
) {
  const factor = 1 + demandIncreasePct / 100;
  return baseOrders.map((o) => ({
    orderKey: o.orderKey,
    baseQty: o.plannedQty,
    simulatedQty: roundQty(o.plannedQty * factor, 2),
    deltaQty: roundQty(o.plannedQty * (factor - 1), 2),
  }));
}

export function runCapacitySimulation(installedCapacity: number, additionalCapacity: number) {
  const newCapacity = installedCapacity + additionalCapacity;
  const utilizationDelta = installedCapacity > 0
    ? roundQty((additionalCapacity / installedCapacity) * 100, 2)
    : 0;
  return {
    baseCapacity: roundQty(installedCapacity, 2),
    additionalCapacity: roundQty(additionalCapacity, 2),
    simulatedCapacity: roundQty(newCapacity, 2),
    utilizationDeltaPct: utilizationDelta,
  };
}

export function runShiftSimulation(currentShifts: number, additionalShifts: number, minutesPerShift: number) {
  const baseMinutes = currentShifts * minutesPerShift;
  const simulatedMinutes = (currentShifts + additionalShifts) * minutesPerShift;
  return {
    currentShifts,
    additionalShifts,
    baseMinutes,
    simulatedMinutes,
    capacityGainPct: baseMinutes > 0 ? roundQty(((simulatedMinutes - baseMinutes) / baseMinutes) * 100, 2) : 0,
  };
}

export function runRoutingSimulation(
  operations: Array<{ operationKey: string; runMinutes: number }>,
  runMinutesDeltaPct: number,
) {
  const factor = 1 + runMinutesDeltaPct / 100;
  return operations.map((op) => ({
    operationKey: op.operationKey,
    baseMinutes: op.runMinutes,
    simulatedMinutes: roundQty(op.runMinutes * factor, 2),
    deltaMinutes: roundQty(op.runMinutes * (factor - 1), 2),
  }));
}

export function runBomSimulation(
  lines: Array<{ componentKey: string; quantity: number }>,
  quantityDeltaPct: number,
) {
  const factor = 1 + quantityDeltaPct / 100;
  return lines.map((l) => ({
    componentKey: l.componentKey,
    baseQty: l.quantity,
    simulatedQty: roundQty(l.quantity * factor, 2),
    deltaQty: roundQty(l.quantity * (factor - 1), 2),
  }));
}

export function compareScenarios(
  base: Record<string, unknown>,
  scenarios: Array<{ name: string; result: Record<string, unknown> }>,
) {
  return scenarios.map((s) => ({
    name: s.name,
    result: s.result,
    deltas: Object.keys(s.result).reduce((acc, key) => {
      const baseVal = Number(base[key] ?? 0);
      const simVal = Number(s.result[key] ?? 0);
      acc[key] = roundQty(simVal - baseVal, 4);
      return acc;
    }, {} as Record<string, number>),
  }));
}

export function aggregateIntelligenceIndicators(data: {
  oeeSnapshots: Array<{ oeePct: number; scope: string }>;
  kpis: ReturnType<typeof aggregateProductionKpis>;
  alertCount: number;
}) {
  const oeeCount = data.oeeSnapshots.length;
  const avgOee = oeeCount
    ? roundQty(data.oeeSnapshots.reduce((s, o) => s + o.oeePct, 0) / oeeCount, 2)
    : 0;
  const plantOee = data.oeeSnapshots.filter((o) => o.scope === 'plant');
  const avgPlantOee = plantOee.length
    ? roundQty(plantOee.reduce((s, o) => s + o.oeePct, 0) / plantOee.length, 2)
    : avgOee;

  return {
    avgOeePct: avgOee,
    avgPlantOeePct: avgPlantOee,
    planCompliancePct: data.kpis.planCompliancePct,
    completedOrders: data.kpis.completedOrders,
    delayedOrders: data.kpis.delayedOrders,
    capacityUtilizationPct: data.kpis.capacityUtilizationPct,
    wastePct: data.kpis.wastePct,
    reworkPct: data.kpis.reworkPct,
    openAlerts: data.alertCount,
  };
}

export function buildExportRows(
  exportType: string,
  payload: Record<string, unknown>,
): Array<Record<string, unknown>> {
  if (exportType === 'oee' && Array.isArray(payload.snapshots)) {
    return payload.snapshots as Array<Record<string, unknown>>;
  }
  if (exportType === 'kpis' && payload.indicators) {
    return [payload.indicators as Record<string, unknown>];
  }
  if (exportType === 'analytics' && payload.analytics) {
    const analytics = payload.analytics as Record<string, unknown>;
    const rows: Array<Record<string, unknown>> = [];
    for (const [section, items] of Object.entries(analytics)) {
      if (Array.isArray(items)) {
        for (const item of items) rows.push({ section, ...(item as object) });
      }
    }
    return rows;
  }
  if (exportType === 'simulation' && payload.result) {
    return [payload as Record<string, unknown>];
  }
  return [payload];
}
