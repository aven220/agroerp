import { roundQty } from './epscm-planning.engine';

export function generateEpscmCollabKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

export type CollabAnalyticsInput = {
  totalDeliveries: number;
  completedDeliveries: number;
  onTimeDeliveries: number;
  avgDeliveryHours: number;
  logisticCostTotal: number;
  customerCount: number;
  routeCount: number;
  carrierCount: number;
  inventoryRotation: number;
  warehouseOccupancyPct: number;
  replenishmentCompliancePct: number;
  supplierCompliancePct: number;
};

export function computeDeliveryCompliancePct(completed: number, total: number): number {
  if (total <= 0) return 0;
  return roundQty((completed / total) * 100, 2);
}

export function computeOnTimePct(onTime: number, completed: number): number {
  if (completed <= 0) return 0;
  return roundQty((onTime / completed) * 100, 2);
}

export function computeServiceLevel(onTimePct: number, compliancePct: number): number {
  return roundQty((onTimePct * 0.6 + compliancePct * 0.4), 2);
}

export function computeCostPerCustomer(totalCost: number, customers: number): number {
  if (customers <= 0) return 0;
  return roundQty(totalCost / customers, 2);
}

export function computeCostPerRoute(totalCost: number, routes: number): number {
  if (routes <= 0) return 0;
  return roundQty(totalCost / routes, 2);
}

export function computeCostPerCarrier(totalCost: number, carriers: number): number {
  if (carriers <= 0) return 0;
  return roundQty(totalCost / carriers, 2);
}

export function aggregateCollabIndicators(input: CollabAnalyticsInput): Record<string, number> {
  const deliveryCompliancePct = computeDeliveryCompliancePct(input.completedDeliveries, input.totalDeliveries);
  const onTimePct = computeOnTimePct(input.onTimeDeliveries, input.completedDeliveries);
  return {
    deliveryCompliancePct,
    serviceLevelPct: computeServiceLevel(onTimePct, deliveryCompliancePct),
    avgDeliveryHours: input.avgDeliveryHours,
    onTimePct,
    logisticCostTotal: input.logisticCostTotal,
    costPerCustomer: computeCostPerCustomer(input.logisticCostTotal, input.customerCount),
    costPerRoute: computeCostPerRoute(input.logisticCostTotal, input.routeCount),
    costPerCarrier: computeCostPerCarrier(input.logisticCostTotal, input.carrierCount),
    inventoryRotation: input.inventoryRotation,
    warehouseOccupancyPct: input.warehouseOccupancyPct,
    replenishmentCompliancePct: input.replenishmentCompliancePct,
    supplierCompliancePct: input.supplierCompliancePct,
  };
}

export function evaluateSlaCompliance(actualPct: number, targetPct: number): 'compliant' | 'at_risk' | 'breached' {
  if (actualPct >= targetPct) return 'compliant';
  if (actualPct >= targetPct * 0.9) return 'at_risk';
  return 'breached';
}

export function computePenaltyAmount(breachPct: number, baseAmount: number): number {
  if (breachPct <= 0) return 0;
  return roundQty(baseAmount * (breachPct / 100), 2);
}

export function computeBonusAmount(exceedPct: number, baseAmount: number): number {
  if (exceedPct <= 0) return 0;
  return roundQty(baseAmount * (exceedPct / 100), 2);
}
