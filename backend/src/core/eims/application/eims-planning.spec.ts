import {
  computeAvailableQty,
  computeReplenishmentQty,
  computeRotationRate,
  computeTransferSuggestion,
  detectDemandAnomaly,
  evaluateStockAlerts,
  generateReservationKey,
  movingAverageForecast,
  resolveEffectiveLevels,
  simulateScenario,
} from '../domain/eims-planning.engine';

describe('EIMS PlanningEngine', () => {
  it('generates reservation keys and computes availability', () => {
    expect(generateReservationKey('sales_order')).toContain('RSV-SALES_OR');
    expect(computeAvailableQty({ onHandQty: 100, reservedQty: 30, availableQty: 70 })).toBe(70);
    expect(computeAvailableQty({ onHandQty: 10, reservedQty: 20, availableQty: 0 })).toBe(0);
  });

  it('resolves effective stock levels from profile', () => {
    const levels = resolveEffectiveLevels(
      { minStock: 10, safetyStock: 5, reorderPoint: 20, leadTimeDays: 7 },
      { maxStock: 500, economicOrderQty: 50, coverageDays: 30 },
    );
    expect(levels.minStock).toBe(10);
    expect(levels.maxStock).toBe(500);
    expect(levels.economicOrderQty).toBe(50);
  });

  it('computes replenishment when below reorder point', () => {
    const repl = computeReplenishmentQty(
      { onHandQty: 50, reservedQty: 10, availableQty: 40 },
      { minStock: 20, safetyStock: 15, reorderPoint: 60, maxStock: 200, leadTimeDays: 7 },
      2,
    );
    expect(repl.suggestedQty).toBeGreaterThan(0);
    expect(repl.reason).toContain('reorden');
  });

  it('skips replenishment when above reorder point', () => {
    const repl = computeReplenishmentQty(
      { onHandQty: 200, reservedQty: 0, availableQty: 200 },
      { minStock: 20, safetyStock: 15, reorderPoint: 60, leadTimeDays: 7 },
      1,
    );
    expect(repl.suggestedQty).toBe(0);
  });

  it('suggests inter-warehouse transfers', () => {
    const transfer = computeTransferSuggestion(
      { warehouseKey: 'WH-A', availableQty: 100 },
      { warehouseKey: 'WH-B', availableQty: 5, neededQty: 40 },
    );
    expect(transfer?.fromWarehouseKey).toBe('WH-A');
    expect(transfer?.suggestedQty).toBe(40);
  });

  it('forecasts with moving average and detects anomalies', () => {
    const history = [10, 12, 11, 10, 9, 50];
    expect(movingAverageForecast(history, 3)).toBeCloseTo(23, 0);
    expect(detectDemandAnomaly(history)).toBe(true);
    expect(detectDemandAnomaly([10, 10, 10, 10])).toBe(false);
  });

  it('evaluates stock alerts comprehensively', () => {
    const alerts = evaluateStockAlerts({
      itemKey: 'ITEM-1',
      warehouseKey: 'WH-1',
      position: { onHandQty: 5, reservedQty: 2, availableQty: 3 },
      levels: { minStock: 10, safetyStock: 8, reorderPoint: 15, maxStock: 100, leadTimeDays: 7 },
      daysSinceLastMovement: 95,
      expiryWithinDays: 5,
      expiredReservations: 2,
    });
    const types = alerts.map((a) => a.alertType);
    expect(types).toContain('low_stock');
    expect(types).toContain('dead_stock');
    expect(types).toContain('expiry_soon');
    expect(types).toContain('reservation_expired');
  });

  it('computes rotation rate', () => {
    expect(computeRotationRate(365, 100, 365)).toBeCloseTo(3.65, 1);
  });

  it('simulates demand scenarios with multiplier', () => {
    const result = simulateScenario({
      items: [
        { itemKey: 'A', availableQty: 30, dailyDemand: 2, leadTimeDays: 7, unitCost: 10 },
        { itemKey: 'B', availableQty: 100, dailyDemand: 1, leadTimeDays: 7, unitCost: 5 },
      ],
      horizonDays: 90,
      demandMultiplier: 2,
    });
    expect(result.lines.length).toBe(2);
    expect(result.stockouts).toBeGreaterThanOrEqual(0);
    expect(result.projectedValue).toBeGreaterThan(0);
  });

  it('handles concurrent reservation key uniqueness pattern', () => {
    const keys = new Set(
      Array.from({ length: 50 }, (_, i) => generateReservationKey('temporary', i + 1)),
    );
    expect(keys.size).toBe(50);
  });

  it('simulates high-volume demand history aggregation', () => {
    const history = Array.from({ length: 1000 }, (_, i) => 10 + (i % 5));
    const forecast = movingAverageForecast(history, 30);
    expect(forecast).toBeGreaterThan(9);
    expect(forecast).toBeLessThan(15);
  });
});
