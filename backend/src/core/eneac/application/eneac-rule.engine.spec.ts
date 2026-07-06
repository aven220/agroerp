import { EneacRuleEngine } from './eneac-rule.engine';

describe('EneacRuleEngine', () => {
  const engine = new EneacRuleEngine();

  it('passes when conditions are empty', () => {
    expect(engine.evaluate(undefined, { variables: {} })).toBe(true);
  });

  it('evaluates payload conditions', () => {
    const result = engine.evaluate(
      {
        all: [
          { type: 'condition' as const, field: 'variables.severity', operator: 'eq' as const, value: 'critical' },
        ],
      },
      { variables: { severity: 'critical' } },
    );
    expect(result).toBe(true);
  });
});
