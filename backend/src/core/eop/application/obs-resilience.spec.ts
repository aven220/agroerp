import { latencyToHealth, rollupHealth } from '../domain/health.engine';

describe('EOP availability and recovery', () => {
  it('marks degraded then recovers to healthy', () => {
    let status = rollupHealth(['healthy', 'degraded']);
    expect(status).toBe('degraded');
    status = rollupHealth(['healthy', 'healthy']);
    expect(status).toBe('healthy');
  });

  it('simulates outage and recovery via latency thresholds', () => {
    expect(latencyToHealth(5000)).toBe('unhealthy');
    expect(latencyToHealth(100)).toBe('healthy');
  });

  it('handles empty health set as unknown', () => {
    expect(rollupHealth([])).toBe('unknown');
  });
});
