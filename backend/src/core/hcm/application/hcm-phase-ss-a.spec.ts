import {
  buildRiskMatrix,
  classifyRiskLevel,
  computeRiskScore,
  examIsOverdue,
  examNeedsAlert,
  fitnessFromRestrictions,
  generateSsKey,
  mergeConcurrentDeliveries,
  mitigationProgress,
  ppeExpiresAt,
  ppeNeedsReplacement,
  validateOfflineDeliveryRow,
  validateRiskAssessmentConcurrency,
} from '../domain/hcm-sst.engine';

describe('HCM SST Engine — Parte A', () => {
  it('generates SS keys', () => {
    expect(generateSsKey('EXM', 1)).toBe('EXM-00000001');
  });

  it('computes risk score and level', () => {
    expect(computeRiskScore(3, 4)).toBe(12);
    expect(classifyRiskLevel(12)).toBe('high');
    expect(classifyRiskLevel(4)).toBe('low');
    expect(classifyRiskLevel(20)).toBe('critical');
  });

  it('detects exam overdue and alerts', () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    expect(examIsOverdue(past)).toBe(true);
    const soon = new Date();
    soon.setDate(soon.getDate() + 10);
    expect(examNeedsAlert(soon, 30)).toBe(true);
  });

  it('derives fitness from restrictions', () => {
    expect(fitnessFromRestrictions(false, false)).toBe('fit');
    expect(fitnessFromRestrictions(true, false)).toBe('fit_with_restrictions');
    expect(fitnessFromRestrictions(false, true)).toBe('unfit');
  });

  it('computes PPE expiry and replacement', () => {
    const delivered = new Date('2026-01-01');
    const expires = ppeExpiresAt(delivered, 30);
    expect(expires).not.toBeNull();
    expect(ppeNeedsReplacement(new Date(), 15)).toBe(true);
  });

  it('computes mitigation progress', () => {
    expect(mitigationProgress(2, 4)).toBe(50);
  });

  it('merges concurrent deliveries', () => {
    const merged = mergeConcurrentDeliveries([
      { deliveryKey: 'D1', employeeKey: 'E1', ppeKey: 'P1' },
      { deliveryKey: 'D1', employeeKey: 'E1', ppeKey: 'P1' },
    ]);
    expect(merged).toHaveLength(1);
  });

  it('validates offline delivery rows', () => {
    expect(validateOfflineDeliveryRow({ employeeKey: 'E1', ppeKey: 'P1', deliveryType: 'initial' }, 0).valid).toBe(true);
    expect(validateOfflineDeliveryRow({ employeeKey: '', ppeKey: '', deliveryType: '' }, 1).valid).toBe(false);
  });

  it('validates risk assessment concurrency', () => {
    expect(validateRiskAssessmentConcurrency(1).valid).toBe(true);
    expect(validateRiskAssessmentConcurrency(6).valid).toBe(false);
  });

  it('builds risk matrix', () => {
    const matrix = buildRiskMatrix(
      [{ riskKey: 'R1', name: 'Ruido', category: 'physical' }],
      [{ riskKey: 'R1', riskScore: 12, riskLevel: 'high', assessedAt: '2026-07-01' }],
    );
    expect(matrix[0].latestLevel).toBe('high');
    expect(matrix[0].assessmentCount).toBe(1);
  });
});
