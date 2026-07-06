import {
  computeCandidateRanking,
  computeOnboardingCompletion,
  computeProfileMatch,
  generateEmployeeNumberFromCandidate,
  generateRcKey,
  passesAutoFilter,
  validateImportCandidateRow,
  validateVacancyTransition,
} from '../domain/hcm-recruitment.engine';

describe('HCM Recruitment Engine — Fase 2', () => {
  it('generates RC keys', () => {
    expect(generateRcKey('VAC', 1)).toBe('VAC-00000001');
  });

  it('computes profile match', () => {
    const score = computeProfileMatch(
      ['Comunicación', 'Trabajo en equipo'],
      [{ name: 'Comunicación', category: 'soft', weight: 1, minScore: 3, isRequired: true }, { name: 'Liderazgo', category: 'soft', weight: 1, minScore: 2, isRequired: false }],
    );
    expect(score).toBe(50);
  });

  it('passes auto filter with good match', () => {
    const result = passesAutoFilter(80, { skills: [], evaluations: [], assessments: [] }, [
      { name: 'Comunicación', category: 'soft', weight: 1, minScore: 3, isRequired: true },
    ]);
    expect(result.passed).toBe(true);
  });

  it('rejects auto filter with low match', () => {
    const result = passesAutoFilter(20, { skills: [], evaluations: [], assessments: [] }, [
      { name: 'Comunicación', category: 'soft', weight: 1, minScore: 3, isRequired: true },
    ], 40);
    expect(result.passed).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('computes candidate ranking', () => {
    const ranking = computeCandidateRanking([
      { candidateKey: 'CND-1', matchScore: 90, profile: { skills: [], evaluations: [{ score: 4, maxScore: 5 }], assessments: [{ assessmentType: 'technical', score: 85, maxScore: 100, passed: true }], interviewRating: 4 } },
      { candidateKey: 'CND-2', matchScore: 60, profile: { skills: [], evaluations: [{ score: 2, maxScore: 5 }], assessments: [], interviewRating: 2 } },
    ], []);
    expect(ranking[0].candidateKey).toBe('CND-1');
    expect(ranking[0].rank).toBe(1);
    expect(ranking[1].rank).toBe(2);
  });

  it('validates vacancy transitions', () => {
    expect(validateVacancyTransition('draft', 'pending_approval')).toBe(true);
    expect(validateVacancyTransition('draft', 'filled')).toBe(false);
    expect(validateVacancyTransition('offer_stage', 'filled')).toBe(true);
  });

  it('computes onboarding completion', () => {
    expect(computeOnboardingCompletion([{ status: 'completed' }, { status: 'pending' }])).toBe(50);
    expect(computeOnboardingCompletion([{ status: 'completed' }, { status: 'completed' }])).toBe(100);
  });

  it('generates employee number from candidate seq', () => {
    expect(generateEmployeeNumberFromCandidate(42)).toBe('EMP-00042');
  });

  it('validates import candidate rows', () => {
    const ok = validateImportCandidateRow({ firstName: 'Ana', lastName: 'Pérez', email: 'ana@test.com' }, 1);
    expect(ok.valid).toBe(true);
    const bad = validateImportCandidateRow({ firstName: '', lastName: 'X', email: 'invalid' }, 2);
    expect(bad.valid).toBe(false);
  });

  it('handles bulk ranking with equal scores', () => {
    const ranking = computeCandidateRanking([
      { candidateKey: 'A', matchScore: 50, profile: { skills: [], evaluations: [], assessments: [] } },
      { candidateKey: 'B', matchScore: 50, profile: { skills: [], evaluations: [], assessments: [] } },
    ], []);
    expect(ranking).toHaveLength(2);
    expect(ranking[0].rank).toBe(1);
    expect(ranking[1].rank).toBe(2);
  });

  it('rejects failed assessments in auto filter', () => {
    const result = passesAutoFilter(90, {
      skills: [],
      evaluations: [],
      assessments: [{ assessmentType: 'technical', score: 30, maxScore: 100, passed: false }],
    }, []);
    expect(result.passed).toBe(false);
  });

  it('validates concurrent ranking order stability', () => {
    const candidates = Array.from({ length: 10 }, (_, i) => ({
      candidateKey: `CND-${i}`,
      matchScore: i * 10,
      profile: { skills: [], evaluations: [], assessments: [] },
    }));
    const ranking = computeCandidateRanking(candidates, []);
    for (let i = 1; i < ranking.length; i++) {
      expect(ranking[i - 1].totalScore).toBeGreaterThanOrEqual(ranking[i].totalScore);
    }
  });
});
