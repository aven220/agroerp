import { roundQty } from './epscm-planning.engine';

export type SimulationBaseline = {
  routes: number;
  costTotal: number;
  avgDeliveryHours: number;
  dcCount: number;
};

export type SimulationParameters = {
  routeChangePct?: number;
  newSupplierCostDelta?: number;
  newDcCount?: number;
  carrierSwitchPct?: number;
};

export function compareScenarios(
  baseline: SimulationBaseline,
  scenarios: Array<{ name: string; parameters: SimulationParameters }>,
): Array<{ name: string; costTotal: number; avgDeliveryHours: number; costDelta: number; timeDelta: number }> {
  return scenarios.map((s) => {
    const routeFactor = 1 + (s.parameters.routeChangePct ?? 0) / 100;
    const costFactor = 1 + (s.parameters.newSupplierCostDelta ?? 0) / 100;
    const dcFactor = s.parameters.newDcCount ? 1 - s.parameters.newDcCount * 0.02 : 1;
    const carrierFactor = 1 + (s.parameters.carrierSwitchPct ?? 0) / 100 * 0.05;

    const costTotal = roundQty(baseline.costTotal * routeFactor * costFactor * carrierFactor, 2);
    const avgDeliveryHours = roundQty(baseline.avgDeliveryHours * dcFactor / routeFactor, 2);

    return {
      name: s.name,
      costTotal,
      avgDeliveryHours,
      costDelta: roundQty(costTotal - baseline.costTotal, 2),
      timeDelta: roundQty(avgDeliveryHours - baseline.avgDeliveryHours, 2),
    };
  });
}

export function simulateNewDistributionCenter(
  baseline: SimulationBaseline,
  additionalDcCount: number,
): { costTotal: number; avgDeliveryHours: number; costDelta: number; timeDelta: number } {
  const costTotal = roundQty(baseline.costTotal * (1 + additionalDcCount * 0.08), 2);
  const avgDeliveryHours = roundQty(Math.max(1, baseline.avgDeliveryHours * (1 - additionalDcCount * 0.12)), 2);
  return {
    costTotal,
    avgDeliveryHours,
    costDelta: roundQty(costTotal - baseline.costTotal, 2),
    timeDelta: roundQty(avgDeliveryHours - baseline.avgDeliveryHours, 2),
  };
}

export function simulateRouteChange(baseline: SimulationBaseline, routeChangePct: number) {
  const costTotal = roundQty(baseline.costTotal * (1 + routeChangePct / 200), 2);
  const avgDeliveryHours = roundQty(baseline.avgDeliveryHours * (1 - routeChangePct / 300), 2);
  return { costTotal, avgDeliveryHours, costDelta: roundQty(costTotal - baseline.costTotal, 2), timeDelta: roundQty(avgDeliveryHours - baseline.avgDeliveryHours, 2) };
}

export function simulateNewSupplier(baseline: SimulationBaseline, costDeltaPct: number) {
  const costTotal = roundQty(baseline.costTotal * (1 + costDeltaPct / 100), 2);
  return { costTotal, avgDeliveryHours: baseline.avgDeliveryHours, costDelta: roundQty(costTotal - baseline.costTotal, 2), timeDelta: 0 };
}
