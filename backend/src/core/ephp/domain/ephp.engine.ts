export function generateEphpKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

export const EPHP_PEST_CLASSIFICATIONS = ['insect', 'mite', 'nematode', 'rodent', 'bird', 'other'];
export const EPHP_INFESTATION_LEVELS = ['absent', 'low', 'medium', 'high', 'critical'];
export const EPHP_TREATMENT_TYPES = ['preventive', 'corrective', 'biological', 'chemical', 'cultural', 'mechanical'];
export const EPHP_IPM_METHODS = ['biological', 'cultural', 'mechanical', 'chemical'];
export const EPHP_COMPLIANCE_TYPES = ['bpa', 'global_gap', 'organic', 'phytosanitary_cert', 'internal_protocol'];
export const EPHP_MRL_MARKETS = ['national', 'international', 'export'];

export const EPHP_MODULE_SLOTS = [
  'eatp', 'eapp', 'eiwp', 'egsip', 'ftip', 'fmdt', 'eims', 'escm', 'emfg', 'eint', 'ebiap', 'eiamp', 'efm',
];

export function evaluateIpmAction(infestationLevel: string, threshold: number): {
  actionRequired: boolean;
  recommendedMethods: string[];
  urgency: string;
} {
  const levelScore: Record<string, number> = { absent: 0, low: 1, medium: 2, high: 3, critical: 4 };
  const score = levelScore[infestationLevel] ?? 0;
  const actionRequired = score >= threshold;
  const methods: string[] = [];
  if (score <= 1) methods.push('cultural', 'biological');
  else if (score === 2) methods.push('biological', 'mechanical');
  else methods.push('chemical', 'mechanical');
  return {
    actionRequired,
    recommendedMethods: actionRequired ? methods : ['monitoring'],
    urgency: score >= 3 ? 'high' : score >= 2 ? 'medium' : 'low',
  };
}

export function computeIntervalAlerts(input: {
  appliedAt: Date;
  preHarvestDays: number;
  reEntryHours: number;
  harvestBlocked: boolean;
  accessBlocked: boolean;
}) {
  const now = new Date();
  const harvestClear = new Date(input.appliedAt.getTime() + input.preHarvestDays * 86400000);
  const reEntryClear = new Date(input.appliedAt.getTime() + input.reEntryHours * 3600000);
  const alerts = [];
  if (input.harvestBlocked && now < harvestClear) {
    alerts.push({ alertType: 'harvest_restriction', expiresAt: harvestClear, active: true });
  }
  if (input.accessBlocked && now < reEntryClear) {
    alerts.push({ alertType: 'reentry_restriction', expiresAt: reEntryClear, active: true });
  }
  if (input.preHarvestDays > 0 && now < harvestClear) {
    alerts.push({ alertType: 'pre_harvest_interval', expiresAt: harvestClear, active: true });
  }
  return alerts;
}

export function validateMrl(activeIngredient: string, residuePpm: number, limitPpm: number) {
  const compliant = residuePpm <= limitPpm;
  return {
    activeIngredient,
    residuePpm,
    limitPpm,
    compliant,
    violationPpm: compliant ? 0 : residuePpm - limitPpm,
  };
}

export function aggregateEphpIndicators(data: {
  pestCatalog: number;
  diseaseCatalog: number;
  activeMonitorings30d: number;
  scheduledTreatments: number;
  activeAlerts: number;
  complianceFrameworks: number;
}) {
  const healthScore = Math.min(
    100,
    data.pestCatalog * 2 + data.diseaseCatalog * 2 + data.complianceFrameworks * 5 +
      Math.min(30, data.activeMonitorings30d) + (data.activeAlerts === 0 ? 10 : 0),
  );
  return {
    ...data,
    healthScore,
    phytosanitaryReady: healthScore >= 35,
  };
}

export function evaluatePhytosanitaryAlerts(input: {
  infestationLevel?: string;
  diseaseSeverity?: string;
  mrlCompliant?: boolean;
  intervalActive?: boolean;
}) {
  const alerts: Array<{ alertType: string; severity: string; title: string }> = [];
  if (input.infestationLevel === 'critical' || input.infestationLevel === 'high') {
    alerts.push({ alertType: 'pest_infestation', severity: 'critical', title: 'Infestación elevada' });
  }
  if (input.diseaseSeverity === 'critical' || input.diseaseSeverity === 'high') {
    alerts.push({ alertType: 'disease_outbreak', severity: 'critical', title: 'Brotes de enfermedad' });
  }
  if (input.mrlCompliant === false) {
    alerts.push({ alertType: 'mrl_violation', severity: 'critical', title: 'Incumplimiento LMR' });
  }
  if (input.intervalActive) {
    alerts.push({ alertType: 'interval_restriction', severity: 'warning', title: 'Restricción por carencia/reingreso' });
  }
  return alerts;
}
