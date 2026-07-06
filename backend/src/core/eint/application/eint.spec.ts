import {
  aggregateEintIndicators,
  checkQuota,
  computeTrend,
  EINT_AI_SERVICES,
  EINT_ASSISTANTS,
  EINT_DASHBOARD_CATALOG,
  generateEintKey,
  mapRunStatus,
  partitionKey,
  selectFallbackProvider,
  transformEtlRecords,
} from '../domain/eint.engine';

describe('eint.engine', () => {
  it('generates EINT keys', () => {
    expect(generateEintKey('AIC', 1)).toBe('AIC-000001');
  });

  it('aggregates indicators', () => {
    const agg = aggregateEintIndicators({
      aiCalls24h: 100,
      aiCost24h: 12.5,
      queries24h: 50,
      reports24h: 10,
      etlRuns24h: 20,
      notifications24h: 30,
      failedJobs24h: 2,
    });
    expect(agg.aiCalls24h).toBe(100);
    expect(agg.reliabilityPct).toBe(90);
  });

  it('checks quota', () => {
    expect(checkQuota(50, 100).allowed).toBe(true);
    expect(checkQuota(100, 100).allowed).toBe(false);
  });

  it('selects fallback provider', () => {
    const key = selectFallbackProvider([
      { providerKey: 'b', fallbackOrder: 20, status: 'active' },
      { providerKey: 'a', fallbackOrder: 10, status: 'active' },
    ]);
    expect(key).toBe('a');
  });

  it('transforms ETL records', () => {
    const out = transformEtlRecords([{ amount: 10 }], { total: '$amount' });
    expect(out[0].total).toBe(10);
  });

  it('computes partition key', () => {
    expect(partitionKey(new Date('2026-07-05'))).toBe('2026-07');
  });

  it('computes trend', () => {
    expect(computeTrend([10, 15]).direction).toBe('up');
    expect(computeTrend([15, 10]).direction).toBe('down');
  });

  it('maps run status', () => {
    expect(mapRunStatus(true)).toBe('completed');
    expect(mapRunStatus(false)).toBe('failed');
  });

  it('exposes catalogs', () => {
    expect(EINT_ASSISTANTS.length).toBeGreaterThanOrEqual(12);
    expect(EINT_DASHBOARD_CATALOG.length).toBeGreaterThanOrEqual(9);
    expect(EINT_AI_SERVICES.length).toBeGreaterThanOrEqual(10);
  });
});

describe('eint.resilience', () => {
  it('handles concurrent key generation', () => {
    const keys = new Set(Array.from({ length: 500 }, (_, i) => generateEintKey('HV', i + 1)));
    expect(keys.size).toBe(500);
  });
});
