import {
  aggregateEipIndicators,
  applyTransform,
  computeRetryDelay,
  evaluateCondition,
  generateEipKey,
  mapMessageStatus,
  routeEsbMessage,
  selectLoadBalanceTarget,
  shouldMoveToDlq,
  signPayload,
  simulateRuleLocally,
  validateOrigin,
  verifySignature,
  EIP_CONNECTOR_CATALOG,
  EIP_MESSAGING_SLOTS,
} from '../domain/eip.engine';

describe('eip.engine', () => {
  it('generates EIP keys', () => {
    expect(generateEipKey('EVT', 1)).toBe('EVT-000001');
  });

  it('evaluates conditions', () => {
    expect(evaluateCondition('amount > 100', { amount: 150 })).toBe(true);
    expect(evaluateCondition('amount > 100', { amount: 50 })).toBe(false);
  });

  it('applies transforms', () => {
    const result = applyTransform({ total: '$amount' }, { amount: 42 });
    expect(result.total).toBe(42);
  });

  it('signs and verifies payloads', () => {
    const sig = signPayload('secret', '{"a":1}');
    expect(verifySignature('secret', '{"a":1}', sig)).toBe(true);
    expect(verifySignature('secret', '{"a":2}', sig)).toBe(false);
  });

  it('validates origin hosts', () => {
    expect(validateOrigin(['api.example.com'], 'https://api.example.com/hook')).toBe(true);
    expect(validateOrigin(['api.example.com'], 'https://evil.com')).toBe(false);
    expect(validateOrigin([], 'any')).toBe(true);
  });

  it('computes retry delay with backoff', () => {
    expect(computeRetryDelay(0, 1000)).toBe(1000);
    expect(computeRetryDelay(3, 1000)).toBe(8000);
  });

  it('detects DLQ threshold', () => {
    expect(shouldMoveToDlq(5, 5)).toBe(true);
    expect(shouldMoveToDlq(3, 5)).toBe(false);
  });

  it('selects load balance target', () => {
    const targets = ['a', 'b', 'c'];
    expect(selectLoadBalanceTarget(targets, 'round_robin', 0)).toBe('a');
    expect(selectLoadBalanceTarget(targets, 'round_robin', 4)).toBe('b');
  });

  it('routes ESB messages by priority', () => {
    const routes = [
      { routeKey: 'r2', sourceRef: 'src', conditions: '', priority: 200 },
      { routeKey: 'r1', sourceRef: 'src', conditions: '', priority: 100 },
    ];
    expect(routeEsbMessage(routes, 'src', {})).toBe('r1');
  });

  it('maps message status', () => {
    expect(mapMessageStatus(true, 0, 5)).toBe('completed');
    expect(mapMessageStatus(false, 5, 5)).toBe('dlq');
    expect(mapMessageStatus(false, 1, 5)).toBe('failed');
  });

  it('aggregates indicators', () => {
    const agg = aggregateEipIndicators({
      invocations24h: 100,
      failedInvocations24h: 10,
      events24h: 50,
      dlqCount: 2,
      webhooksPending: 3,
      esbMessages24h: 20,
      avgDurationMs: 120,
    });
    expect(agg.successRate24h).toBe(90);
    expect(agg.healthScore).toBe(88);
  });

  it('simulates rules locally', () => {
    const result = simulateRuleLocally({}, [], [{ type: 'notify' }], { score: 10 });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('exposes connector catalog', () => {
    expect(EIP_CONNECTOR_CATALOG.length).toBeGreaterThanOrEqual(10);
    expect(EIP_CONNECTOR_CATALOG.some((c) => c.protocol === 'rest')).toBe(true);
  });

  it('exposes messaging slots', () => {
    expect(EIP_MESSAGING_SLOTS.some((s) => s.providerType === 'kafka')).toBe(true);
    expect(EIP_MESSAGING_SLOTS.some((s) => s.providerType === 'rabbitmq')).toBe(true);
  });
});

describe('eip.resilience', () => {
  it('handles concurrent condition evaluation', async () => {
    const results = await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        Promise.resolve(evaluateCondition('i >= 0', { i })),
      ),
    );
    expect(results.every(Boolean)).toBe(true);
  });

  it('handles high volume key generation', () => {
    const keys = new Set(Array.from({ length: 1000 }, (_, i) => generateEipKey('HV', i + 1)));
    expect(keys.size).toBe(1000);
  });
});
