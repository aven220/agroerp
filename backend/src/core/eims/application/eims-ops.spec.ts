import {
  averageStayDays,
  classifyVelocity,
  computeCoverageDays,
  computeInventoryAccuracy,
  computeOccupancy,
  computeServiceLevel,
  computeTurnover,
  detectAbnormalCost,
  formatExport,
  groupByHour,
  summarizeBalances,
  toCsv,
  toSimplePdf,
  trendSeries,
} from '../domain/eims-ops.engine';

describe('EIMS OpsEngine', () => {
  it('computes core KPIs', () => {
    expect(computeTurnover(120, 40)).toBe(3);
    expect(computeCoverageDays(100, 10)).toBe(10);
    expect(computeServiceLevel(95, 5)).toBe(95);
    expect(computeInventoryAccuracy(100, 98)).toBe(98);
  });

  it('computes average stay days weighted by quantity', () => {
    expect(averageStayDays([{ qty: 10, days: 30 }, { qty: 20, days: 60 }])).toBe(50);
    expect(averageStayDays([])).toBe(0);
  });

  it('computes occupancy and velocity', () => {
    const occ = computeOccupancy(900, 1000);
    expect(occ.occupancyPct).toBe(90);
    expect(occ.saturated).toBe(true);
    expect(classifyVelocity(8)).toBe('high');
    expect(classifyVelocity(0)).toBe('immobilized');
  });

  it('builds trends and hourly series at volume', () => {
    const hours = groupByHour(
      Array.from({ length: 500 }, (_, i) => new Date(`2026-07-03T${String(i % 24).padStart(2, '0')}:00:00Z`)),
    );
    expect(hours).toHaveLength(24);
    expect(hours.reduce((s, h) => s + h.count, 0)).toBe(500);
    const trends = trendSeries(
      Array.from({ length: 100 }, (_, i) => ({ date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`, value: i })),
    );
    expect(trends[1].changePct).toBeGreaterThan(0);
  });

  it('detects abnormal costs and summarizes balances', () => {
    expect(detectAbnormalCost(50, [10, 11, 9, 10])).toBe(true);
    expect(detectAbnormalCost(10.5, [10, 11, 9, 10])).toBe(false);
    const summary = summarizeBalances([
      { onHandQty: 10, reservedQty: 2, blockedQty: 1, availableQty: 7, totalCost: 100, averageCost: 10 },
      { onHandQty: 20, reservedQty: 0, blockedQty: 0, availableQty: 20, totalCost: 200, averageCost: 10 },
    ]);
    expect(summary.totalQty).toBe(30);
    expect(summary.inventoryValue).toBe(300);
  });

  it('exports csv excel and pdf for large datasets', () => {
    const rows = Array.from({ length: 200 }, (_, i) => ({
      itemKey: `ITEM-${i}`,
      warehouseKey: i % 2 === 0 ? 'WH-A' : 'WH-B',
      onHandQty: i,
      totalCost: i * 10,
    }));
    const csv = toCsv(rows);
    expect(csv.split('\n')).toHaveLength(201);
    const excel = formatExport('excel', 'Test', rows);
    expect(excel.contentType).toContain('excel');
    expect(excel.content.charCodeAt(0)).toBe(0xfeff);
    const pdf = formatExport('pdf', 'Inventario', rows.slice(0, 20));
    expect(pdf.content).toContain('%PDF');
    expect(toSimplePdf('Title', ['line1', 'line2'])).toContain('Helvetica');
  });
});
