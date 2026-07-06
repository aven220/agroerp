export type QualityDecision =
  | 'accepted'
  | 'accepted_with_observations'
  | 'conditioned'
  | 'rejected'
  | 'requires_lab';

export type QualityGrade = 'excelso' | 'premium' | 'standard' | 'pasilla' | 'reject';

export interface QualityParameters {
  humidityPct?: number | null;
  temperatureC?: number | null;
  factor?: number | null;
  pasillaPct?: number | null;
  brocaPct?: number | null;
  blackBeansPct?: number | null;
  vinegarBeansPct?: number | null;
  brokenBeansPct?: number | null;
  foreignMatterPct?: number | null;
  impuritiesPct?: number | null;
  defectsPct?: number | null;
  color?: string | null;
  odor?: string | null;
}

export interface QualityThresholds {
  minHumidityPct?: number;
  maxHumidityPct?: number;
  minFactor?: number;
  maxFactor?: number;
  maxPasillaPct?: number;
  maxBrocaPct?: number;
  maxBlackBeansPct?: number;
  maxVinegarBeansPct?: number;
  maxBrokenBeansPct?: number;
  maxForeignMatterPct?: number;
  maxImpuritiesPct?: number;
  maxDefectsPct?: number;
  minQualityScore?: number;
  rejectHumidityPct?: number;
  rejectDefectsPct?: number;
  labHumidityPct?: number;
  labDefectsPct?: number;
}

export interface QualityRuleResult {
  code: string;
  action: 'accept' | 'reject' | 'review' | 'bonus' | 'penalty' | 'alert' | 'escalate' | 'lab';
  message: string;
  amount?: number;
  severity?: 'info' | 'warning' | 'critical';
}

export interface QualityEvaluation {
  qualityScore: number;
  grade: QualityGrade;
  decision: QualityDecision;
  decisionReason: string;
  bonusesTotal: number;
  penaltiesTotal: number;
  rulesApplied: QualityRuleResult[];
  alerts: QualityRuleResult[];
  requiresReview: boolean;
  escalated: boolean;
  defectsTotalPct: number;
}

export const QUALITY_FLOW_STEPS = [
  { step: 1, key: 'weighing_received', label: 'Recepción del pesaje' },
  { step: 2, key: 'lot_identified', label: 'Identificación del lote' },
  { step: 3, key: 'sample_registered', label: 'Registro de muestra' },
  { step: 4, key: 'photos_captured', label: 'Captura de fotografías' },
  { step: 5, key: 'parameters_recorded', label: 'Parámetros físicos' },
  { step: 6, key: 'results_calculated', label: 'Cálculo de resultados' },
  { step: 7, key: 'rules_applied', label: 'Reglas de negocio' },
  { step: 8, key: 'decided', label: 'Decisión' },
  { step: 9, key: 'routed', label: 'Liquidación o rechazo' },
] as const;

export const DEFAULT_QUALITY_THRESHOLDS: Required<QualityThresholds> = {
  minHumidityPct: 9,
  maxHumidityPct: 12.5,
  minFactor: 88,
  maxFactor: 96,
  maxPasillaPct: 3,
  maxBrocaPct: 2,
  maxBlackBeansPct: 1.5,
  maxVinegarBeansPct: 1,
  maxBrokenBeansPct: 3,
  maxForeignMatterPct: 0.5,
  maxImpuritiesPct: 1,
  maxDefectsPct: 5,
  minQualityScore: 70,
  rejectHumidityPct: 14,
  rejectDefectsPct: 12,
  labHumidityPct: 13,
  labDefectsPct: 8,
};

export function generateSampleKey(ticketKey: string, seq = 1): string {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 12);
  return `SMP-${ticketKey.slice(0, 10)}-${stamp}-${String(seq).padStart(2, '0')}`.toUpperCase();
}

export function generateCustodyCode(sampleKey: string): string {
  return `CUS-${sampleKey.replace(/^SMP-/, '')}`;
}

export function computeDefectsTotal(params: QualityParameters): number {
  const parts = [
    params.pasillaPct,
    params.brocaPct,
    params.blackBeansPct,
    params.vinegarBeansPct,
    params.brokenBeansPct,
    params.foreignMatterPct,
    params.impuritiesPct,
  ].filter((v): v is number => v != null);
  if (params.defectsPct != null) return Number(params.defectsPct.toFixed(3));
  if (!parts.length) return 0;
  return Number(parts.reduce((a, b) => a + b, 0).toFixed(3));
}

