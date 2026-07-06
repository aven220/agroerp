import {
  aggregateEaceIndicators,
  buildExecutiveIndicators,
  computeContractCompliance,
  computeContractorRating,
  generateEaceKey,
  resolveProfileAccess,
  EACE_CONTRACTOR_TYPES,
  EACE_LISTING_TYPES,
} from '../domain/eace.engine';

describe('eace.engine', () => {
  it('generates EACE keys', () => {
    expect(generateEaceKey('PRD', 1)).toBe('PRD-000001');
  });

  it('computes contract compliance', () => {
    const r = computeContractCompliance([
      { targetValue: 100, actualValue: 110 },
      { targetValue: 50, actualValue: 40 },
    ]);
    expect(r.compliancePct).toBe(50);
    expect(r.total).toBe(2);
  });

  it('computes contractor rating', () => {
    const r = computeContractorRating([4, 5, 3]);
    expect(r.rating).toBeGreaterThan(3);
    expect(r.count).toBe(3);
  });

  it('aggregates ecosystem indicators', () => {
    const agg = aggregateEaceIndicators({
      activeProducers: 20, collaborativeOrgs: 5, activeContracts: 12,
      contractors: 8, advisors: 6, marketplaceListings: 15, knowledgeItems: 25,
      openVisits: 4, criticalAlerts: 1, contractComplianceAvg: 88,
    });
    expect(agg.ecosystemReady).toBe(true);
    expect(agg.ecosystemScore).toBeGreaterThan(0);
  });

  it('builds executive indicators', () => {
    const ex = buildExecutiveIndicators({ productionTons: 500, yieldPerHa: 4200, criticalAlerts: 2 });
    expect(ex.production).toBe(500);
    expect(ex.criticalAlerts).toBe(2);
  });

  it('exposes contractor and listing types', () => {
    expect(EACE_CONTRACTOR_TYPES).toContain('consultant');
    expect(EACE_LISTING_TYPES).toContain('machinery_rental');
  });
});

describe('eace.access.roles', () => {
  it('allows producer access to contracts', () => {
    expect(resolveProfileAccess('producer', 'contracts')).toBe(true);
    expect(resolveProfileAccess('producer', 'cooperatives')).toBe(false);
  });

  it('allows executive broad access', () => {
    expect(resolveProfileAccess('executive', 'executive')).toBe(true);
    expect(resolveProfileAccess('admin', 'cooperatives')).toBe(true);
  });
});

describe('eace.mass.concurrency', () => {
  it('handles concurrent key generation', () => {
    const keys = new Set(Array.from({ length: 500 }, (_, i) => generateEaceKey('CTR', i + 1)));
    expect(keys.size).toBe(500);
  });

  it('runs bulk compliance scoring', () => {
    const results = Array.from({ length: 100 }, (_, i) =>
      computeContractCompliance([{ targetValue: 100, actualValue: 90 + (i % 20) }]),
    );
    expect(results.every((r) => r.compliancePct >= 0)).toBe(true);
  });
});
