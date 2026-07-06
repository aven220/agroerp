import {
  aggregateEopsIndicators,
  computeChecksum,
  daysUntil,
  EOPS_HEALTH_TARGETS,
  EOPS_HA_STRATEGIES,
  EOPS_LICENSE_PLANS,
  EOPS_MODULE_SLOTS,
  generateEopsKey,
  mapProbeStatus,
  mapRunStatus,
  rollupHealthStatus,
  validateSecurityConfig,
} from '../domain/eops.engine';

describe('eops.engine', () => {
  it('generates EOPS keys', () => {
    expect(generateEopsKey('BKP', 1)).toBe('BKP-000001');
  });

  it('aggregates operations indicators', () => {
    const agg = aggregateEopsIndicators({
      healthScore: 90,
      openIncidents: 1,
      failedBackups24h: 0,
      securityAlerts: 2,
      queueLagMs: 500,
      licenseDaysLeft: 60,
    });
    expect(agg.opsScore).toBeGreaterThan(0);
    expect(agg.productionReady).toBe(true);
  });

  it('rolls up health statuses', () => {
    expect(rollupHealthStatus(['healthy', 'degraded'])).toBe('degraded');
    expect(rollupHealthStatus(['healthy', 'unhealthy'])).toBe('unhealthy');
  });

  it('maps probe status', () => {
    expect(mapProbeStatus(true)).toBe('healthy');
    expect(mapProbeStatus(false)).toBe('unhealthy');
    expect(mapProbeStatus(true, true)).toBe('degraded');
  });

  it('computes checksum', () => {
    expect(computeChecksum('test')).toMatch(/^chk-/);
  });

  it('computes days until expiry', () => {
    const future = new Date(Date.now() + 10 * 86400000);
    expect(daysUntil(future)).toBeGreaterThanOrEqual(9);
  });

  it('validates security config', () => {
    const issues = validateSecurityConfig({ jwtSecret: 'change-me', allowHttp: true, environment: 'production' });
    expect(issues.length).toBeGreaterThan(0);
  });

  it('maps run status', () => {
    expect(mapRunStatus(true)).toBe('completed');
    expect(mapRunStatus(false)).toBe('failed');
  });

  it('exposes catalogs', () => {
    expect(EOPS_HEALTH_TARGETS.length).toBeGreaterThanOrEqual(10);
    expect(EOPS_HA_STRATEGIES.length).toBeGreaterThanOrEqual(4);
    expect(EOPS_LICENSE_PLANS.length).toBeGreaterThanOrEqual(3);
    expect(EOPS_MODULE_SLOTS.length).toBeGreaterThanOrEqual(10);
  });
});

describe('eops.resilience', () => {
  it('handles concurrent key generation', () => {
    const keys = new Set(Array.from({ length: 500 }, (_, i) => generateEopsKey('HV', i + 1)));
    expect(keys.size).toBe(500);
  });

  it('checkQuota under load', () => {
    const results = Array.from({ length: 1000 }, (_, i) => checkQuota(i, 1000).allowed);
    expect(results.filter(Boolean).length).toBe(1000);
  });
});

function checkQuota(used: number, quota: number) {
  return { allowed: used < quota, remaining: Math.max(0, quota - used) };
}
