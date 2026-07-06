import {
  aggregateMonitoringIndicators,
  autoAssignTask,
  canTransitionInstance,
  computeDueDate,
  detectBottlenecks,
  evaluateExpression,
  evaluateSlaStatus,
  exportBpmnPackage,
  generateBpmsKey,
  selectOutgoingFlows,
  validateBpmnGraph,
} from '../domain/bpms.engine';

describe('bpms.engine', () => {
  it('generates BPMS keys', () => {
    expect(generateBpmsKey('INS', 1)).toBe('INS-000001');
  });

  it('validates BPMN graph', () => {
    const result = validateBpmnGraph(
      [
        { elementKey: 'start', elementType: 'start', name: 'Inicio' },
        { elementKey: 'task', elementType: 'user_task', name: 'Tarea' },
        { elementKey: 'end', elementType: 'end', name: 'Fin' },
      ],
      [
        { flowKey: 'f1', fromElementKey: 'start', toElementKey: 'task' },
        { flowKey: 'f2', fromElementKey: 'task', toElementKey: 'end' },
      ],
    );
    expect(result.valid).toBe(true);
  });

  it('rejects graph without start', () => {
    const result = validateBpmnGraph(
      [{ elementKey: 'end', elementType: 'end', name: 'Fin' }],
      [],
    );
    expect(result.valid).toBe(false);
  });

  it('evaluates expressions', () => {
    expect(evaluateExpression('amount > 1000', { amount: 1500 })).toBe(true);
    expect(evaluateExpression('amount > 1000', { amount: 500 })).toBe(false);
  });

  it('selects outgoing flows', () => {
    const flows = [
      { flowKey: 'f1', fromElementKey: 'gw', toElementKey: 'a', condition: 'approved === true' },
      { flowKey: 'f2', fromElementKey: 'gw', toElementKey: 'b', condition: 'approved === false' },
    ];
    const selected = selectOutgoingFlows(flows, 'gw', { approved: true }, 'exclusive_gateway');
    expect(selected[0].toElementKey).toBe('a');
  });

  it('computes due dates by priority', () => {
    const due = computeDueDate('critical');
    expect(due.getTime()).toBeGreaterThan(Date.now());
  });

  it('evaluates SLA status', () => {
    const breached = evaluateSlaStatus({
      startedAt: new Date('2026-01-01'),
      dueAt: new Date('2026-01-02'),
      completedAt: new Date('2026-01-05'),
    });
    expect(breached).toBe('breached');
  });

  it('auto assigns tasks', () => {
    expect(autoAssignTask([{ userId: 'u1', workload: 5 }, { userId: 'u2', workload: 1 }])).toBe('u2');
  });

  it('aggregates monitoring indicators', () => {
    const agg = aggregateMonitoringIndicators({ active: 10, completed: 80, failed: 10, avgDurationHours: 2.5, slaBreached: 5, slaCompliant: 95 });
    expect(agg.slaCompliancePct).toBe(95);
    expect(agg.throughputPct).toBe(80);
  });

  it('detects bottlenecks', () => {
    const logs = Array.from({ length: 100 }, (_, i) => ({ elementKey: i % 2 === 0 ? 'slow' : 'fast', durationMs: i % 2 === 0 ? 5000 : 100 }));
    const bottlenecks = detectBottlenecks(logs);
    expect(bottlenecks[0].elementKey).toBe('slow');
  });

  it('exports BPMN package', () => {
    const pkg = exportBpmnPackage('P1', 'Test', [], [], 1);
    expect(pkg.bpmnVersion).toBe('2.0');
  });

  it('validates instance transitions', () => {
    expect(canTransitionInstance('running', 'suspended')).toBe(true);
    expect(canTransitionInstance('completed', 'running')).toBe(false);
  });

  it('handles mass flow evaluation', () => {
    const results = Array.from({ length: 1000 }, (_, i) =>
      evaluateExpression('x > 500', { x: i }),
    );
    expect(results.filter(Boolean).length).toBe(499);
  });

  it('handles concurrent simulation of assignments', () => {
    const pools = Array.from({ length: 200 }, () =>
      autoAssignTask([{ userId: 'a', workload: Math.random() * 10 }, { userId: 'b', workload: Math.random() * 10 }]),
    );
    expect(pools.every((p) => p === 'a' || p === 'b')).toBe(true);
  });
});
