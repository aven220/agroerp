import { createHash } from 'crypto';

export function queryFingerprint(sqlText: string): string {
  const normalized = sqlText.replace(/\s+/g, ' ').trim().toLowerCase();
  return createHash('sha256').update(normalized).digest('hex').slice(0, 24);
}

export function extractTableNames(sqlText: string): string[] {
  const matches = sqlText.match(/(?:from|join|into|update)\s+["']?([a-zA-Z0-9_\.]+)["']?/gi) ?? [];
  return [...new Set(matches.map((m) => m.split(/\s+/).pop()?.replace(/["']/g, '') ?? '').filter(Boolean))];
}

export function suggestIndex(tableName: string, columns: string[]): { recommendationKey: string; indexSql: string; reason: string } {
  const cols = columns.length ? columns : ['id'];
  const key = `idx_${tableName}_${cols.join('_')}`.slice(0, 100);
  return {
    recommendationKey: key,
    indexSql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${key} ON ${tableName} (${cols.join(', ')});`,
    reason: `Consultas lentas detectadas sobre ${tableName} filtrando por ${cols.join(', ')}`,
  };
}

export function improvementPct(beforeMs: number, afterMs: number): number {
  if (beforeMs <= 0) return 0;
  return ((beforeMs - afterMs) / beforeMs) * 100;
}
