import {
  buildRiskMatrix,
  classifyRiskLevel,
  computeIncidentClosureReady,
  computeRiskScore,
  examIsOverdue,
  examNeedsAlert,
  fitnessFromRestrictions,
  generateSsKey,
  incidentRequiresInvestigation,
  mergeBulkInspections,
  mergeConcurrentDeliveries,
  mitigationProgress,
  ppeExpiresAt,
  ppeNeedsReplacement,
  surveyAverageScore,
  validateEvidenceUpload,
  validateInspectionChecklist,
  validateOfflineDeliveryRow,
  validateOfflineIncidentRow,
  validateRiskAssessmentConcurrency,
  wellbeingParticipationRate,
} from '../domain/hcm-sst.engine';

describe('HCM SST Engine — Fase 6', () => {
  it('generates SS keys', () => {
    expect(generateSsKey('INC', 1)).toBe('INC-00000001');
  });

  it('computes risk score and level', () => {
    expect(computeRiskScore(3, 4)).toBe(12);
    expect(classifyRiskLevel(12)).toBe('high');
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
    expect(fitnessFromRestrictions(true, false)).toBe('fit_with_restrictions');
  });

  it('computes PPE expiry', () => {
    expect(ppeExpiresAt(new Date('2026-01-01'), 30)).not.toBeNull();
    expect(ppeNeedsReplacement(new Date(), 15)).toBe(true);
  });

  it('requires investigation for accidents and serious incidents', () => {
    expect(incidentRequiresInvestigation('minor', 'accident')).toBe(true);
    expect(incidentRequiresInvestigation('serious', 'incident')).toBe(true);
    expect(incidentRequiresInvestigation('minor', 'near_miss')).toBe(false);
  });

  it('checks incident closure readiness', () => {
    expect(computeIncidentClosureReady([{ status: 'completed' }, { status: 'cancelled' }])).toBe(true);
    expect(computeIncidentClosureReady([{ status: 'open' }])).toBe(false);
  });

  it('validates inspection checklist', () => {
    const stats = validateInspectionChecklist([
      { itemKey: 'A', checked: true },
      { itemKey: 'B', checked: false },
    ]);
    expect(stats.completed).toBe(1);
    expect(stats.total).toBe(2);
  });

  it('merges bulk inspections and concurrent deliveries', () => {
    expect(mergeBulkInspections([{ inspectionKey: 'I1' }, { inspectionKey: 'I1' }])).toHaveLength(1);
    expect(mergeConcurrentDeliveries([
      { deliveryKey: 'D1', employeeKey: 'E1', ppeKey: 'P1' },
      { deliveryKey: 'D1', employeeKey: 'E1', ppeKey: 'P1' },
    ])).toHaveLength(1);
  });

  it('validates evidence upload', () => {
    expect(validateEvidenceUpload('foto.jpg', 'image/jpeg').valid).toBe(true);
    expect(validateEvidenceUpload('', 'text/plain').valid).toBe(false);
  });

  it('computes wellbeing and survey metrics', () => {
    expect(wellbeingParticipationRate(8, 10)).toBe(80);
    expect(surveyAverageScore([{ score: 4 }, { score: 5 }])).toBe(4.5);
  });

  it('validates offline rows', () => {
    expect(validateOfflineIncidentRow({ title: 'X', incidentType: 'incident', occurredAt: '2026-07-01T10:00:00Z' }, 0).valid).toBe(true);
    expect(validateOfflineDeliveryRow({ employeeKey: 'E1', ppeKey: 'P1', deliveryType: 'initial' }, 0).valid).toBe(true);
  });

  it('validates risk concurrency and mitigation progress', () => {
    expect(validateRiskAssessmentConcurrency(1).valid).toBe(true);
    expect(mitigationProgress(2, 4)).toBe(50);
  });

  it('builds risk matrix', () => {
    const matrix = buildRiskMatrix(
      [{ riskKey: 'R1', name: 'Ruido', category: 'physical' }],
      [{ riskKey: 'R1', riskScore: 12, riskLevel: 'high', assessedAt: '2026-07-01' }],
    );
    expect(matrix[0].latestLevel).toBe('high');
  });
});
