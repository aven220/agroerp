export function roundQty(value: number, decimals = 4): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function generateEpscmKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

export function movingAverageForecast(history: number[], periods = 3): number {
  if (!history.length) return 0;
  const slice = history.slice(-periods);
  return roundQty(slice.reduce((s, v) => s + v, 0) / slice.length, 2);
}

export function exponentialSmoothingForecast(lastActual: number, lastForecast: number, alpha = 0.3): number {
  return roundQty(alpha * lastActual + (1 - alpha) * lastForecast, 2);
}

export function compareDemand(actual: number, projected: number): { varianceQty: number; variancePct: number } {
  const varianceQty = roundQty(actual - projected, 2);
  const variancePct = projected !== 0 ? roundQty((varianceQty / projected) * 100, 2) : 0;
  return { varianceQty, variancePct };
}

export function computeReorderPoint(avgDailyDemand: number, leadTimeDays: number, safetyStock: number): number {
  return roundQty(avgDailyDemand * leadTimeDays + safetyStock, 2);
}

export function computeSafetyStock(avgDailyDemand: number, leadTimeDays: number, serviceFactor = 1.65): number {
  return roundQty(avgDailyDemand * Math.sqrt(leadTimeDays) * serviceFactor * 0.1, 2);
}

export function computeReplenishmentQty(
  currentQty: number,
  reorderPoint: number,
  maxStock: number,
): number {
  if (currentQty > reorderPoint) return 0;
  return roundQty(Math.max(0, maxStock - currentQty), 2);
}

export function classifyAbc(items: Array<{ itemKey: string; annualValue: number }>): Map<string, 'A' | 'B' | 'C'> {
  const sorted = [...items].sort((a, b) => b.annualValue - a.annualValue);
  const total = sorted.reduce((s, i) => s + i.annualValue, 0) || 1;
  const result = new Map<string, 'A' | 'B' | 'C'>();
  let cumulative = 0;
  for (const item of sorted) {
    cumulative += item.annualValue;
    const pct = (cumulative / total) * 100;
    result.set(item.itemKey, pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C');
  }
  return result;
}

export function classifyXyz(items: Array<{ itemKey: string; cv: number }>): Map<string, 'X' | 'Y' | 'Z'> {
  const result = new Map<string, 'X' | 'Y' | 'Z'>();
  for (const item of items) {
    result.set(item.itemKey, item.cv <= 0.5 ? 'X' : item.cv <= 1 ? 'Y' : 'Z');
  }
  return result;
}

export function computeCoefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return roundQty(Math.sqrt(variance) / mean, 4);
}

export function computeRotationRate(consumedQty: number, avgInventory: number): number {
  if (avgInventory <= 0) return 0;
  return roundQty(consumedQty / avgInventory, 2);
}

export function computeCoverageDays(onHandQty: number, avgDailyDemand: number): number {
  if (avgDailyDemand <= 0) return onHandQty > 0 ? 999 : 0;
  return roundQty(onHandQty / avgDailyDemand, 2);
}

export function detectStockoutRisk(onHandQty: number, reorderPoint: number): boolean {
  return onHandQty <= reorderPoint;
}

export function detectExcessInventory(onHandQty: number, maxStock: number): boolean {
  return maxStock > 0 && onHandQty > maxStock;
}

export function detectNoMovement(daysSinceLastMovement: number, thresholdDays = 90): boolean {
  return daysSinceLastMovement >= thresholdDays;
}

export function aggregateScmIndicators(data: {
  forecasts: number;
  proposals: number;
  openAlerts: number;
  criticalItems: number;
  obsoleteItems: number;
  avgCoverageDays: number;
  planCompliancePct: number;
}) {
  return {
    forecastCount: data.forecasts,
    openProposals: data.proposals,
    openAlerts: data.openAlerts,
    criticalItems: data.criticalItems,
    obsoleteItems: data.obsoleteItems,
    avgCoverageDays: roundQty(data.avgCoverageDays, 2),
    planCompliancePct: roundQty(data.planCompliancePct, 2),
  };
}
