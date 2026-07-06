export type EimsReportTypeValue =
  | 'valued_inventory'
  | 'kardex'
  | 'turnover'
  | 'coverage'
  | 'stock'
  | 'counts'
  | 'differences'
  | 'expiry'
  | 'reservations'
  | 'replenishment'
  | 'movements'
  | 'custom';

export type EimsReportFormatValue = 'csv' | 'excel' | 'pdf' | 'json';

export type EimsOpsAlertTypeValue =
  | 'critical_stock'
  | 'overstock'
  | 'expiry'
  | 'warehouse_saturated'
  | 'immobilized'
  | 'unusual_adjustment'
  | 'count_difference'
  | 'abnormal_cost';

export const EIMS_SYSTEM_REPORTS: Array<{ reportType: EimsReportTypeValue; name: string }> = [
  { reportType: 'valued_inventory', name: 'Inventario valorizado' },
  { reportType: 'kardex', name: 'Kardex consolidado' },
  { reportType: 'turnover', name: 'Rotación' },
  { reportType: 'coverage', name: 'Cobertura' },
  { reportType: 'stock', name: 'Existencias' },
  { reportType: 'counts', name: 'Conteos' },
  { reportType: 'differences', name: 'Diferencias' },
  { reportType: 'expiry', name: 'Vencimientos' },
  { reportType: 'reservations', name: 'Reservas' },
  { reportType: 'replenishment', name: 'Abastecimiento' },
  { reportType: 'movements', name: 'Movimientos' },
];

export function generateSnapshotKey(period = 'live'): string {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `OPS-${period}-${stamp}`;
}

export function generateKpiKey(periodDate: string, periodType = 'daily'): string {
  return `KPI-${periodType}-${periodDate}`;
}

export function generateOpsAlertKey(type: string, ref: string): string {
  return `OAL-${type}-${ref}`.slice(0, 120);
}

export function generateReportKey(reportType: string, seq = 1): string {
  return `RPT-${reportType}-${seq}`.slice(0, 120);
}

export function generateRunKey(reportKey: string): string {
  return `RUN-${reportKey}-${Date.now().toString(36)}`.slice(0, 120);
}

export function generateQueryKey(queryType: string): string {
  return `QRY-${queryType}-${Date.now().toString(36)}`.slice(0, 120);
}

/** Inventory turnover = exits / average inventory */
export function computeTurnover(exitQty: number, avgInventoryQty: number): number {
  if (avgInventoryQty <= 0) return exitQty > 0 ? 999 : 0;
  return Number((exitQty / avgInventoryQty).toFixed(4));
}

export function computeCoverageDays(onHandQty: number, avgDailyDemand: number): number {
  if (avgDailyDemand <= 0) return onHandQty > 0 ? 999 : 0;
  return Number((onHandQty / avgDailyDemand).toFixed(2));
}

/** Service level = fulfilled / (fulfilled + stockouts) */
export function computeServiceLevel(fulfilled: number, stockouts: number): number {
  const total = fulfilled + stockouts;
  if (total <= 0) return 100;
  return Number(((fulfilled / total) * 100).toFixed(2));
}

/** Inventory accuracy = 1 - |variance| / system */
export function computeInventoryAccuracy(systemQty: number, physicalQty: number): number {
  if (systemQty === 0 && physicalQty === 0) return 100;
  const base = Math.max(Math.abs(systemQty), Math.abs(physicalQty), 1);
  const accuracy = 1 - Math.abs(physicalQty - systemQty) / base;
  return Number((Math.max(0, accuracy) * 100).toFixed(2));
}

export function computeOccupancy(usedCapacity: number, totalCapacity: number): {
  occupancyPct: number;
  availableCapacity: number;
  saturated: boolean;
} {
  const total = totalCapacity > 0 ? totalCapacity : Math.max(usedCapacity, 1);
  const occupancyPct = Number(((usedCapacity / total) * 100).toFixed(2));
  return {
    occupancyPct,
    availableCapacity: Number(Math.max(0, total - usedCapacity).toFixed(6)),
    saturated: occupancyPct >= 90,
  };
}

