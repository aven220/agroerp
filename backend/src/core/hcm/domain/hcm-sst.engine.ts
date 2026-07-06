export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export const DEFAULT_SS_PPE = [
  { code: 'CASCO', name: 'Casco de seguridad', category: 'head', usefulLifeDays: 365 },
  { code: 'GAFAS', name: 'Gafas de protección', category: 'eyes', usefulLifeDays: 180 },
  { code: 'TAPONES', name: 'Protectores auditivos', category: 'hearing', usefulLifeDays: 90 },
  { code: 'GUANTES', name: 'Guantes de trabajo', category: 'hands', usefulLifeDays: 60 },
  { code: 'BOTAS', name: 'Botas de seguridad', category: 'feet', usefulLifeDays: 365 },
  { code: 'CHALECO', name: 'Chaleco reflectivo', category: 'body', usefulLifeDays: 180 },
] as const;

export const DEFAULT_SS_RISKS = [
  { code: 'R-CAIDA', name: 'Caída a distinto nivel', category: 'mechanical', processArea: 'Campo' },
  { code: 'R-RUIDO', name: 'Exposición a ruido', category: 'physical', processArea: 'Beneficio' },
  { code: 'R-QUIM', name: 'Exposición a agroquímicos', category: 'chemical', processArea: 'Campo' },
  { code: 'R-ERGO', name: 'Sobreesfuerzo postural', category: 'ergonomic', processArea: 'Operaciones' },
] as const;

export function generateSsKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(8, '0')}`;
}

export function clampScore(value: number, min = 1, max = 5): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function computeRiskScore(probability: number, impact: number): number {
  return clampScore(probability) * clampScore(impact);
}

export function classifyRiskLevel(score: number): RiskLevel {
  if (score >= 20) return 'critical';
  if (score >= 12) return 'high';
  if (score >= 6) return 'medium';
  return 'low';
}

export function examIsOverdue(nextDueAt: Date | null | undefined, now = new Date()): boolean {
  if (!nextDueAt) return false;
  return nextDueAt.getTime() < now.setHours(0, 0, 0, 0);
}

export function examNeedsAlert(nextDueAt: Date | null | undefined, alertDays = 30, now = new Date()): boolean {
  if (!nextDueAt) return false;
  const days = Math.ceil((nextDueAt.getTime() - now.getTime()) / 86400000);
  return days >= 0 && days <= alertDays;
}

export function ppeExpiresAt(deliveredAt: Date, usefulLifeDays?: number | null): Date | null {
  if (!usefulLifeDays || usefulLifeDays <= 0) return null;
  const expires = new Date(deliveredAt);
  expires.setDate(expires.getDate() + usefulLifeDays);
  return expires;
}

export function ppeNeedsReplacement(expiresAt: Date | null | undefined, alertDays = 15, now = new Date()): boolean {
  if (!expiresAt) return false;
  const days = Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000);
  return days <= alertDays;
}

export function fitnessFromRestrictions(hasActiveRestrictions: boolean, isUnfit: boolean): 'fit' | 'fit_with_restrictions' | 'unfit' {
  if (isUnfit) return 'unfit';
  if (hasActiveRestrictions) return 'fit_with_restrictions';
  return 'fit';
}

export function mitigationProgress(completedTasks: number, totalTasks: number): number {
  if (totalTasks <= 0) return 0;
  return Math.min(100, Math.round((completedTasks / totalTasks) * 10000) / 100);
}

export function mergeConcurrentDeliveries(rows: Array<{ deliveryKey: string; employeeKey: string; ppeKey: string }>) {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const k = `${r.deliveryKey}:${r.employeeKey}:${r.ppeKey}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function validateOfflineDeliveryRow(row: {
  employeeKey: string; ppeKey: string; deliveryType: string; quantity?: number;
}, rowIndex: number): { valid: boolean; errors: string[]; row: number } {
  const errors: string[] = [];
  if (!row.employeeKey?.trim()) errors.push('Empleado requerido');
  if (!row.ppeKey?.trim()) errors.push('EPP requerido');
  if (!row.deliveryType?.trim()) errors.push('Tipo de entrega requerido');
  if (row.quantity != null && row.quantity <= 0) errors.push('Cantidad inválida');
  return { row: rowIndex, valid: errors.length === 0, errors };
}

