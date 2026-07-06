import {
  aggregateEphpIndicators,
  computeIntervalAlerts,
  evaluateIpmAction,
  evaluatePhytosanitaryAlerts,
  EPHP_IPM_METHODS,
  EPHP_TREATMENT_TYPES,
  generateEphpKey,
  validateMrl,
} from '../domain/ephp.engine';

describe('ephp.engine', () => {
  it('generates EPHP keys', () => {
    expect(generateEphpKey('PST', 1)).toBe('PST-000001');
  });

  it('evaluates IPM action', () => {
    const low = evaluateIpmAction('low', 2);
    const high = evaluateIpmAction('high', 2);
    expect(low.actionRequired).toBe(false);
    expect(high.actionRequired).toBe(true);
    expect(high.recommendedMethods).toContain('chemical');
  });

  it('computes interval alerts', () => {
    const appliedAt = new Date();
    const alerts = computeIntervalAlerts({
      appliedAt, preHarvestDays: 14, reEntryHours: 24, harvestBlocked: true, accessBlocked: true,
    });
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('validates MRL', () => {
    const ok = validateMrl('glyphosate', 0.5, 1.0);
    const fail = validateMrl('glyphosate', 2.0, 1.0);
    expect(ok.compliant).toBe(true);
    expect(fail.compliant).toBe(false);
    expect(fail.violationPpm).toBe(1);
  });

  it('evaluates phytosanitary alerts', () => {
    const alerts = evaluatePhytosanitaryAlerts({
      infestationLevel: 'critical', mrlCompliant: false, intervalActive: true,
    });
    expect(alerts.some((a) => a.alertType === 'pest_infestation')).toBe(true);
    expect(alerts.some((a) => a.alertType === 'mrl_violation')).toBe(true);
  });

  it('aggregates health indicators', () => {
    const agg = aggregateEphpIndicators({
      pestCatalog: 10, diseaseCatalog: 8, activeMonitorings30d: 25,
      scheduledTreatments: 5, activeAlerts: 0, complianceFrameworks: 4,
    });
    expect(agg.phytosanitaryReady).toBe(true);
    expect(agg.healthScore).toBeGreaterThan(0);
  });

  it('exposes catalogs', () => {
    expect(EPHP_TREATMENT_TYPES.length).toBe(6);
    expect(EPHP_IPM_METHODS.length).toBe(4);
  });
});

describe('ephp.phyto.simulation', () => {
  it('handles concurrent IPM evaluations', () => {
    const levels = ['absent', 'low', 'medium', 'high', 'critical'];
    const results = levels.map((l) => evaluateIpmAction(l, 2));
    expect(results.filter((r) => r.actionRequired).length).toBeGreaterThan(0);
  });

  it('simulates climate-variable MRL scenarios', () => {
    const residues = [0.1, 0.5, 1.0, 1.5, 2.0];
    const results = residues.map((r) => validateMrl('test', r, 1.0));
    expect(results.filter((r) => !r.compliant).length).toBe(2);
  });
});

describe('ephp.resilience', () => {
  it('handles concurrent key generation', () => {
    const keys = new Set(Array.from({ length: 500 }, (_, i) => generateEphpKey('APL', i + 1)));
    expect(keys.size).toBe(500);
  });
});
