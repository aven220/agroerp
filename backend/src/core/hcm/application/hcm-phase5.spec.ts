import {
  buildSkillMatrix,
  certificationNeedsAlert,
  computeCareerReadiness,
  computeCompetencyGap,
  computeObjectiveCompliance,
  computeObjectiveProgress,
  computeWeightedEvaluationScore,
  computeAttendancePct,
  daysUntilExpiry,
  generateTdKey,
  levelToScore,
  mergeBulkCompetencyImport,
  validateBulkEvaluationRun,
  validateEvaluationSequence,
} from '../domain/hcm-talent-development.engine';

describe('HCM Talent Development Engine — Fase 5', () => {
  it('generates TD keys', () => {
    expect(generateTdKey('CRS', 1)).toBe('CRS-00000001');
  });

  it('computes competency gap', () => {
    expect(computeCompetencyGap('basic', 'advanced')).toBe(2);
    expect(computeCompetencyGap('expert', 'advanced')).toBe(0);
  });

  it('converts level to score', () => {
    expect(levelToScore('master')).toBe(5);
  });

  it('computes weighted evaluation score', () => {
    const score = computeWeightedEvaluationScore([
      { score: 4, maxScore: 5, weight: 1 },
      { score: 5, maxScore: 5, weight: 2 },
    ]);
    expect(score).toBeGreaterThan(80);
  });

  it('computes objective progress', () => {
    expect(computeObjectiveProgress(50, 100)).toBe(50);
    expect(computeObjectiveProgress(120, 100)).toBe(100);
  });

  it('computes objective compliance', () => {
    const c = computeObjectiveCompliance([
      { currentValue: 80, targetValue: 100, weight: 1 },
      { currentValue: 100, targetValue: 100, weight: 1 },
    ]);
    expect(c).toBe(90);
  });

  it('computes career readiness', () => {
    const r = computeCareerReadiness({
      competencyGapAvg: 1,
      evaluationScore: 85,
      objectiveCompliance: 90,
      trainingCompletionPct: 100,
    });
    expect(r).toBeGreaterThan(70);
  });

  it('detects certification alert', () => {
    const expires = new Date();
    expires.setDate(expires.getDate() + 15);
    expect(certificationNeedsAlert(expires, 30)).toBe(true);
  });

  it('computes days until expiry', () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    expect(daysUntilExpiry(future)).toBeGreaterThanOrEqual(9);
  });

  it('computes attendance percentage', () => {
    expect(computeAttendancePct(8, 10)).toBe(80);
  });

  it('validates evaluation sequence', () => {
    expect(validateEvaluationSequence([], 'self').valid).toBe(true);
    expect(validateEvaluationSequence(['self'], 'self').valid).toBe(false);
  });

  it('merges bulk competency import', () => {
    const merged = mergeBulkCompetencyImport([
      { employeeKey: 'E1', competencyKey: 'C1' },
      { employeeKey: 'E1', competencyKey: 'C1' },
    ]);
    expect(merged).toHaveLength(1);
  });

  it('validates bulk evaluation run', () => {
    expect(validateBulkEvaluationRun(0).valid).toBe(true);
    expect(validateBulkEvaluationRun(2).valid).toBe(false);
  });

  it('builds skill matrix', () => {
    const matrix = buildSkillMatrix(
      [{ competencyKey: 'C1', name: 'Liderazgo', competencyType: 'soft' }],
      [{ employeeKey: 'E1', competencyKey: 'C1', currentLevel: 'basic', targetLevel: 'advanced', gapScore: 2 }],
    );
    expect(matrix[0].employees).toHaveLength(1);
  });
});
