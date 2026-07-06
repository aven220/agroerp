import {
  buildDepreciationSchedule,
  computeDepreciableBase,
  computeDisposalGainLoss,
  computeNetBookValue,
  computePeriodDepreciation,
  generateAssetTag,
  generateFaKey,
  generateQrPayload,
  reconcilePhysicalCount,
} from '../domain/efm-fixed-assets.engine';

describe('EFM Fixed Assets Engine — Fase 5', () => {
  it('generates fixed asset keys', () => {
    expect(generateFaKey('AST', 1)).toBe('AST-00000001');
    expect(generateAssetTag('MACH', 42)).toBe('MACH-000042');
  });

  it('computes straight line depreciation', () => {
    const result = computePeriodDepreciation({
      acquisitionCost: 120000,
      residualValue: 20000,
      usefulLifeMonths: 60,
      accumulatedDepreciation: 0,
      depreciationMethod: 'straight_line',
    });
    expect(result.amount).toBe(1666.67);
    expect(result.closingNbv).toBe(118333.33);
  });

  it('computes declining balance depreciation', () => {
    const result = computePeriodDepreciation({
      acquisitionCost: 100000,
      residualValue: 10000,
      usefulLifeMonths: 60,
      accumulatedDepreciation: 0,
      depreciationMethod: 'declining_balance',
    });
    expect(result.amount).toBeGreaterThan(0);
    expect(result.amount).toBeLessThan(5000);
  });

  it('computes units of production depreciation', () => {
    const result = computePeriodDepreciation({
      acquisitionCost: 500000,
      residualValue: 50000,
      usefulLifeMonths: 120,
      accumulatedDepreciation: 0,
      depreciationMethod: 'units_of_production',
      unitsOfProduction: 10000,
      periodUnits: 500,
    });
    expect(result.amount).toBe(22500);
  });

  it('builds full depreciation schedule', () => {
    const schedule = buildDepreciationSchedule(60000, 0, 12, 'straight_line');
    expect(schedule).toHaveLength(12);
    expect(schedule[11].nbv).toBe(0);
  });

  it('computes net book value and depreciable base', () => {
    expect(computeDepreciableBase(100000, 10000)).toBe(90000);
    expect(computeNetBookValue(100000, 25000)).toBe(75000);
  });

  it('computes disposal gain and loss', () => {
    expect(computeDisposalGainLoss(50000, 70000)).toBe(20000);
    expect(computeDisposalGainLoss(50000, 30000)).toBe(-20000);
  });

  it('reconciles physical count status', () => {
    expect(reconcilePhysicalCount({ locationKey: 'A' }, { locationKey: 'A' })).toBe('found');
    expect(reconcilePhysicalCount({ locationKey: 'A' }, { locationKey: 'B' })).toBe('mismatch');
    expect(reconcilePhysicalCount({ locationKey: 'A' }, {})).toBe('not_found');
  });

  it('generates QR payload', () => {
    const qr = generateQrPayload('org-1', 'AST-00000001', 'MACH-000001');
    expect(qr).toContain('AGROERP:FA:');
    expect(qr).toContain('AST-00000001');
  });

  it('handles concurrent asset keys', () => {
    const keys = Array.from({ length: 100 }, (_, i) => generateFaKey('AST', i + 1));
    expect(new Set(keys).size).toBe(100);
  });
});
