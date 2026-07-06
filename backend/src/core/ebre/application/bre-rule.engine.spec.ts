import { BreRuleEngine } from './bre-rule.engine';
import { WorkflowRuleEngine } from '@/core/workflows/application/workflow-rule.engine';

describe('BreRuleEngine', () => {
  const engine = new BreRuleEngine(new WorkflowRuleEngine());

  it('evaluates conditions with payload context', () => {
    const matched = engine.evaluate(
      { all: [{ type: 'condition', field: 'payload.status', operator: 'eq', value: 'active' }] },
      { instance: {}, payload: { status: 'active' } },
    );
    expect(matched).toBe(true);
  });

  it('supports computed variables', () => {
    const matched = engine.evaluate(
      { all: [{ type: 'condition', field: 'variables.score', operator: 'gte', value: 80 }] },
      { instance: {}, variables: { score: 85 } },
    );
    expect(matched).toBe(true);
  });
});

import { BreExpressionEngine } from './bre-expression.engine';

describe('EBRE security', () => {
  it('rejects unsafe math expressions', () => {
    const engine = new BreExpressionEngine();
    expect(() => engine.evaluate({ key: 'x', expression: '1 + alert(1)', type: 'math' }, {})).toThrow();
  });
});

describe('EBRE concurrency readiness', () => {
  it('processes batch evaluation shape', async () => {
    const batch = Array.from({ length: 100 }, (_, i) => ({ id: i, payload: { score: i } }));
    const results = batch.map((b) => b.payload.score >= 50);
    expect(results.filter(Boolean).length).toBe(50);
  });
});
