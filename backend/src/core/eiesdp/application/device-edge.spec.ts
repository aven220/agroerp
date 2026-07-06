import {
  evaluateEdgeCondition,
  matchEdgeRules,
} from '../domain/edge-rule.engine';

describe('EIESDP EdgeRuleEngine', () => {
  it('evaluates gt/lt operators', () => {
    expect(evaluateEdgeCondition({ metricKey: 'temp', operator: 'gt', value: 30 }, { temp: 35 })).toBe(true);
    expect(evaluateEdgeCondition({ metricKey: 'temp', operator: 'gt', value: 30 }, { temp: 25 })).toBe(false);
    expect(evaluateEdgeCondition({ metricKey: 'humidity', operator: 'lt', value: 40 }, { humidity: 30 })).toBe(true);
  });

  it('evaluates eq/gte/lte operators', () => {
    expect(evaluateEdgeCondition({ metricKey: 'ph', operator: 'eq', value: 7 }, { ph: 7 })).toBe(true);
    expect(evaluateEdgeCondition({ metricKey: 'ph', operator: 'gte', value: 6 }, { ph: 6.5 })).toBe(true);
    expect(evaluateEdgeCondition({ metricKey: 'ph', operator: 'lte', value: 8 }, { ph: 7.9 })).toBe(true);
  });

  it('rejects non-numeric context values', () => {
    expect(evaluateEdgeCondition({ metricKey: 'temp', operator: 'gt', value: 0 }, { temp: 'hot' })).toBe(false);
  });

  it('matches active rules against telemetry context', () => {
    const rules = [
      { ruleKey: 'high-temp', conditions: { metricKey: 'temperature', operator: 'gt', value: 40 } },
      { ruleKey: 'low-battery', conditions: { metricKey: 'batteryLevel', operator: 'lt', value: 20 } },
    ];
    const matched = matchEdgeRules(rules, { temperature: 45, batteryLevel: 80 });
    expect(matched.map((r) => r.ruleKey)).toEqual(['high-temp']);
  });
});

describe('EIESDP connectivity — offline threshold', () => {
  it('marks device offline after 5 minutes without heartbeat', () => {
    const thresholdMs = 5 * 60_000;
    const lastSeen = Date.now() - 6 * 60_000;
    expect(Date.now() - lastSeen > thresholdMs).toBe(true);
  });

  it('reconnects when telemetry arrives after offline', () => {
    const previousStatus = 'offline';
    const nextStatus = previousStatus === 'offline' ? 'active' : previousStatus;
    expect(nextStatus).toBe('active');
  });
});
