import {
  aggregateEamIndicators,
  buildLocationTree,
  canTransitionStatus,
  generateEamKey,
  isWarrantyExpiringSoon,
  remainingUsefulLifeMonths,
} from '../domain/eam-asset.engine';

describe('eam-asset.engine', () => {
  it('generates EAM keys', () => {
    expect(generateEamKey('AST', 1)).toBe('AST-000001');
    expect(generateEamKey('LOC', 42)).toBe('LOC-000042');
  });

  it('validates lifecycle transitions', () => {
    expect(canTransitionStatus('draft', 'registered')).toBe(true);
    expect(canTransitionStatus('draft', 'operational')).toBe(false);
    expect(canTransitionStatus('operational', 'on_loan')).toBe(true);
    expect(canTransitionStatus('sold', 'operational')).toBe(false);
  });

  it('computes remaining useful life', () => {
    const commissioned = new Date('2020-01-01');
    const remaining = remainingUsefulLifeMonths(commissioned, 60, new Date('2023-01-01'));
    expect(remaining).toBe(24);
    expect(remainingUsefulLifeMonths(null, 48)).toBe(48);
  });

  it('detects expiring warranties', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 15);
    expect(isWarrantyExpiringSoon(soon)).toBe(true);
    const far = new Date();
    far.setFullYear(far.getFullYear() + 2);
    expect(isWarrantyExpiringSoon(far)).toBe(false);
  });

  it('aggregates asset indicators', () => {
    const ind = aggregateEamIndicators({
      totalAssets: 100,
      totalValue: 5000000000,
      operationalCount: 85,
      byLocation: { LOC1: 50, LOC2: 50 },
      byResponsible: { U1: 30 },
      byArea: { FAM1: 60 },
      expiringWarranties: 5,
      avgRemainingLifeMonths: 42.5,
    });
    expect(ind.operationalPct).toBe(85);
    expect(ind.totalValue).toBe(5000000000);
    expect(ind.expiringWarranties).toBe(5);
  });

  it('builds location hierarchy tree', () => {
    const tree = buildLocationTree([
      { locationKey: 'P1', parentKey: null, name: 'Planta', locationType: 'plant' },
      { locationKey: 'W1', parentKey: 'P1', name: 'Bodega', locationType: 'warehouse' },
    ]);
    expect(tree.length).toBe(1);
    expect(tree[0].children.length).toBe(1);
  });

  it('handles mass volume indicator aggregation', () => {
    const results = Array.from({ length: 2000 }, (_, i) =>
      aggregateEamIndicators({
        totalAssets: 10 + (i % 100),
        totalValue: 1000000 * i,
        operationalCount: 5 + (i % 10),
        byLocation: {},
        byResponsible: {},
        byArea: {},
        expiringWarranties: i % 5,
        avgRemainingLifeMonths: 24,
      }),
    );
    expect(results.every((r) => r.operationalPct >= 0)).toBe(true);
  });

  it('handles concurrent transition checks', () => {
    const statuses = ['draft', 'registered', 'installed', 'commissioned', 'operational', 'on_loan', 'in_transfer', 'sold', 'retired', 'disposed'] as const;
    const results = Array.from({ length: 500 }, (_, i) =>
      canTransitionStatus(statuses[i % statuses.length], 'operational'),
    );
    expect(results.some((r) => r === true)).toBe(true);
  });
});
