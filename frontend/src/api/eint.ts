import { apiRequest } from './client';

export interface EintCenter {
  dashboard: Record<string, unknown>;
  providers: unknown[];
  assistants: unknown[];
  dimensions: unknown[];
  facts: unknown[];
  etlJobs: unknown[];
  kpiBindings: unknown[];
  reportTemplates: unknown[];
  dashboards: unknown[];
  notificationRules: unknown[];
}

export function getEintCenter() {
  return apiRequest<EintCenter>('/eint/center');
}

export function bootstrapEint() {
  return apiRequest<EintCenter>('/eint/bootstrap', { method: 'POST' });
}

export function listEintAudit(entityType?: string) {
  const q = entityType ? `?entityType=${entityType}` : '';
  return apiRequest<unknown[]>(`/eint/audit${q}`);
}

export function getEintAiCatalog() {
  return apiRequest<unknown>('/eint/ai/catalog');
}

export function listEintProviders() {
  return apiRequest<unknown[]>('/eint/ai/providers');
}

export function registerEintProvider(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eint/ai/providers', { method: 'POST', body: JSON.stringify(data) });
}

export function activateEintProvider(providerKey: string) {
  return apiRequest<unknown>(`/eint/ai/providers/${providerKey}/activate`, { method: 'POST' });
}

export function invokeEintAi(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eint/ai/invoke', { method: 'POST', body: JSON.stringify(data) });
}

export function chatEintAi(message: string) {
  return apiRequest<unknown>('/eint/ai/chat', { method: 'POST', body: JSON.stringify({ message }) });
}

export function getEintConsumption() {
  return apiRequest<unknown>('/eint/ai/consumption');
}

export function getEintAiUsage() {
  return apiRequest<unknown>('/eint/ai/usage');
}

export function listEintAssistants() {
  return apiRequest<unknown[]>('/eint/assistants');
}

export function getEintAssistantCatalog() {
  return apiRequest<unknown[]>('/eint/assistants/catalog');
}

export function chatEintAssistant(assistantKey: string, message: string) {
  return apiRequest<unknown>(`/eint/assistants/${assistantKey}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export function listEintDimensions() {
  return apiRequest<unknown[]>('/eint/dwh/dimensions');
}

export function createEintDimension(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eint/dwh/dimensions', { method: 'POST', body: JSON.stringify(data) });
}

export function listEintFacts() {
  return apiRequest<unknown[]>('/eint/dwh/facts');
}

export function createEintFact(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eint/dwh/facts', { method: 'POST', body: JSON.stringify(data) });
}

export function listEintSnapshots() {
  return apiRequest<unknown[]>('/eint/dwh/snapshots');
}

export function listEintEtlJobs() {
  return apiRequest<unknown[]>('/eint/etl/jobs');
}

export function createEintEtlJob(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eint/etl/jobs', { method: 'POST', body: JSON.stringify(data) });
}

export function runEintEtl(jobKey: string, data: unknown[] = []) {
  return apiRequest<unknown>(`/eint/etl/jobs/${jobKey}/run`, {
    method: 'POST',
    body: JSON.stringify({ data }),
  });
}

export function listEintEtlRuns() {
  return apiRequest<unknown[]>('/eint/etl/runs');
}

export function listEintKpis() {
  return apiRequest<unknown[]>('/eint/bi/kpis');
}

export function listEintEbiapKpis() {
  return apiRequest<unknown[]>('/eint/bi/ebiap-kpis');
}

export function createEintKpi(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eint/bi/kpis', { method: 'POST', body: JSON.stringify(data) });
}

export function runEintBiQuery(query: Record<string, unknown>) {
  return apiRequest<unknown>('/eint/bi/query', { method: 'POST', body: JSON.stringify({ query }) });
}

export function listEintQueryLogs() {
  return apiRequest<unknown[]>('/eint/bi/queries');
}

export function listEintReportTemplates() {
  return apiRequest<unknown[]>('/eint/reports/templates');
}

export function createEintReport(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eint/reports/templates', { method: 'POST', body: JSON.stringify(data) });
}

export function runEintReport(templateKey: string, format: string, filters?: Record<string, unknown>) {
  return apiRequest<unknown>(`/eint/reports/templates/${templateKey}/run`, {
    method: 'POST',
    body: JSON.stringify({ format, filters }),
  });
}

export function listEintReportRuns() {
  return apiRequest<unknown[]>('/eint/reports/runs');
}

export function listEintDashboards() {
  return apiRequest<unknown[]>('/eint/dashboards');
}

export function getEintDashboardCatalog() {
  return apiRequest<unknown[]>('/eint/dashboards/catalog');
}

export function getEintDashboard(dashboardKey: string) {
  return apiRequest<unknown>(`/eint/dashboards/${dashboardKey}`);
}

export function listEintNotificationRules() {
  return apiRequest<unknown[]>('/eint/notifications/rules');
}

export function getEintInbox() {
  return apiRequest<unknown[]>('/eint/notifications/inbox');
}

export function getEintMonitoring() {
  return apiRequest<unknown>('/eint/monitoring/dashboard');
}

export function getEintBridgeModules() {
  return apiRequest<unknown[]>('/eint/bridge/modules');
}
