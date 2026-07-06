export type ProficiencyLevel = 'basic' | 'intermediate' | 'advanced' | 'expert' | 'master';

export const PROFICIENCY_LEVELS: readonly ProficiencyLevel[] = [
  'basic', 'intermediate', 'advanced', 'expert', 'master',
] as const;

export const DEFAULT_TD_COMPETENCIES = [
  { code: 'LEAD', name: 'Liderazgo', competencyType: 'soft' },
  { code: 'COMM', name: 'Comunicación', competencyType: 'soft' },
  { code: 'TEAM', name: 'Trabajo en equipo', competencyType: 'soft' },
  { code: 'PROB', name: 'Resolución de problemas', competencyType: 'soft' },
  { code: 'ADAP', name: 'Adaptabilidad', competencyType: 'soft' },
  { code: 'AGRO', name: 'Conocimiento agrícola', competencyType: 'technical' },
  { code: 'QUAL', name: 'Control de calidad', competencyType: 'technical' },
  { code: 'SAFE', name: 'Seguridad industrial', competencyType: 'technical' },
  { code: 'DATA', name: 'Análisis de datos', competencyType: 'technical' },
  { code: 'ERP', name: 'Sistemas ERP', competencyType: 'technical' },
] as const;

export const DEFAULT_TD_COURSES = [
  { code: 'IND-SAFE', title: 'Inducción seguridad industrial', courseType: 'mandatory', courseOrigin: 'internal', modality: 'onsite', durationHours: 8 },
  { code: 'ERP-BAS', title: 'AGROERP fundamentos', courseType: 'mandatory', courseOrigin: 'internal', modality: 'virtual', durationHours: 16 },
  { code: 'LEAD-101', title: 'Liderazgo efectivo', courseType: 'voluntary', courseOrigin: 'external', modality: 'virtual', durationHours: 24 },
  { code: 'QUAL-COF', title: 'Calidad en café', courseType: 'voluntary', courseOrigin: 'internal', modality: 'hybrid', durationHours: 12 },
] as const;

export function generateTdKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(8, '0')}`;
}

export function levelToScore(level: ProficiencyLevel): number {
  const map: Record<ProficiencyLevel, number> = {
    basic: 1, intermediate: 2, advanced: 3, expert: 4, master: 5,
  };
  return map[level] ?? 1;
}

export function computeCompetencyGap(current: ProficiencyLevel, target: ProficiencyLevel): number {
  return Math.max(0, levelToScore(target) - levelToScore(current));
}

export function computeWeightedEvaluationScore(scores: Array<{ score: number; maxScore: number; weight: number }>): number {
  if (scores.length === 0) return 0;
  let weighted = 0;
  let totalWeight = 0;
  for (const s of scores) {
    const normalized = s.maxScore > 0 ? (s.score / s.maxScore) * 100 : 0;
    weighted += normalized * s.weight;
    totalWeight += s.weight;
  }
  return totalWeight > 0 ? Math.round((weighted / totalWeight) * 100) / 100 : 0;
}

export function computeObjectiveProgress(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 10000) / 100);
}

export function computeObjectiveCompliance(objectives: Array<{ currentValue: number; targetValue: number | null; weight: number }>): number {
  if (objectives.length === 0) return 0;
  let total = 0;
  let weightSum = 0;
  for (const o of objectives) {
    const target = o.targetValue ?? 0;
    const progress = target > 0 ? Math.min(1, o.currentValue / target) : 0;
    total += progress * o.weight;
    weightSum += o.weight;
  }
  return weightSum > 0 ? Math.round((total / weightSum) * 10000) / 100 : 0;
}

export function computeCareerReadiness(factors: {
  competencyGapAvg: number;
  evaluationScore: number;
  objectiveCompliance: number;
  trainingCompletionPct: number;
}): number {
  const gapFactor = Math.max(0, 100 - factors.competencyGapAvg * 20);
  const score = (
    gapFactor * 0.3 +
    factors.evaluationScore * 0.3 +
    factors.objectiveCompliance * 0.2 +
    factors.trainingCompletionPct * 0.2
  );
  return Math.round(score * 100) / 100;
}

export function daysUntilExpiry(expiresAt: Date, now = new Date()): number {
  return Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000);
}

export function certificationNeedsAlert(expiresAt: Date | null, renewalDays: number, now = new Date()): boolean {
  if (!expiresAt) return false;
  const days = daysUntilExpiry(expiresAt, now);
  return days >= 0 && days <= renewalDays;
}

export function computeAttendancePct(sessionsAttended: number, totalSessions: number): number {
  if (totalSessions <= 0) return 0;
  return Math.round((sessionsAttended / totalSessions) * 10000) / 100;
}

export function validateEvaluationSequence(existingTypes: string[], nextType: string): { valid: boolean; reason?: string } {
  if (nextType === 'self' && existingTypes.includes('self')) {
    return { valid: false, reason: 'Autoevaluación ya registrada' };
  }
  if (nextType === 'manager' && !existingTypes.includes('self')) {
    return { valid: false, reason: 'Requiere autoevaluación previa' };
  }
  return { valid: true };
}

export function mergeBulkCompetencyImport(rows: Array<{ employeeKey: string; competencyKey: string }>): Array<{ employeeKey: string; competencyKey: string }> {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const k = `${r.employeeKey}:${r.competencyKey}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function validateBulkEvaluationRun(activeCount: number): { valid: boolean; reason?: string } {
  if (activeCount > 1) return { valid: false, reason: 'Proceso masivo de evaluaciones en curso' };
  return { valid: true };
}

export function buildSkillMatrix(
  competencies: Array<{ competencyKey: string; name: string; competencyType: string }>,
  employeeLevels: Array<{ employeeKey: string; competencyKey: string; currentLevel: string; targetLevel: string; gapScore: number }>,
): Array<{ competencyKey: string; name: string; competencyType: string; employees: typeof employeeLevels }> {
  return competencies.map((c) => ({
    ...c,
    employees: employeeLevels.filter((e) => e.competencyKey === c.competencyKey),
  }));
}