export function computeQualityScore(params: QualityParameters, thresholds: QualityThresholds = {}): number {
  const t = { ...DEFAULT_QUALITY_THRESHOLDS, ...thresholds };
  let score = 100;
  const defects = computeDefectsTotal(params);

  if (params.humidityPct != null) {
    if (params.humidityPct > t.maxHumidityPct) score -= (params.humidityPct - t.maxHumidityPct) * 4;
    if (params.humidityPct < t.minHumidityPct) score -= (t.minHumidityPct - params.humidityPct) * 2;
  }
  if (params.factor != null) {
    if (params.factor < t.minFactor) score -= (t.minFactor - params.factor) * 2;
    if (params.factor > t.maxFactor) score -= (params.factor - t.maxFactor) * 1.5;
  }
  score -= defects * 3;
  if (params.odor && /moho|ferment|avinagrad|rancid/i.test(params.odor)) score -= 15;
  if (params.color && /negro|oscuro|manchado/i.test(params.color)) score -= 8;

  return Number(Math.max(0, Math.min(100, score)).toFixed(2));
}

export function deriveGrade(score: number, defectsTotal: number, decision?: QualityDecision): QualityGrade {
  if (decision === 'rejected' || score < 40 || defectsTotal >= 12) return 'reject';
  if (score >= 92 && defectsTotal <= 1.5) return 'excelso';
  if (score >= 85 && defectsTotal <= 3) return 'premium';
  if (score < 60 || defectsTotal > 6) return 'pasilla';
  return 'standard';
}

