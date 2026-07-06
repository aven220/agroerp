import {
  aggregateCmmsCosts,
  aggregateCmmsIndicators,
  aggregateWorkOrderCosts,
  canTransitionWorkOrder,
  computeNextScheduleDate,
  detectScheduleConflicts,
  evaluateSlaCompliance,
  generateEamCmmsKey,
  selectTechnicianForAssignment,
} from '../domain/eam-cmms.engine';

describe('eam-cmms.engine', () => {
  it('generates CMMS keys', () => {
    expect(generateEamCmmsKey('WO', 1)).toBe('WO-000001');
  });

  it('validates work order transitions', () => {
    expect(canTransitionWorkOrder('draft', 'pending_approval')).toBe(true);
    expect(canTransitionWorkOrder('in_progress', 'paused')).toBe(true);
    expect(canTransitionWorkOrder('cancelled', 'in_progress')).toBe(false);
  });

  it('computes next schedule date', () => {
    const next = computeNextScheduleDate(new Date('2026-01-01'), 30, 'days');
    expect(next.getTime()).toBeGreaterThan(new Date('2026-01-01').getTime());
  });

  it('detects schedule conflicts', () => {
    const existing = [{ technicianKey: 'T1', startsAt: new Date('2026-07-05T08:00:00Z'), endsAt: new Date('2026-07-05T12:00:00Z') }];
    const conflict = detectScheduleConflicts(existing, {
      technicianKey: 'T1',
      startsAt: new Date('2026-07-05T10:00:00Z'),
      endsAt: new Date('2026-07-05T14:00:00Z'),
    });
    expect(conflict).toBe(true);
  });

  it('selects technician for assignment', () => {
    const key = selectTechnicianForAssignment([
      { technicianKey: 'T1', hours: 10, isAvailable: true },
      { technicianKey: 'T2', hours: 2, isAvailable: true },
    ], 'high');
    expect(key).toBe('T2');
  });

  it('aggregates work order costs', () => {
    const agg = aggregateWorkOrderCosts([
      { costType: 'labor', amount: 100 },
      { costType: 'spare_part', amount: 50 },
    ]);
    expect(agg.total).toBe(150);
    expect(agg.byType.labor).toBe(100);
  });

  it('aggregates CMMS costs by asset and family', () => {
    const agg = aggregateCmmsCosts([
      { totalCost: 1000, assetKey: 'A1', familyKey: 'F1' },
      { totalCost: 500, assetKey: 'A1', familyKey: 'F1' },
    ]);
    expect(agg.annualTotal).toBe(1500);
    expect(agg.byAsset.A1).toBe(1500);
  });

  it('evaluates SLA compliance', () => {
    expect(evaluateSlaCompliance(2, 10, 4, 24)).toBe('compliant');
    expect(evaluateSlaCompliance(5, 30, 4, 24)).toBe('breached');
  });

  it('aggregates CMMS indicators', () => {
    const ind = aggregateCmmsIndicators({
      openWorkOrders: 10,
      completedWorkOrders: 90,
      overdueWorkOrders: 2,
      openIncidents: 3,
      slaBreached: 1,
      slaCompliant: 9,
      totalMaintCost: 5000000,
      technicianUtilizationPct: 75,
    });
    expect(ind.completionPct).toBe(90);
    expect(ind.slaCompliancePct).toBe(90);
  });

  it('handles mass volume scheduling', () => {
    const results = Array.from({ length: 2000 }, (_, i) =>
      computeNextScheduleDate(null, 7 + (i % 30), 'days'),
    );
    expect(results.every((d) => d instanceof Date)).toBe(true);
  });

  it('handles concurrent transition checks', () => {
    const statuses = ['draft', 'pending_approval', 'approved', 'scheduled', 'in_progress', 'paused', 'pending_close', 'technically_closed', 'administratively_closed', 'cancelled'] as const;
    const results = Array.from({ length: 500 }, (_, i) =>
      canTransitionWorkOrder(statuses[i % statuses.length], 'cancelled'),
    );
    expect(results.some((r) => r === true)).toBe(true);
  });
});
