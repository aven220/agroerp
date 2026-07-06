import { WorkflowRuleEngine } from './workflow-rule.engine';

describe('WorkflowRuleEngine', () => {
  const engine = new WorkflowRuleEngine();

  const baseCtx = {
    instance: { currentState: 'pending', priority: 'high' },
    variables: { amount: 1500 },
    actor: { role: 'manager' },
  };

  it('returns true when group is undefined', () => {
    expect(engine.evaluate(undefined, baseCtx)).toBe(true);
  });

  it('evaluates all conditions', () => {
    const group = {
      all: [
        { type: 'condition' as const, field: 'variables.amount', operator: 'gte' as const, value: 1000 },
        { type: 'condition' as const, field: 'instance.priority', operator: 'eq' as const, value: 'high' },
      ],
    };
    expect(engine.evaluate(group, baseCtx)).toBe(true);
  });

  it('evaluates any conditions', () => {
    const group = {
      any: [
        { type: 'condition' as const, field: 'variables.amount', operator: 'lt' as const, value: 100 },
        { type: 'condition' as const, field: 'variables.amount', operator: 'gte' as const, value: 1000 },
      ],
    };
    expect(engine.evaluate(group, baseCtx)).toBe(true);
  });

  it('evaluates if/then/else branches', () => {
    const group = {
      if: { type: 'condition' as const, field: 'variables.amount', operator: 'gte' as const, value: 2000 },
      then: { type: 'condition' as const, field: 'instance.priority', operator: 'eq' as const, value: 'urgent' },
      else: { type: 'condition' as const, field: 'instance.priority', operator: 'eq' as const, value: 'high' },
    };
    expect(engine.evaluate(group, baseCtx)).toBe(true);
  });

  it('evaluates contains operator', () => {
    const group = {
      all: [
        { type: 'condition' as const, field: 'actor.role', operator: 'contains' as const, value: 'man' },
      ],
    };
    expect(engine.evaluate(group, baseCtx)).toBe(true);
  });
});
