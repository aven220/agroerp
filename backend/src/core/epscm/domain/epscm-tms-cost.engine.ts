import { roundQty } from './epscm-planning.engine';

export type TmsCostLine = { category: string; amount: number };

export function sumCosts(lines: TmsCostLine[]): number {
  return roundQty(lines.reduce((s, l) => s + l.amount, 0), 2);
}

export function costPerDelivery(totalCost: number, deliveryCount: number): number {
  if (deliveryCount <= 0) return 0;
  return roundQty(totalCost / deliveryCount, 2);
}

export function costPerCustomer(totalCost: number, customerCount: number): number {
  if (customerCount <= 0) return 0;
  return roundQty(totalCost / customerCount, 2);
}

export function costPerRoute(totalCost: number, routeCount: number): number {
  if (routeCount <= 0) return 0;
  return roundQty(totalCost / routeCount, 2);
}

export function costPerVehicle(totalCost: number, vehicleCount: number): number {
  if (vehicleCount <= 0) return 0;
  return roundQty(totalCost / vehicleCount, 2);
}

export function computeLogisticMargin(revenue: number, totalCost: number): { margin: number; marginPct: number } {
  const margin = roundQty(revenue - totalCost, 2);
  const marginPct = revenue > 0 ? roundQty((margin / revenue) * 100, 2) : 0;
  return { margin, marginPct };
}

export function aggregateCostsByCategory(lines: TmsCostLine[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const l of lines) {
    map.set(l.category, roundQty((map.get(l.category) ?? 0) + l.amount, 2));
  }
  return map;
}
