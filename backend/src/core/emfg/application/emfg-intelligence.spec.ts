import {
  aggregateAnalytics,
  aggregateIntelligenceIndicators,
  aggregateProductionKpis,
  buildExportRows,
  compareScenarios,
  computeAvailabilityPct,
  computeOee,
  computePerformancePct,
  computeQualityPct,
  runBomSimulation,
  runCapacitySimulation,
  runDemandSimulation,
  runRoutingSimulation,
  runShiftSimulation,
} from '../domain/emfg-intelligence.engine';

describe('emfg-intelligence.engine', () => {
  it('computes OEE components', () => {
    expect(computeAvailabilityPct(480, 48)).toBe(90);
    expect(computePerformancePct(1, 400, 432)).toBeCloseTo(92.59, 1);
    expect(computeQualityPct(950, 1000)).toBe(95);
    expect(computeOee(90, 92.59, 95)).toBeCloseTo(79.17, 1);
  });

  it('aggregates production KPIs', () => {
    const result = aggregateProductionKpis({
      orders: [
        { status: 'completed', plannedQty: 100, producedQty: 95, scrapQty: 5, reworkQty: 2, elapsedMinutes: 120, plannedEnd: null, actualEnd: new Date() },
        { status: 'in_progress', plannedQty: 50, producedQty: 30, scrapQty: 1, reworkQty: 0, elapsedMinutes: 60, plannedEnd: new Date(Date.now() - 86400000), actualEnd: null },
      ],
      capacities: [{ entityKey: 'WC1', entityType: 'work_center', installedMinutes: 480, utilizedMinutes: 400 }],
      operations: [{ setupMinutes: 30, runMinutes: 90, completedMinutes: 85 }],
    });
    expect(result.completedOrders).toBe(1);
    expect(result.delayedOrders).toBe(1);
    expect(result.planCompliancePct).toBeGreaterThan(0);
  });

  it('aggregates analytics', () => {
    const result = aggregateAnalytics({
      capacities: [{ entityKey: 'WC1', entityType: 'work_center', installedMinutes: 100, utilizedMinutes: 90 }],
      downtimes: [{ entityKey: 'EQ1', downtimeMinutes: 60, reason: 'breakdown' }],
      equipment: [{ equipmentKey: 'EQ1', name: 'Press', availabilityStatus: 'maintenance', downtimeMinutes: 120 }],
      costSummaries: [{ itemKey: 'P1', marginActual: 10, actualUnitCost: 5 }],
      consumptions: [{ componentKey: 'M1', quantity: 100 }],
      operatorEfficiency: [{ operatorKey: 'OP1', producedQty: 50, elapsedMinutes: 60 }],
      shiftEfficiency: [{ shiftKey: 'S1', producedQty: 400, plannedQty: 480 }],
      workCenterEfficiency: [{ workCenterKey: 'WC1', utilizationPct: 85 }],
      supplierQuality: [{ supplierKey: 'SUP1', passRate: 95, inspectionCount: 20 }],
    });
    expect(result.bottlenecks.length).toBeGreaterThan(0);
    expect(result.frequentStops[0].reason).toBe('breakdown');
  });

  it('runs simulations', () => {
    expect(runDemandSimulation([{ orderKey: 'O1', plannedQty: 100 }], 20)[0].simulatedQty).toBe(120);
    expect(runCapacitySimulation(1000, 200).simulatedCapacity).toBe(1200);
    expect(runShiftSimulation(2, 1, 480).simulatedMinutes).toBe(1440);
    expect(runRoutingSimulation([{ operationKey: 'OP1', runMinutes: 60 }], 10)[0].simulatedMinutes).toBe(66);
    expect(runBomSimulation([{ componentKey: 'C1', quantity: 10 }], 5)[0].simulatedQty).toBe(10.5);
  });

  it('compares scenarios', () => {
    const comparison = compareScenarios(
      { totalQty: 100 },
      [{ name: 'A', result: { totalQty: 120 } }],
    );
    expect(comparison[0].deltas.totalQty).toBe(20);
  });

  it('aggregates intelligence indicators', () => {
    const kpis = aggregateProductionKpis({ orders: [], capacities: [], operations: [] });
    const result = aggregateIntelligenceIndicators({
      oeeSnapshots: [{ oeePct: 75, scope: 'plant' }, { oeePct: 80, scope: 'machine' }],
      kpis,
      alertCount: 3,
    });
    expect(result.avgOeePct).toBe(77.5);
    expect(result.openAlerts).toBe(3);
  });

  it('builds export rows', () => {
    const rows = buildExportRows('oee', { snapshots: [{ entityKey: 'EQ1', oeePct: 75 }] });
    expect(rows.length).toBe(1);
  });

  it('handles mass volume aggregation', () => {
    const orders = Array.from({ length: 5000 }, (_, i) => ({
      status: i % 3 === 0 ? 'completed' : 'in_progress',
      plannedQty: 100,
      producedQty: 80,
      scrapQty: 2,
      reworkQty: 1,
      elapsedMinutes: 60,
      plannedEnd: null,
      actualEnd: null,
    }));
    const result = aggregateProductionKpis({ orders, capacities: [], operations: [] });
    expect(result.orderCount).toBe(5000);
  });

  it('handles concurrent OEE calculations', () => {
    const results = Array.from({ length: 1000 }, (_, i) =>
      computeOee(90 + (i % 10), 85 + (i % 15), 95),
    );
    expect(results.every((r) => r >= 0 && r <= 100)).toBe(true);
  });
});