export function evaluateQualityRules(
  params: QualityParameters,
  thresholds: QualityThresholds = {},
  options?: { observations?: string; forceLab?: boolean },
): QualityEvaluation {
  const t = { ...DEFAULT_QUALITY_THRESHOLDS, ...thresholds };
  const defectsTotalPct = computeDefectsTotal(params);
  const qualityScore = computeQualityScore(params, t);
  const rulesApplied: QualityRuleResult[] = [];
  const alerts: QualityRuleResult[] = [];
  let bonusesTotal = 0;
  let penaltiesTotal = 0;
  let requiresReview = false;
  let escalated = false;
  let decision: QualityDecision = 'accepted';
  const reasons: string[] = [];

  if (params.humidityPct != null && params.humidityPct >= t.rejectHumidityPct) {
    rulesApplied.push({
      code: 'HUMIDITY_REJECT',
      action: 'reject',
      message: `Humedad ${params.humidityPct}% >= rechazo ${t.rejectHumidityPct}%`,
      severity: 'critical',
    });
    decision = 'rejected';
    reasons.push('Humedad fuera de tolerancia de rechazo');
  }

  if (defectsTotalPct >= t.rejectDefectsPct) {
    rulesApplied.push({
      code: 'DEFECTS_REJECT',
      action: 'reject',
      message: `Defectos totales ${defectsTotalPct}% >= rechazo ${t.rejectDefectsPct}%`,
      severity: 'critical',
    });
    decision = 'rejected';
    reasons.push('Defectos totales excesivos');
  }

  if (params.odor && /moho|avinagrad|químico/i.test(params.odor)) {
    rulesApplied.push({
      code: 'ODOR_REJECT',
      action: 'reject',
      message: `Olor defectuoso: ${params.odor}`,
      severity: 'critical',
    });
    decision = 'rejected';
    reasons.push('Olor defectuoso');
  }

  if (decision !== 'rejected') {
    if (
      options?.forceLab ||
      (params.humidityPct != null && params.humidityPct >= t.labHumidityPct) ||
      defectsTotalPct >= t.labDefectsPct
    ) {
      rulesApplied.push({
        code: 'REQUIRES_LAB',
        action: 'lab',
        message: 'Requiere análisis de laboratorio',
        severity: 'warning',
      });
      decision = 'requires_lab';
      reasons.push('Parámetros en zona de laboratorio');
      requiresReview = true;
    }
  }

  if (decision !== 'rejected' && decision !== 'requires_lab') {
    if (params.humidityPct != null && (params.humidityPct > t.maxHumidityPct || params.humidityPct < t.minHumidityPct)) {
      rulesApplied.push({
        code: 'HUMIDITY_CONDITION',
        action: 'review',
        message: `Humedad ${params.humidityPct}% fuera de rango operativo`,
        severity: 'warning',
      });
      decision = 'conditioned';
      reasons.push('Humedad condicionada');
      requiresReview = true;
      penaltiesTotal += Math.abs(params.humidityPct - t.maxHumidityPct) * 40;
    }

    if (params.factor != null && params.factor < t.minFactor) {
      rulesApplied.push({
        code: 'FACTOR_PENALTY',
        action: 'penalty',
        message: `Factor ${params.factor} bajo mínimo ${t.minFactor}`,
        amount: (t.minFactor - params.factor) * 20,
        severity: 'warning',
      });
      penaltiesTotal += (t.minFactor - params.factor) * 20;
      if (decision === 'accepted') decision = 'conditioned';
      reasons.push('Factor bajo');
    }

    if (params.factor != null && params.factor > 94) {
      const amount = (params.factor - 94) * 15;
      rulesApplied.push({
        code: 'FACTOR_BONUS',
        action: 'bonus',
        message: `Factor alto ${params.factor}`,
        amount,
        severity: 'info',
      });
      bonusesTotal += amount;
    }

    if (params.pasillaPct != null && params.pasillaPct > t.maxPasillaPct) {
      const amount = (params.pasillaPct - t.maxPasillaPct) * 30;
      rulesApplied.push({
        code: 'PASILLA_PENALTY',
        action: 'penalty',
        message: `Pasilla ${params.pasillaPct}%`,
        amount,
        severity: 'warning',
      });
      penaltiesTotal += amount;
      if (decision === 'accepted') decision = 'conditioned';
    }

    if (params.brocaPct != null && params.brocaPct > t.maxBrocaPct) {
      const amount = (params.brocaPct - t.maxBrocaPct) * 35;
      rulesApplied.push({
        code: 'BROCA_PENALTY',
        action: 'penalty',
        message: `Broca ${params.brocaPct}%`,
        amount,
        severity: 'warning',
      });
      penaltiesTotal += amount;
      alerts.push({
        code: 'BROCA_ALERT',
        action: 'alert',
        message: `Broca elevada ${params.brocaPct}%`,
        severity: 'warning',
      });
    }

    if (params.blackBeansPct != null && params.blackBeansPct > t.maxBlackBeansPct) {
      penaltiesTotal += (params.blackBeansPct - t.maxBlackBeansPct) * 40;
      rulesApplied.push({
        code: 'BLACK_BEANS_PENALTY',
        action: 'penalty',
        message: `Granos negros ${params.blackBeansPct}%`,
        severity: 'warning',
      });
      if (decision === 'accepted') decision = 'conditioned';
    }

    if (params.foreignMatterPct != null && params.foreignMatterPct > t.maxForeignMatterPct) {
      rulesApplied.push({
        code: 'FOREIGN_MATTER',
        action: 'escalate',
        message: `Materia extraña ${params.foreignMatterPct}%`,
        severity: 'critical',
      });
      escalated = true;
      requiresReview = true;
      if (decision === 'accepted') decision = 'conditioned';
      reasons.push('Materia extraña — escalamiento');
    }

    if (qualityScore < t.minQualityScore && decision === 'accepted') {
      decision = 'conditioned';
      requiresReview = true;
      reasons.push(`Score ${qualityScore} bajo mínimo ${t.minQualityScore}`);
      rulesApplied.push({
        code: 'SCORE_REVIEW',
        action: 'review',
        message: `Score ${qualityScore} requiere revisión`,
        severity: 'warning',
      });
    }

    if (qualityScore >= 92 && defectsTotalPct <= 1.5 && decision === 'accepted') {
      bonusesTotal += 200;
      rulesApplied.push({
        code: 'EXCELSO_BONUS',
        action: 'bonus',
        message: 'Bonificación excelso',
        amount: 200,
        severity: 'info',
      });
    } else if (qualityScore >= 85 && defectsTotalPct <= 3 && decision === 'accepted') {
      bonusesTotal += 100;
      rulesApplied.push({
        code: 'PREMIUM_BONUS',
        action: 'bonus',
        message: 'Bonificación premium',
        amount: 100,
        severity: 'info',
      });
    }

    if (options?.observations?.trim() && decision === 'accepted') {
      decision = 'accepted_with_observations';
      reasons.push('Aceptado con observaciones del inspector');
    }
  }

  if (escalated) {
    alerts.push({
      code: 'ESCALATED_CASE',
      action: 'escalate',
      message: 'Caso especial escalado',
      severity: 'critical',
    });
  }

  const grade = deriveGrade(qualityScore, defectsTotalPct, decision);
  if (grade === 'excelso' && decision === 'accepted') {
    // already handled bonus
  }

  return {
    qualityScore,
    grade,
    decision,
    decisionReason: reasons.join('; ') || `Decisión automática: ${decision}`,
    bonusesTotal: Number(bonusesTotal.toFixed(2)),
    penaltiesTotal: Number(penaltiesTotal.toFixed(2)),
    rulesApplied,
    alerts,
    requiresReview,
    escalated,
    defectsTotalPct,
  };
}

