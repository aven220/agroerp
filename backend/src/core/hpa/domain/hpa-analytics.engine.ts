export function generateHpaKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(8, '0')}`;
}

export function monthKey(date: Date | string): string {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthsInRange(from: Date, to: Date): string[] {
  const months: string[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
  while (cursor <= end) {
    months.push(monthKey(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

export function resolveDateRange(from?: string, to?: string): { from: Date; to: Date } {
  const end = to ? new Date(to) : new Date();
  const start = from ? new Date(from) : new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 11, 1));
  return { from: start, to: end };
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

export function tenureYears(hireDate: Date | string | null | undefined, now = new Date()): number {
  if (!hireDate) return 0;
  const hire = new Date(hireDate);
  const years = (now.getTime() - hire.getTime()) / (365.25 * 86400000);
  return Math.max(0, Math.round(years * 100) / 100);
}

export function averageTenureYears(hireDates: Array<Date | string | null | undefined>): number {
  return average(hireDates.map((d) => tenureYears(d)).filter((y) => y > 0));
}

export function timeToHireDays(openedAt: Date | string, filledAt: Date | string): number {
  const days = (new Date(filledAt).getTime() - new Date(openedAt).getTime()) / 86400000;
  return Math.max(0, Math.round(days * 100) / 100);
}

export function averageTimeToHire(pairs: Array<{ openedAt: Date | string; filledAt: Date | string }>): number {
  return average(pairs.map((p) => timeToHireDays(p.openedAt, p.filledAt)));
}

export function bucketSeries(
  months: string[],
  rows: Array<{ at: Date | string | null | undefined }>,
): Array<{ month: string; value: number }> {
  const map = new Map(months.map((m) => [m, 0]));
  for (const row of rows) {
    if (!row.at) continue;
    const key = monthKey(row.at);
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
  }
  return months.map((month) => ({ month, value: map.get(month) ?? 0 }));
}

export function rotationRate(terminations: number, headcount: number): number {
  if (headcount <= 0) return 0;
  return Math.round((terminations / headcount) * 10000) / 100;
}

export function absenteeismRate(absenceDays: number, employeeDays: number): number {
  if (employeeDays <= 0) return 0;
  return Math.round((absenceDays / employeeDays) * 10000) / 100;
}

export function orgPyramid(rows: Array<{ level: string }>): Array<{ level: string; count: number }> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const level = row.level || 'SIN_NIVEL';
    map.set(level, (map.get(level) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([level, count]) => ({ level, count }))
    .sort((a, b) => b.count - a.count);
}

export function distributionBy(rows: Array<{ key: string | null | undefined }>): Array<{ key: string; count: number }> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = row.key || 'SIN_ASIGNAR';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

export function loadVolumeScore(totalRows: number): { ok: boolean; totalRows: number; estimatedMs: number } {
  const estimatedMs = Math.min(5000, totalRows * 0.5);
  return { ok: estimatedMs < 5000, totalRows, estimatedMs };
}

export type AiCapabilityCode =
  | 'turnover_prediction'
  | 'absenteeism_prediction'
  | 'resignation_risk'
  | 'training_recommendation'
  | 'competency_gap'
  | 'anomaly_detection';

export const AI_CAPABILITIES: AiCapabilityCode[] = [
  'turnover_prediction',
  'absenteeism_prediction',
  'resignation_risk',
  'training_recommendation',
  'competency_gap',
  'anomaly_detection',
];

export function buildAiStubInsight(capability: AiCapabilityCode, employeeKey?: string): {
  capability: AiCapabilityCode;
  employeeKey: string | null;
  providerName: string;
  status: 'ready_for_external_model' | 'cached' | 'provider_error' | 'provider_success';
  score: number | null;
  payload: Record<string, unknown>;
} {
  return {
    capability,
    employeeKey: employeeKey ?? null,
    providerName: 'stub',
    status: 'ready_for_external_model',
    score: null,
    payload: {
      message: 'Arquitectura preparada para proveedor externo de IA',
      capability,
      requiresExternalModel: true,
    },
  };
}
