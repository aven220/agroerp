export type CompetencyRequirement = {
  name: string;
  category: string;
  weight: number;
  minScore: number;
  isRequired: boolean;
};

export type CandidateProfile = {
  skills: string[];
  evaluations: Array<{ competencyKey?: string; score: number; maxScore: number }>;
  assessments: Array<{ assessmentType: string; score?: number; maxScore: number; passed?: boolean }>;
  interviewRating?: number;
};

export type RankingEntry = {
  candidateKey: string;
  totalScore: number;
  rank: number;
  breakdown: Record<string, number>;
};

export const DEFAULT_RC_SELECTION_STAGES = [
  { stageOrder: 1, name: 'Screening', stageType: 'screening' },
  { stageOrder: 2, name: 'Entrevista HR', stageType: 'interview' },
  { stageOrder: 3, name: 'Entrevista técnica', stageType: 'interview' },
  { stageOrder: 4, name: 'Prueba técnica', stageType: 'assessment' },
  { stageOrder: 5, name: 'Prueba psicométrica', stageType: 'assessment' },
  { stageOrder: 6, name: 'Entrevista final', stageType: 'interview' },
  { stageOrder: 7, name: 'Oferta', stageType: 'offer' },
] as const;

export const DEFAULT_RC_ONBOARDING_TASKS = [
  { taskOrder: 1, category: 'documentation', title: 'Firma contrato laboral', description: 'Documentación legal' },
  { taskOrder: 2, category: 'credentials', title: 'Entrega credenciales IAM', description: 'Usuario y permisos iniciales' },
  { taskOrder: 3, category: 'equipment', title: 'Entrega equipo de trabajo', description: 'Computador y accesorios' },
  { taskOrder: 4, category: 'training', title: 'Capacitación obligatoria seguridad', description: 'Curso SST' },
  { taskOrder: 5, category: 'training', title: 'Inducción corporativa', description: 'Programación inducción' },
  { taskOrder: 6, category: 'integration', title: 'Presentación al equipo', description: 'Reunión con jefe y equipo' },
] as const;

export const DEFAULT_RC_VACANCY_COMPETENCIES = [
  { name: 'Comunicación', category: 'soft', weight: 1, minScore: 3, isRequired: true },
  { name: 'Trabajo en equipo', category: 'soft', weight: 1, minScore: 3, isRequired: true },
  { name: 'Conocimiento técnico', category: 'technical', weight: 2, minScore: 3.5, isRequired: true },
  { name: 'Liderazgo', category: 'leadership', weight: 1, minScore: 2.5, isRequired: false },
] as const;

export function generateRcKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(8, '0')}`;
}

export function computeProfileMatch(
  candidateSkills: string[],
  requiredCompetencies: CompetencyRequirement[],
): number {
  if (requiredCompetencies.length === 0) return 100;
  const normalized = candidateSkills.map((s) => s.toLowerCase());
  let matched = 0;
  for (const comp of requiredCompetencies) {
    if (normalized.some((s) => s.includes(comp.name.toLowerCase()) || comp.name.toLowerCase().includes(s))) {
      matched += 1;
    }
  }
  return Math.round((matched / requiredCompetencies.length) * 100);
}

export function passesAutoFilter(
  matchScore: number,
  profile: CandidateProfile,
  competencies: CompetencyRequirement[],
  minMatchThreshold = 40,
): { passed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (matchScore < minMatchThreshold) reasons.push(`Match ${matchScore}% bajo umbral ${minMatchThreshold}%`);

  for (const comp of competencies.filter((c) => c.isRequired)) {
    const evals = profile.evaluations.filter((e) =>
      e.competencyKey?.toLowerCase().includes(comp.name.toLowerCase().slice(0, 4))
      || comp.name.toLowerCase().includes((e.competencyKey ?? '').toLowerCase()),
    );
    const avg = evals.length
      ? evals.reduce((s, e) => s + (e.score / e.maxScore) * 5, 0) / evals.length
      : 0;
    if (evals.length > 0 && avg < comp.minScore) {
      reasons.push(`Competencia ${comp.name} insuficiente (${avg.toFixed(1)} < ${comp.minScore})`);
    }
  }

  const failedAssessments = profile.assessments.filter((a) => a.passed === false);
  if (failedAssessments.length > 0) reasons.push(`${failedAssessments.length} evaluación(es) no aprobada(s)`);

  return { passed: reasons.length === 0, reasons };
}

export function computeCandidateRanking(
  candidates: Array<{ candidateKey: string; profile: CandidateProfile; matchScore: number }>,
  competencies: CompetencyRequirement[],
): RankingEntry[] {
  const scored = candidates.map(({ candidateKey, profile, matchScore }) => {
    const breakdown: Record<string, number> = { match: matchScore * 0.3 };

    const evalAvg = profile.evaluations.length
      ? (profile.evaluations.reduce((s, e) => s + (e.score / e.maxScore) * 100, 0) / profile.evaluations.length)
      : 0;
    breakdown.evaluations = evalAvg * 0.35;

    const assessAvg = profile.assessments.filter((a) => a.score != null).length
      ? (profile.assessments.reduce((s, a) => s + ((a.score ?? 0) / a.maxScore) * 100, 0) / profile.assessments.length)
      : 0;
    breakdown.assessments = assessAvg * 0.25;

    breakdown.interview = (profile.interviewRating ?? 0) * 20 * 0.1;

    const totalScore = Math.round(
      Object.values(breakdown).reduce((s, v) => s + v, 0) * 100,
    ) / 100;

    return { candidateKey, totalScore, breakdown, rank: 0 };
  });

  scored.sort((a, b) => b.totalScore - a.totalScore);
  return scored.map((entry, i) => ({ ...entry, rank: i + 1 }));
}

export function validateVacancyTransition(current: string, next: string): boolean {
  const allowed: Record<string, string[]> = {
    draft: ['pending_approval', 'cancelled'],
    pending_approval: ['approved', 'draft', 'cancelled'],
    approved: ['published_internal', 'published_external', 'open', 'cancelled'],
    published_internal: ['open', 'in_selection'],
    published_external: ['open', 'in_selection'],
    open: ['in_selection', 'closed', 'cancelled'],
    in_selection: ['offer_stage', 'closed', 'cancelled'],
    offer_stage: ['filled', 'in_selection', 'closed'],
    filled: ['closed'],
    closed: [],
    cancelled: [],
  };
  return (allowed[current] ?? []).includes(next);
}

export function computeOnboardingCompletion(tasks: Array<{ status: string }>): number {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  return Math.round((completed / tasks.length) * 10000) / 100;
}

export function generateEmployeeNumberFromCandidate(seq: number): string {
  return `EMP-${String(seq).padStart(5, '0')}`;
}

export function validateImportCandidateRow(row: {
  firstName: string; lastName: string; email: string;
}, rowIndex: number): { valid: boolean; errors: string[]; row: number } {
  const errors: string[] = [];
  if (!row.firstName?.trim()) errors.push('Nombre requerido');
  if (!row.lastName?.trim()) errors.push('Apellido requerido');
  if (!row.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push('Email inválido');
  return { row: rowIndex, valid: errors.length === 0, errors };
}
