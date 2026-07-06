import { EOP_COMPONENT_TYPES, EOP_METRIC_KINDS } from '@agroerp/shared';
import { aggregateMetricValues, evaluateThreshold } from '../domain/alert-rule.engine';
import { buildTraceTree, generateTraceId } from '../domain/trace.engine';

describe('EOP Load', () => {
  it('aggregates 50k metric samples under 300ms', () => {
    const values = Array.from({ length: 50_000 }, (_, i) => i % 100);
    const start = Date.now();
    const agg = aggregateMetricValues(values);
    expect(agg.count).toBe(50_000);
    expect(Date.now() - start).toBeLessThan(300);
  });

  it('evaluates 20k alert rules under 200ms', () => {
    const start = Date.now();
    for (let i = 0; i < 20_000; i++) {
      evaluateThreshold(i % 100, 'gt', 50);
    }
    expect(Date.now() - start).toBeLessThan(200);
  });

  it('builds large trace trees under 200ms', () => {
    const spans = Array.from({ length: 2000 }, (_, i) => ({
      spanId: `s${i}`,
      parentSpanId: i === 0 ? null : `s${Math.floor(i / 2)}`,
      name: `span-${i}`,
      durationMs: i,
      serviceName: 'svc',
    }));
    const start = Date.now();
    buildTraceTree(spans);
    expect(Date.now() - start).toBeLessThan(200);
  });

  it('generates 5k trace ids under 100ms', () => {
    const start = Date.now();
    for (let i = 0; i < 5000; i++) generateTraceId();
    expect(Date.now() - start).toBeLessThan(100);
  });
});

describe('EOP catalog completeness', () => {
  it('includes all component types', () => {
    for (const c of [
      'frontend', 'backend', 'android', 'worker', 'job', 'scheduler', 'workflow',
      'integration', 'plugin', 'iot', 'ai', 'gis', 'api_gateway', 'auth', 'database',
    ]) {
      expect(EOP_COMPONENT_TYPES).toContain(c);
    }
  });

  it('includes all metric kinds', () => {
    for (const k of ['cpu', 'ram', 'disk', 'latency', 'errors', 'tps', 'active_users', 'api_usage']) {
      expect(EOP_METRIC_KINDS).toContain(k);
    }
  });
});
