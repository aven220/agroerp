export type PeriodRange = { start: Date; end: Date; label: string };

export type ComparePoint = { label: string; value: number; previous?: number };

export function generateOpsAlertKey(seq: number): string {
  return `OPS-ALT-${String(seq).padStart(6, '0')}`;
}

export function generateReportRunKey(seq: number): string {
  return `RPT-RUN-${String(seq).padStart(6, '0')}`;
}

export function generateCustomReportKey(seq: number): string {
  return `CRPT-${String(seq).padStart(6, '0')}`;
}

export function generateSalesTargetKey(seq: number): string {
  return `TGT-${String(seq).padStart(6, '0')}`;
}

export function periodKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function dayRange(asOf = new Date()): PeriodRange {
  const start = new Date(asOf);
  start.setHours(0, 0, 0, 0);
  const end = new Date(asOf);
  end.setHours(23, 59, 59, 999);
  return { start, end, label: 'day' };
}

export function monthRange(asOf = new Date()): PeriodRange {
  const start = new Date(asOf.getFullYear(), asOf.getMonth(), 1);
  const end = new Date(asOf.getFullYear(), asOf.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end, label: 'month' };
}

export function weekRange(asOf = new Date()): PeriodRange {
  const start = new Date(asOf);
  const day = start.getDay();
  const diff = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end, label: 'week' };
}

export function yearRange(asOf = new Date()): PeriodRange {
  const start = new Date(asOf.getFullYear(), 0, 1);
  const end = new Date(asOf.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { start, end, label: 'year' };
}

export function previousPeriod(range: PeriodRange): PeriodRange {
  const duration = range.end.getTime() - range.start.getTime();
  const end = new Date(range.start.getTime() - 1);
  const start = new Date(end.getTime() - duration);
  return { start, end, label: `prev_${range.label}` };
}

export function computeConversionRate(converted: number, total: number): number {
  if (total <= 0) return 0;
  return Number(((converted / total) * 100).toFixed(2));
}

export function computeAverage(values: number[]): number {
  if (!values.length) return 0;
  return Number((values.reduce((s, v) => s + v, 0) / values.length).toFixed(2));
}

export function computeGoalCompliance(actual: number, target: number): number {
  if (target <= 0) return actual > 0 ? 100 : 0;
  return Number(((actual / target) * 100).toFixed(2));
}

export function groupSumByKey<T>(
  items: T[],
  keyFn: (item: T) => string,
  valueFn: (item: T) => number,
): Array<{ key: string; amount: number; count: number }> {
  const map = new Map<string, { amount: number; count: number }>();
  for (const item of items) {
    const key = keyFn(item) || '_unknown';
    const existing = map.get(key) ?? { amount: 0, count: 0 };
    existing.amount += valueFn(item);
    existing.count += 1;
    map.set(key, existing);
  }
  return [...map.entries()]
    .map(([key, v]) => ({ key, amount: Number(v.amount.toFixed(2)), count: v.count }))
    .sort((a, b) => b.amount - a.amount);
}

export function bucketByDate(
  items: Array<{ date: Date; value: number }>,
  granularity: 'day' | 'week' | 'month',
): ComparePoint[] {
  const map = new Map<string, number>();
  for (const item of items) {
    let label: string;
    const d = item.date;
    if (granularity === 'day') {
      label = d.toISOString().slice(0, 10);
    } else if (granularity === 'month') {
      label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else {
      const wr = weekRange(d);
      label = wr.start.toISOString().slice(0, 10);
    }
    map.set(label, (map.get(label) ?? 0) + item.value);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value: Number(value.toFixed(2)) }));
}

export function detectAnomaly(current: number, history: number[], thresholdPct = 30): boolean {
  if (!history.length || current <= 0) return false;
  const avg = history.reduce((s, v) => s + v, 0) / history.length;
  if (avg <= 0) return false;
  return Math.abs(current - avg) / avg * 100 >= thresholdPct;
}

export function computeDaysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
}

export function toCsv(rows: Array<Record<string, unknown>>, columns?: string[]): string {
  if (!rows.length) return '';
  const cols = columns ?? Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => escape(r[c])).join(','))].join('\n');
}

export function toExcelCsv(rows: Array<Record<string, unknown>>, columns?: string[]): string {
  return `\uFEFF${toCsv(rows, columns)}`;
}

export function toSimplePdf(title: string, rows: Array<Record<string, unknown>>, columns?: string[]): string {
  const cols = columns ?? Object.keys(rows[0] ?? { col: '' });
  const lines = rows.slice(0, 40).map((r) => cols.map((c) => `${c}: ${r[c] ?? ''}`).join(' | '));
  const contentLines = [title, '', ...lines].slice(0, 60);
  const textOps = contentLines
    .map((line, i) => {
      const y = 750 - i * 14;
      const safe = line.replace(/[()\\]/g, ' ').slice(0, 90);
      return `BT /F1 10 Tf 40 ${y} Td (${safe}) Tj ET`;
    })
    .join('\n');
  const stream = `${textOps}\n`;
  const objects = [
    '1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj',
    '2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj',
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj',
    `4 0 obj<< /Length ${stream.length} >>stream\n${stream}endstream endobj`,
    '5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${obj}\n`;
  }
  const xrefPos = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return pdf;
}

export function formatExport(
  format: 'csv' | 'excel' | 'pdf',
  title: string,
  rows: Array<Record<string, unknown>>,
  columns?: string[],
): { content: string; mimeType: string; extension: string } {
  const cols = columns ?? Object.keys(rows[0] ?? {});
  switch (format) {
    case 'csv':
      return { content: toCsv(rows, cols), mimeType: 'text/csv', extension: 'csv' };
    case 'excel':
      return { content: toExcelCsv(rows, cols), mimeType: 'application/vnd.ms-excel', extension: 'xls' };
    case 'pdf':
      return { content: toSimplePdf(title, rows, cols), mimeType: 'application/pdf', extension: 'pdf' };
    default:
      return { content: toCsv(rows, cols), mimeType: 'text/csv', extension: 'csv' };
  }
}

export const REPORT_TYPES = [
  'commercial',
  'sales',
  'billing',
  'receivables',
  'collections',
  'seller',
  'customer',
  'product',
  'profitability',
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export const ALERT_TYPES = {
  GOAL_MISSED: 'goal_missed',
  OVERDUE_AR: 'overdue_ar',
  HIGH_RISK_CUSTOMER: 'high_risk_customer',
  DELAYED_ORDER: 'delayed_order',
  SALES_DROP: 'sales_drop',
  BILLING_ANOMALY: 'billing_anomaly',
  CONVERSION_DROP: 'conversion_drop',
} as const;
