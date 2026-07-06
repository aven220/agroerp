import { roundQty } from './emfg-manufacturing.engine';

export type CostLineInput = { quantity: number; unitCost: number };

export function computeLineTotal(quantity: number, unitCost: number): number {
  return roundQty(quantity * unitCost, 4);
}

export function computeStandardFromBom(
  lines: Array<{ quantity: number; unitCost: number }>,
): number {
  return roundQty(lines.reduce((s, l) => s + computeLineTotal(l.quantity, l.unitCost), 0), 4);
}

export function computeLaborCost(minutes: number, ratePerHour: number): number {
  return roundQty((minutes / 60) * ratePerHour, 4);
}

export function computeOverheadCost(directCost: number, overheadRatePct: number): number {
  return roundQty(directCost * (overheadRatePct / 100), 4);
}

export function computeActualTotal(lines: Array<{ amount: number }>): number {
  return roundQty(lines.reduce((s, l) => s + l.amount, 0), 4);
}

export function computeUnitCost(totalCost: number, quantity: number): number {
  if (quantity <= 0) return 0;
  return roundQty(totalCost / quantity, 4);
}

export function computeVariance(standard: number, actual: number): { amount: number; pct: number } {
  const amount = roundQty(actual - standard, 4);
  const pct = standard !== 0 ? roundQty((amount / standard) * 100, 2) : 0;
  return { amount, pct };
}

export function computeWipValue(material: number, labor: number, overhead: number): number {
  return roundQty(material + labor + overhead, 4);
}

export function computeMargin(salesPrice: number, unitCost: number): number {
  return roundQty(salesPrice - unitCost, 4);
}

export function computeMarginPct(salesPrice: number, unitCost: number): number {
  if (salesPrice <= 0) return 0;
  return roundQty(((salesPrice - unitCost) / salesPrice) * 100, 2);
}

export function aggregateCostIndicators(data: {
  orders: Array<{ standardUnitCost: number; actualUnitCost: number; marginExpected: number; marginActual: number }>;
  variances: Array<{ varianceAmount: number; varianceType: string }>;
}) {
  const orderCount = data.orders.length;
  const avgStandard = orderCount
    ? roundQty(data.orders.reduce((s, o) => s + o.standardUnitCost, 0) / orderCount, 4)
    : 0;
  const avgActual = orderCount
    ? roundQty(data.orders.reduce((s, o) => s + o.actualUnitCost, 0) / orderCount, 4)
    : 0;
  const totalVariance = roundQty(data.variances.reduce((s, v) => s + v.varianceAmount, 0), 4);
  const materialVar = data.variances.filter((v) => v.varianceType === 'material').reduce((s, v) => s + v.varianceAmount, 0);
  const laborVar = data.variances.filter((v) => v.varianceType === 'labor').reduce((s, v) => s + v.varianceAmount, 0);
  return {
    orderCount,
    avgStandardUnitCost: avgStandard,
    avgActualUnitCost: avgActual,
    totalVariance,
    materialVariance: roundQty(materialVar, 4),
    laborVariance: roundQty(laborVar, 4),
    avgMarginExpected: orderCount
      ? roundQty(data.orders.reduce((s, o) => s + o.marginExpected, 0) / orderCount, 4)
      : 0,
    avgMarginActual: orderCount
      ? roundQty(data.orders.reduce((s, o) => s + o.marginActual, 0) / orderCount, 4)
      : 0,
  };
}