export function mergeBreActions(
  evaluation: QualityEvaluation,
  breResults: Array<{ ruleKey: string; actions?: Array<{ type?: string; config?: Record<string, unknown> }>; matched?: boolean }>,
): QualityEvaluation {
  const next = { ...evaluation, rulesApplied: [...evaluation.rulesApplied], alerts: [...evaluation.alerts] };
  for (const result of breResults) {
    if (!result.matched) continue;
    for (const action of result.actions ?? []) {
      const type = String(action.type ?? '').toLowerCase();
      const amount = Number(action.config?.amount ?? 0);
      const message = String(action.config?.message ?? result.ruleKey);
      if (type.includes('reject')) {
        next.decision = 'rejected';
        next.decisionReason = message;
        next.rulesApplied.push({ code: result.ruleKey, action: 'reject', message, severity: 'critical' });
      } else if (type.includes('lab') || type.includes('laboratory')) {
        if (next.decision !== 'rejected') {
          next.decision = 'requires_lab';
          next.requiresReview = true;
          next.rulesApplied.push({ code: result.ruleKey, action: 'lab', message, severity: 'warning' });
        }
      } else if (type.includes('bonus')) {
        next.bonusesTotal += amount;
        next.rulesApplied.push({ code: result.ruleKey, action: 'bonus', message, amount, severity: 'info' });
      } else if (type.includes('penalty') || type.includes('castigo')) {
        next.penaltiesTotal += amount;
        next.rulesApplied.push({ code: result.ruleKey, action: 'penalty', message, amount, severity: 'warning' });
        if (next.decision === 'accepted') next.decision = 'conditioned';
      } else if (type.includes('alert')) {
        next.alerts.push({ code: result.ruleKey, action: 'alert', message, severity: 'warning' });
      } else if (type.includes('escalate')) {
        next.escalated = true;
        next.requiresReview = true;
        next.alerts.push({ code: result.ruleKey, action: 'escalate', message, severity: 'critical' });
      } else if (type.includes('review')) {
        next.requiresReview = true;
        if (next.decision === 'accepted') next.decision = 'conditioned';
        next.rulesApplied.push({ code: result.ruleKey, action: 'review', message, severity: 'warning' });
      } else if (type.includes('accept')) {
        if (next.decision !== 'rejected' && next.decision !== 'requires_lab') {
          next.decision = 'accepted';
          next.rulesApplied.push({ code: result.ruleKey, action: 'accept', message, severity: 'info' });
        }
      }
    }
  }
  next.bonusesTotal = Number(next.bonusesTotal.toFixed(2));
  next.penaltiesTotal = Number(next.penaltiesTotal.toFixed(2));
  next.grade = deriveGrade(next.qualityScore, next.defectsTotalPct, next.decision);
  return next;
}

export function ticketStatusForDecision(decision: QualityDecision): string {
  switch (decision) {
    case 'rejected':
      return 'quality_rejected';
    case 'requires_lab':
      return 'quality_lab';
    case 'accepted':
    case 'accepted_with_observations':
    case 'conditioned':
      return 'settlement_pending';
    default:
      return 'quality_done';
  }
}
