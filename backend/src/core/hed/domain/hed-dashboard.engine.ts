export type MonthBucket = { month: string; value: number };

export function generateHedKey(prefix: string, seq: number): string {
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

export function countByKey<T>(rows: T[], keyFn: (row: T) => string | null | undefined): Array<{ key: string; count: number }> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = keyFn(row) || 'SIN_ASIGNAR';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

export function bucketByMonth<T>(
  rows: T[],
  dateFn: (row: T) => Date | string | null | undefined,
  months: string[],
): MonthBucket[] {
  const map = new Map(months.map((m) => [m, 0]));
  for (const row of rows) {
    const date = dateFn(row);
    if (!date) continue;
    const key = monthKey(date);
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
  }
  return months.map((month) => ({ month, value: map.get(month) ?? 0 }));
}

export function computeHeadcountEvolution(
  months: string[],
  hires: MonthBucket[],
  terminations: MonthBucket[],
  openingHeadcount: number,
): Array<{ month: string; headcount: number; hires: number; terminations: number }> {
  const hireMap = new Map(hires.map((h) => [h.month, h.value]));
  const termMap = new Map(terminations.map((t) => [t.month, t.value]));
  let headcount = openingHeadcount;
  return months.map((month) => {
    const h = hireMap.get(month) ?? 0;
    const t = termMap.get(month) ?? 0;
    headcount = Math.max(0, headcount + h - t);
    return { month, headcount, hires: h, terminations: t };
  });
}

export function computeMonthlyRotation(
  months: string[],
  terminations: MonthBucket[],
  evolution: Array<{ month: string; headcount: number }>,
): Array<{ month: string; rate: number; terminations: number; headcount: number }> {
  const termMap = new Map(terminations.map((t) => [t.month, t.value]));
  return months.map((month) => {
    const headcount = evolution.find((e) => e.month === month)?.headcount ?? 0;
    const terms = termMap.get(month) ?? 0;
    const rate = headcount > 0 ? Math.round((terms / headcount) * 10000) / 100 : 0;
    return { month, rate, terminations: terms, headcount };
  });
}

export function averageScore(scores: Array<number | null | undefined>): number {
  const valid = scores.filter((s): s is number => typeof s === 'number' && !Number.isNaN(s));
  if (valid.length === 0) return 0;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100;
}

export function trainingCompliance(completed: number, total: number): number {
  if (total <= 0) return 100;
  return Math.round((completed / total) * 10000) / 100;
}

export function objectiveCompliance(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 10000) / 100;
}

export function isOpenVacancyStatus(status: string): boolean {
  return ['open', 'published_internal', 'published_external', 'in_selection', 'offer_stage', 'approved'].includes(status);
}

export function isClosedVacancyStatus(status: string): boolean {
  return ['filled', 'closed', 'cancelled'].includes(status);
}

export function isInactiveEmployment(status: string): boolean {
  return ['inactive', 'suspended', 'terminated', 'retired'].includes(status);
}

export function resolveDateRange(from?: string, to?: string): { from: Date; to: Date } {
  const end = to ? new Date(to) : new Date();
  const start = from ? new Date(from) : new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 11, 1));
  return { from: start, to: end };
}

export function loadFactor(queryCount: number, maxMs = 50): { ok: boolean; estimatedMs: number } {
  const estimatedMs = Math.min(maxMs * 10, queryCount * 2);
  return { ok: estimatedMs <= maxMs * 10, estimatedMs };
}
