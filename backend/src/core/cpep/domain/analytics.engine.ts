export function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

export function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

export function groupCount<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = keyFn(item) || 'unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

export function groupSum<T>(items: T[], keyFn: (item: T) => string, valueFn: (item: T) => number): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = keyFn(item) || 'unknown';
    acc[key] = (acc[key] ?? 0) + valueFn(item);
    return acc;
  }, {});
}

export function startOfDay(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfWeek(date = new Date()): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

export function startOfMonth(date = new Date()): Date {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

export function startOfYear(date = new Date()): Date {
  const d = startOfDay(date);
  d.setMonth(0, 1);
  return d;
}

export function hoursBucket(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:00`;
}

export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function weekKey(date: Date): string {
  const d = startOfWeek(date);
  return `W-${dayKey(d)}`;
}

export function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export function yearKey(date: Date): string {
  return String(date.getFullYear());
}

export function averageDurationMs(starts: Array<Date | null | undefined>, ends: Array<Date | null | undefined>): number {
  const durations: number[] = [];
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i];
    const e = ends[i];
    if (s && e) durations.push(e.getTime() - s.getTime());
  }
  return avg(durations);
}

export function msToMinutes(ms: number): number {
  return Number((ms / 60_000).toFixed(2));
}

export function percent(part: number, total: number): number {
  return total > 0 ? Number(((part / total) * 100).toFixed(2)) : 0;
}

export function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return '';
  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  );
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ].join('\n');
}

export function periodRange(period: 'day' | 'week' | 'month' | 'year' | 'custom', days?: number): { from: Date; to: Date; label: string } {
  const to = new Date();
  if (period === 'day') return { from: startOfDay(), to, label: 'daily' };
  if (period === 'week') return { from: startOfWeek(), to, label: 'weekly' };
  if (period === 'month') return { from: startOfMonth(), to, label: 'monthly' };
  if (period === 'year') return { from: startOfYear(), to, label: 'yearly' };
  const from = new Date(Date.now() - (days ?? 30) * 86_400_000);
  return { from, to, label: `custom_${days ?? 30}d` };
}

export function comparePeriods<T extends Record<string, number>>(current: T, previous: T): Record<string, { current: number; previous: number; delta: number; deltaPct: number }> {
  const keys = new Set([...Object.keys(current), ...Object.keys(previous)]);
  const result: Record<string, { current: number; previous: number; delta: number; deltaPct: number }> = {};
  for (const key of keys) {
    const c = current[key] ?? 0;
    const p = previous[key] ?? 0;
    result[key] = {
      current: c,
      previous: p,
      delta: c - p,
      deltaPct: percent(c - p, p || 1),
    };
  }
  return result;
}
