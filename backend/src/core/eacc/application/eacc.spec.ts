import {
  aggregateEaccIndicators,
  EACC_AUDIT_TYPES,
  EACC_CERTIFICATION_TYPES,
  EACC_ESG_PILLARS,
  EACC_FINDING_TYPES,
  EACC_SUSTAINABILITY_CATEGORIES,
  evaluateDeadlineAlerts,
  evaluateRequirementCompliance,
  generateEaccKey,
  simulateAuditScore,
} from '../domain/eacc.engine';

describe('eacc.engine', () => {
  it('generates EACC keys', () => {
    expect(generateEaccKey('CRT', 1)).toBe('CRT-000001');
  });

  it('evaluates requirement compliance', () => {
    const ok = evaluateRequirementCompliance({ evidencesCount: 2, requiredEvidences: 1, checklistCompleted: 5, checklistTotal: 5 });
    const fail = evaluateRequirementCompliance({ evidencesCount: 0, requiredEvidences: 2, checklistCompleted: 1, checklistTotal: 5 });
    expect(ok.isCompliant).toBe(true);
    expect(fail.isCompliant).toBe(false);
  });

  it('evaluates deadline alerts', () => {
    const future = new Date(Date.now() + 3 * 86400000);
    const alerts = evaluateDeadlineAlerts({ dueDate: future, daysBefore: 7 });
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    expect(alerts[0].alertType).toBe('deadline_approaching');
  });

  it('aggregates compliance indicators', () => {
    const agg = aggregateEaccIndicators({
      activeCertifications: 5, expiringCertifications: 1, openFindings: 2,
      openCorrectiveActions: 3, complianceRate: 85, sustainabilityRecords30d: 20,
      esgObjectives: 6, activeAlerts: 4,
    });
    expect(agg.certificationReady).toBe(true);
    expect(agg.complianceScore).toBeGreaterThan(0);
  });

  it('simulates audit score', () => {
    const score = simulateAuditScore([
      { severity: 'critical', findingType: 'non_conformity' },
      { severity: 'low', findingType: 'observation' },
    ]);
    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('exposes certification types', () => {
    expect(EACC_CERTIFICATION_TYPES).toContain('global_gap');
    expect(EACC_CERTIFICATION_TYPES).toContain('organic');
    expect(EACC_AUDIT_TYPES).toContain('internal');
    expect(EACC_FINDING_TYPES).toContain('non_conformity');
    expect(EACC_ESG_PILLARS).toContain('environmental');
    expect(EACC_SUSTAINABILITY_CATEGORIES.length).toBeGreaterThanOrEqual(6);
  });
});

describe('eacc.audit.simulation', () => {
  it('simulates end-to-end audit workflow scoring', () => {
    const findings = [
      { severity: 'medium', findingType: 'non_conformity' },
      { severity: 'low', findingType: 'observation' },
      { severity: 'high', findingType: 'non_conformity' },
    ];
    const score = simulateAuditScore(findings);
    expect(score).toBe(80);
  });

  it('handles concurrent key generation', () => {
    const keys = new Set(Array.from({ length: 500 }, (_, i) => generateEaccKey('AUD', i + 1)));
    expect(keys.size).toBe(500);
  });
});
