import { evaluateThreshold, aggregateMetricValues } from '../domain/alert-rule.engine';
import { buildTraceTree, errorFingerprint, generateSpanId, generateTraceId } from '../domain/trace.engine';
import { latencyToHealth, rollupHealth } from '../domain/health.engine';

describe('EOP AlertRuleEngine', () => {
  it('evaluates operators', () => {
    expect(evaluateThreshold(10, 'gt', 5)).toBe(true);
    expect(evaluateThreshold(5, 'gte', 5)).toBe(true);
    expect(evaluateThreshold(3, 'lt', 5)).toBe(true);
    expect(evaluateThreshold(5, 'eq', 5)).toBe(true);
  });

  it('aggregates metric values', () => {
    const agg = aggregateMetricValues([10, 20, 30]);
    expect(agg.avg).toBe(20);
    expect(agg.max).toBe(30);
    expect(agg.count).toBe(3);
  });
});

describe('EOP TraceEngine', () => {
  it('generates ids', () => {
    expect(generateTraceId()).toHaveLength(32);
    expect(generateSpanId()).toHaveLength(16);
  });

  it('builds fingerprint and tree', () => {
    const fp = errorFingerprint('backend', 'boom', 'at line 1');
    expect(fp).toHaveLength(32);
    const tree = buildTraceTree([
      { spanId: 'a', parentSpanId: null, name: 'root', durationMs: 100, serviceName: 'api' },
      { spanId: 'b', parentSpanId: 'a', name: 'child', durationMs: 40, serviceName: 'db' },
    ]);
    expect(tree).toHaveLength(1);
  });
});

describe('EOP HealthEngine', () => {
  it('rollups and latency mapping', () => {
    expect(rollupHealth(['healthy', 'degraded'])).toBe('degraded');
    expect(rollupHealth(['healthy', 'unhealthy'])).toBe('unhealthy');
    expect(latencyToHealth(100)).toBe('healthy');
    expect(latencyToHealth(800)).toBe('degraded');
    expect(latencyToHealth(3000)).toBe('unhealthy');
  });
});
