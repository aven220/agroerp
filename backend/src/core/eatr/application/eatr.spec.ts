import {
  aggregateEatrIndicators,
  buildTraceChain,
  computeHarvestYield,
  EATR_TRACE_EVENT_TYPES,
  generateEatrKey,
  validateQualityConformity,
} from '../domain/eatr.engine';

describe('eatr.engine', () => {
  it('generates EATR keys', () => {
    expect(generateEatrKey('PLT', 1)).toBe('PLT-000001');
  });

  it('computes harvest yield', () => {
    const y = computeHarvestYield(1000, 50, 30, 10);
    expect(y.netKg).toBe(920);
    expect(y.yieldPct).toBe(92);
    expect(y.yieldPerHa).toBe(92);
  });

  it('builds trace chain', () => {
    const chain = buildTraceChain([
      { eventType: 'planting', occurredAt: new Date('2026-01-01') },
      { eventType: 'harvest', occurredAt: new Date('2026-06-01') },
    ]);
    expect(chain).toHaveLength(2);
    expect(chain[0].sequence).toBe(1);
    expect(chain[1].eventType).toBe('harvest');
  });

  it('validates quality conformity', () => {
    const ok = validateQualityConformity({ moisturePct: 70, defectsPct: 5 });
    const fail = validateQualityConformity({ moisturePct: 90, defectsPct: 15 });
    expect(ok.isConforming).toBe(true);
    expect(fail.isConforming).toBe(false);
  });

  it('aggregates trace indicators', () => {
    const agg = aggregateEatrIndicators({
      productionLots: 10, harvestLots: 8, commercialLots: 15,
      traceEvents30d: 50, qualityInspections: 20, custodyTransfers30d: 12,
    });
    expect(agg.traceabilityReady).toBe(true);
    expect(agg.traceScore).toBeGreaterThan(0);
  });

  it('exposes trace event types', () => {
    expect(EATR_TRACE_EVENT_TYPES).toContain('harvest');
    expect(EATR_TRACE_EVENT_TYPES.length).toBeGreaterThanOrEqual(8);
  });
});

describe('eatr.e2e.simulation', () => {
  it('simulates end-to-end trace chain ordering', () => {
    const events = ['soil_prep', 'planting', 'irrigation', 'harvest', 'postharvest'].map((eventType, i) => ({
      eventType,
      occurredAt: new Date(Date.now() + i * 86400000),
      payload: {},
    }));
    const chain = buildTraceChain(events);
    expect(chain[0].eventType).toBe('soil_prep');
    expect(chain[chain.length - 1].eventType).toBe('postharvest');
  });

  it('handles concurrent key generation', () => {
    const keys = new Set(Array.from({ length: 500 }, (_, i) => generateEatrKey('TRC', i + 1)));
    expect(keys.size).toBe(500);
  });
});
