export function generateEaccKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

export const EACC_CERTIFICATION_TYPES = [
  'global_gap', 'organic', 'rainforest_alliance', 'fairtrade', 'bpa', 'bpm', 'internal', 'custom',
];

export const EACC_AUDIT_TYPES = ['internal', 'external'];
export const EACC_FINDING_TYPES = ['non_conformity', 'observation', 'opportunity'];
export const EACC_ACTION_TYPES = ['corrective', 'preventive'];
export const EACC_ESG_PILLARS = ['environmental', 'social', 'governance'];
export const EACC_SUSTAINABILITY_CATEGORIES = [
  'water', 'energy', 'fertilizer', 'agrochemical', 'waste', 'recycling', 'circular_economy', 'conservation',
];
export const EACC_FOOTPRINT_TYPES = ['carbon', 'water', 'emissions', 'offset'];
export const EACC_DOC_TYPES = ['procedure', 'instruction', 'policy', 'record', 'format', 'certificate', 'evidence'];

export const EACC_MODULE_SLOTS = [
  'eatp', 'eapp', 'eiwp', 'ephp', 'eatr', 'egsip', 'ftip', 'fmdt', 'eims', 'escm', 'epscm', 'efm', 'eint', 'ebiap', 'eiamp', 'hcm', 'documents',
];

export function evaluateRequirementCompliance(input: {
  evidencesCount: number; requiredEvidences: number; checklistCompleted: number; checklistTotal: number;
}) {
  const evidencePct = input.requiredEvidences > 0
    ? Math.min(100, (input.evidencesCount / input.requiredEvidences) * 100) : 100;
  const checklistPct = input.checklistTotal > 0
    ? (input.checklistCompleted / input.checklistTotal) * 100 : 100;
  const compliancePct = Math.round((evidencePct + checklistPct) / 2);
  return { compliancePct, isCompliant: compliancePct >= 80, evidencePct, checklistPct };
}

export function evaluateDeadlineAlerts(input: { dueDate?: Date; daysBefore?: number }) {
  if (!input.dueDate) return [];
  const now = new Date();
  const daysBefore = input.daysBefore ?? 7;
  const alertDate = new Date(input.dueDate.getTime() - daysBefore * 86400000);
  if (now >= alertDate && now <= input.dueDate) {
    return [{ alertType: 'deadline_approaching', dueDate: input.dueDate, active: true }];
  }
  if (now > input.dueDate) {
    return [{ alertType: 'deadline_overdue', dueDate: input.dueDate, active: true }];
  }
  return [];
}

export function aggregateEaccIndicators(data: {
  activeCertifications: number;
  expiringCertifications: number;
  openFindings: number;
  openCorrectiveActions: number;
  complianceRate: number;
  sustainabilityRecords30d: number;
  esgObjectives: number;
  activeAlerts: number;
}) {
  const complianceScore = Math.min(
    100,
    data.complianceRate * 0.5 + data.activeCertifications * 3 +
      (data.openFindings === 0 ? 15 : 0) + Math.min(20, data.sustainabilityRecords30d),
  );
  return {
    ...data,
    complianceScore: Math.round(complianceScore),
    certificationReady: complianceScore >= 50,
  };
}

export function simulateAuditScore(findings: Array<{ severity: string; findingType: string }>) {
  let score = 100;
  for (const f of findings) {
    if (f.findingType === 'non_conformity') {
      score -= f.severity === 'critical' ? 20 : f.severity === 'high' ? 12 : f.severity === 'medium' ? 6 : 3;
    } else if (f.findingType === 'observation') {
      score -= 2;
    }
  }
  return Math.max(0, score);
}
