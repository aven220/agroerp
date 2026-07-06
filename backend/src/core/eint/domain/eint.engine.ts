import { EintEtlMode, EintRunStatus } from '@agroerp/prisma-eint-client';

export function generateEintKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

export const EINT_AI_VENDORS = [
  { vendor: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini'] },
  { vendor: 'anthropic', name: 'Anthropic', models: ['claude-3-5-sonnet', 'claude-3-haiku'] },
  { vendor: 'google', name: 'Google AI', models: ['gemini-1.5-pro', 'gemini-1.5-flash'] },
  { vendor: 'ollama', name: 'Ollama (local)', models: ['llama3', 'mistral'] },
  { vendor: 'custom', name: 'Custom endpoint', models: ['custom'] },
  { vendor: 'fallback', name: 'Enterprise fallback', models: ['rules-engine'] },
];

export const EINT_AI_SERVICES = [
  'classification', 'extraction', 'summarization', 'generation', 'chat',
  'semantic_search', 'recommendation', 'prediction', 'sentiment', 'translation',
  'ocr', 'embeddings', 'document_analysis', 'correction',
] as const;

export const EINT_ASSISTANTS = [
  { assistantKey: 'AST-PURCHASES', name: 'Asistente Compras', moduleRef: 'cpep', domain: 'purchases' },
  { assistantKey: 'AST-SALES', name: 'Asistente Ventas', moduleRef: 'escm', domain: 'sales' },
  { assistantKey: 'AST-CRM', name: 'Asistente CRM', moduleRef: 'escm', domain: 'crm' },
  { assistantKey: 'AST-INVENTORY', name: 'Asistente Inventario', moduleRef: 'eims', domain: 'inventory' },
  { assistantKey: 'AST-MFG', name: 'Asistente Manufactura', moduleRef: 'emfg', domain: 'manufacturing' },
  { assistantKey: 'AST-SCM', name: 'Asistente SCM', moduleRef: 'epscm', domain: 'scm' },
  { assistantKey: 'AST-EAM', name: 'Asistente EAM', moduleRef: 'eam', domain: 'eam' },
  { assistantKey: 'AST-HR', name: 'Asistente RR.HH.', moduleRef: 'hcm', domain: 'hr' },
  { assistantKey: 'AST-FINANCE', name: 'Asistente Finanzas', moduleRef: 'efm', domain: 'finance' },
  { assistantKey: 'AST-ACCOUNTING', name: 'Asistente Contabilidad', moduleRef: 'efm', domain: 'accounting' },
  { assistantKey: 'AST-DOCS', name: 'Asistente Documentos', moduleRef: 'egsip', domain: 'documents' },
  { assistantKey: 'AST-ADMIN', name: 'Asistente Administración', moduleRef: 'core', domain: 'admin' },
];

export const EINT_DASHBOARD_CATALOG = [
  { dashboardKey: 'DB-EXEC', name: 'Dashboard Ejecutivo Corporativo', category: 'executive' },
  { dashboardKey: 'DB-FIN', name: 'Dashboard Financiero', category: 'financial' },
  { dashboardKey: 'DB-COM', name: 'Dashboard Comercial', category: 'commercial' },
  { dashboardKey: 'DB-OPS', name: 'Dashboard Operativo', category: 'operational' },
  { dashboardKey: 'DB-LOG', name: 'Dashboard Logístico', category: 'logistics' },
  { dashboardKey: 'DB-MFG', name: 'Dashboard Manufactura', category: 'manufacturing' },
  { dashboardKey: 'DB-HR', name: 'Dashboard RR.HH.', category: 'hr' },
  { dashboardKey: 'DB-IT', name: 'Dashboard TI', category: 'it' },
  { dashboardKey: 'DB-CUSTOM', name: 'Dashboard Personalizable', category: 'custom' },
];

export const EINT_KPI_CATEGORIES = [
  'corporate', 'operational', 'financial', 'commercial', 'logistics', 'hr', 'manufacturing',
];

export function aggregateEintIndicators(data: {
  aiCalls24h: number;
  aiCost24h: number;
  queries24h: number;
  reports24h: number;
  etlRuns24h: number;
  notifications24h: number;
  failedJobs24h: number;
}) {
  const reliability = data.etlRuns24h > 0
    ? Math.round(((data.etlRuns24h - data.failedJobs24h) / data.etlRuns24h) * 100)
    : 100;
  return {
    aiCalls24h: data.aiCalls24h,
    aiCost24h: Math.round(data.aiCost24h * 100) / 100,
    queries24h: data.queries24h,
    reports24h: data.reports24h,
    etlRuns24h: data.etlRuns24h,
    notifications24h: data.notifications24h,
    reliabilityPct: reliability,
    healthScore: Math.max(0, reliability - data.failedJobs24h),
  };
}

export function checkQuota(used: number, quota: number): { allowed: boolean; remaining: number } {
  const remaining = Math.max(0, quota - used);
  return { allowed: used < quota, remaining };
}

export function selectFallbackProvider(
  providers: Array<{ providerKey: string; fallbackOrder: number; status: string }>,
): string | null {
  const active = providers
    .filter((p) => p.status === 'active')
    .sort((a, b) => a.fallbackOrder - b.fallbackOrder);
  return active[0]?.providerKey ?? null;
}

export function transformEtlRecords(
  records: Array<Record<string, unknown>>,
  mapping: Record<string, string>,
): Array<Record<string, unknown>> {
  return records.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [target, source] of Object.entries(mapping)) {
      out[target] = row[source.replace(/^\$/, '')];
    }
    return { ...row, ...out };
  });
}

export function partitionKey(date: Date, granularity: 'day' | 'month' | 'year' = 'month'): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  if (granularity === 'year') return `${y}`;
  if (granularity === 'day') return `${y}-${m}-${d}`;
  return `${y}-${m}`;
}

export function computeTrend(values: number[]): { direction: 'up' | 'down' | 'flat'; pct: number } {
  if (values.length < 2) return { direction: 'flat', pct: 0 };
  const prev = values[values.length - 2];
  const curr = values[values.length - 1];
  if (prev === 0) return { direction: 'flat', pct: 0 };
  const pct = Math.round(((curr - prev) / Math.abs(prev)) * 100);
  if (pct > 0) return { direction: 'up', pct };
  if (pct < 0) return { direction: 'down', pct: Math.abs(pct) };
  return { direction: 'flat', pct: 0 };
}

export function mapRunStatus(success: boolean): EintRunStatus {
  return success ? 'completed' : 'failed';
}