export function averageStayDays(
  entries: Array<{ qty: number; days: number }>,
): number {
  const totalQty = entries.reduce((s, e) => s + e.qty, 0);
  if (totalQty <= 0) return 0;
  const weighted = entries.reduce((s, e) => s + e.qty * e.days, 0);
  return Number((weighted / totalQty).toFixed(2));
}

export function groupByHour(timestamps: Date[]): Array<{ hour: number; count: number }> {
  const map = new Map<number, number>();
  for (const t of timestamps) {
    const hour = t.getHours();
    map.set(hour, (map.get(hour) ?? 0) + 1);
  }
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: map.get(hour) ?? 0,
  }));
}

export function trendSeries(
  points: Array<{ date: string; value: number }>,
): Array<{ date: string; value: number; changePct: number }> {
  return points.map((p, i) => {
    const prev = points[i - 1]?.value ?? p.value;
    const changePct = prev === 0 ? (p.value === 0 ? 0 : 100) : Number((((p.value - prev) / Math.abs(prev)) * 100).toFixed(2));
    return { ...p, changePct };
  });
}

export function classifyVelocity(
  turnover: number,
): 'high' | 'medium' | 'low' | 'immobilized' {
  if (turnover <= 0) return 'immobilized';
  if (turnover >= 6) return 'high';
  if (turnover >= 2) return 'medium';
  return 'low';
}

export function detectAbnormalCost(
  current: number,
  history: number[],
  thresholdPct = 30,
): boolean {
  if (!history.length || current <= 0) return false;
  const avg = history.reduce((s, v) => s + v, 0) / history.length;
  if (avg <= 0) return false;
  return Math.abs(current - avg) / avg * 100 >= thresholdPct;
}

export function toCsv(rows: Array<Record<string, unknown>>, columns?: string[]): string {
  if (!rows.length) return '';
  const cols = columns ?? Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [cols.join(',')];
  for (const row of rows) {
    lines.push(cols.map((c) => escape(row[c])).join(','));
  }
  return lines.join('\n');
}

export function toExcelCsv(rows: Array<Record<string, unknown>>, columns?: string[]): string {
  return `\uFEFF${toCsv(rows, columns)}`;
}

export function toSimplePdf(title: string, lines: string[]): string {
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
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return pdf;
}

export function formatExport(
  format: EimsReportFormatValue,
  title: string,
  rows: Array<Record<string, unknown>>,
  columns?: string[],
): { content: string; contentType: string } {
  switch (format) {
    case 'csv':
      return { content: toCsv(rows, columns), contentType: 'text/csv' };
    case 'excel':
      return {
        content: toExcelCsv(rows, columns),
        contentType: 'application/vnd.ms-excel',
      };
    case 'pdf': {
      const cols = columns ?? (rows[0] ? Object.keys(rows[0]) : []);
      const lines = rows.slice(0, 50).map((r) => cols.map((c) => `${c}=${r[c] ?? ''}`).join(' | '));
      return { content: toSimplePdf(title, lines), contentType: 'application/pdf' };
    }
    default:
      return { content: JSON.stringify(rows, null, 2), contentType: 'application/json' };
  }
}

export function summarizeBalances(balances: Array<{
  onHandQty: number;
  reservedQty: number;
  blockedQty: number;
  availableQty: number;
  totalCost: number;
  averageCost: number;
}>) {
  const totals = balances.reduce(
    (acc, b) => {
      acc.onHandQty += b.onHandQty;
      acc.reservedQty += b.reservedQty;
      acc.blockedQty += b.blockedQty;
      acc.availableQty += b.availableQty;
      acc.totalCost += b.totalCost;
      return acc;
    },
    { onHandQty: 0, reservedQty: 0, blockedQty: 0, availableQty: 0, totalCost: 0 },
  );
  const avgCost =
    totals.onHandQty > 0 ? Number((totals.totalCost / totals.onHandQty).toFixed(6)) : 0;
  return {
    totalQty: Number(totals.onHandQty.toFixed(6)),
    availableQty: Number(totals.availableQty.toFixed(6)),
    reservedQty: Number(totals.reservedQty.toFixed(6)),
    blockedQty: Number(totals.blockedQty.toFixed(6)),
    inventoryValue: Number(totals.totalCost.toFixed(6)),
    averageCost: avgCost,
  };
}
