import {
  averageReadings,
  computeNetWeight,
  computeStabilityScore,
  generateWeighingNumber,
  hasBlockingErrors,
  isStable,
  validateNetWeight,
  validateReadingConsistency,
  validateScaleState,
  validateWeightValue,
  validateWeighingCapture,
} from '../domain/weighing.engine';

describe('CPEP WeighingEngine', () => {
  it('computes net weight', () => {
    expect(computeNetWeight(1200, 200)).toBe(1000);
    expect(computeNetWeight(null, 200)).toBeNull();
    expect(computeNetWeight(100, 200)).toBe(0);
  });

  it('rejects negative and out-of-range weights', () => {
    const negative = validateWeightValue(-1);
    expect(negative.some((i) => i.code === 'NEGATIVE_WEIGHT')).toBe(true);

    const above = validateWeightValue(60_000, { maxWeightKg: 50_000 });
    expect(above.some((i) => i.code === 'ABOVE_MAX')).toBe(true);

    const below = validateWeightValue(0.01, { minWeightKg: 1 });
    expect(below.some((i) => i.code === 'BELOW_MIN')).toBe(true);
  });

  it('detects uncertified and disconnected scales', () => {
    const uncertified = validateScaleState({ certified: false, status: 'uncertified' });
    expect(uncertified.some((i) => i.code === 'SCALE_UNCERTIFIED')).toBe(true);

    const disconnected = validateScaleState({
      status: 'available',
      certified: true,
      lastSeenAt: new Date(Date.now() - 300_000),
      offlineThresholdMs: 120_000,
    });
    expect(disconnected.some((i) => i.code === 'SCALE_DISCONNECTED')).toBe(true);
  });

  it('detects inconsistent readings and abnormal variation', () => {
    const issues = validateReadingConsistency(
      [{ weightKg: 1000 }, { weightKg: 1100 }, { weightKg: 900 }],
      2,
    );
    expect(issues.some((i) => i.code === 'INCONSISTENT_READINGS')).toBe(true);
    expect(issues.some((i) => i.code === 'ABNORMAL_VARIATION')).toBe(true);
  });

  it('averages readings and computes stability', () => {
    expect(averageReadings([100, 102, 101])).toBe(101);
    expect(computeStabilityScore([100, 100.1, 99.9])).toBeGreaterThan(0.9);
    expect(isStable([100, 100.05, 99.95])).toBe(true);
    expect(isStable([100, 120])).toBe(false);
  });

  it('validates net weight and contingency reason', () => {
    expect(validateNetWeight(100, 200).some((i) => i.code === 'NET_INVALID')).toBe(true);
    const contingency = validateWeighingCapture({
      weightKg: 100,
      contingency: true,
      contingencyReason: '',
    });
    expect(contingency.some((i) => i.code === 'CONTINGENCY_REASON_REQUIRED')).toBe(true);
    expect(hasBlockingErrors(contingency)).toBe(true);
  });

  it('generates weighing numbers', () => {
    const n = generateWeighingNumber('RCP-001', 3);
    expect(n).toContain('WGH-');
    expect(n).toContain('003');
  });

  it('supports concurrent validation of independent captures', () => {
    const a = validateWeighingCapture({ weightKg: 1000, scale: { certified: true, status: 'available', lastSeenAt: new Date() } });
    const b = validateWeighingCapture({ weightKg: -5 });
    expect(hasBlockingErrors(a)).toBe(false);
    expect(hasBlockingErrors(b)).toBe(true);
  });
});