export function validateRiskAssessmentConcurrency(activeCount: number): { valid: boolean; reason?: string } {
  if (activeCount > 5) return { valid: false, reason: 'Demasiadas evaluaciones de riesgo concurrentes' };
  return { valid: true };
}

export function buildRiskMatrix(
  risks: Array<{ riskKey: string; name: string; category: string }>,
  assessments: Array<{ riskKey: string; riskScore: number; riskLevel: string; assessedAt: Date | string }>,
) {
  return risks.map((r) => {
    const history = assessments
      .filter((a) => a.riskKey === r.riskKey)
      .sort((a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime());
    const latest = history[0];
    return {
      ...r,
      latestScore: latest?.riskScore ?? 0,
      latestLevel: latest?.riskLevel ?? 'low',
      assessmentCount: history.length,
      history,
    };
  });
}

export const DEFAULT_SS_CHECKLIST = [
  { itemKey: 'CHK-01', label: 'Señalización de seguridad visible' },
  { itemKey: 'CHK-02', label: 'EPP disponible y en buen estado' },
  { itemKey: 'CHK-03', label: 'Extintores vigentes y accesibles' },
  { itemKey: 'CHK-04', label: 'Rutas de evacuación despejadas' },
  { itemKey: 'CHK-05', label: 'Orden y aseo del área de trabajo' },
] as const;

export function incidentRequiresInvestigation(severity: string, incidentType: string): boolean {
  if (incidentType === 'accident') return true;
  return ['serious', 'fatal'].includes(severity);
}

export function computeIncidentClosureReady(actions: Array<{ status: string }>): boolean {
  if (actions.length === 0) return false;
  return actions.every((a) => a.status === 'completed' || a.status === 'cancelled');
}

export function validateInspectionChecklist(checklist: Array<{ itemKey: string; checked?: boolean }>): {
  valid: boolean; completed: number; total: number;
} {
  const total = checklist.length;
  const completed = checklist.filter((c) => c.checked).length;
  return { valid: total > 0, completed, total };
}

export function mergeBulkInspections(rows: Array<{ inspectionKey: string }>): Array<{ inspectionKey: string }> {
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (seen.has(r.inspectionKey)) return false;
    seen.add(r.inspectionKey);
    return true;
  });
}

export function validateEvidenceUpload(fileName: string, mimeType?: string): { valid: boolean; reason?: string } {
  if (!fileName?.trim()) return { valid: false, reason: 'Nombre de archivo requerido' };
  if (mimeType && !/^(image\/|application\/pdf|video\/)/.test(mimeType)) {
    return { valid: false, reason: 'Tipo de evidencia no permitido' };
  }
  return { valid: true };
}

export function wellbeingParticipationRate(attended: number, enrolled: number): number {
  if (enrolled <= 0) return 0;
  return Math.min(100, Math.round((attended / enrolled) * 10000) / 100);
}

export function surveyAverageScore(responses: Array<{ score?: number }>): number {
  const scores = responses.map((r) => r.score).filter((s): s is number => typeof s === 'number');
  if (scores.length === 0) return 0;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
}

export function validateOfflineIncidentRow(row: {
  title: string; incidentType: string; occurredAt: string;
}, rowIndex: number): { valid: boolean; errors: string[]; row: number } {
  const errors: string[] = [];
  if (!row.title?.trim()) errors.push('Título requerido');
  if (!row.incidentType?.trim()) errors.push('Tipo requerido');
  if (!row.occurredAt?.trim() || Number.isNaN(Date.parse(row.occurredAt))) errors.push('Fecha inválida');
  return { row: rowIndex, valid: errors.length === 0, errors };
}

