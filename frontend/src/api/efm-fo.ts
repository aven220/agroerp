import { apiRequest } from './client';

export function getEfmFoCenter() {
  return apiRequest<Record<string, unknown>>('/efm/fo/center');
}

export function seedEfmFo() {
  return apiRequest<unknown>('/efm/fo/seed', { method: 'POST', body: '{}' });
}

export function listEfmFoStatements(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/efm/fo/statements${q}`);
}

export function generateEfmFoStatement(body: Record<string, unknown>) {
  return apiRequest<unknown>('/efm/fo/statements/generate', { method: 'POST', body: JSON.stringify(body) });
}

export function listEfmFoClosings(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/efm/fo/closings${q}`);
}

export function startEfmFoClosing(body: Record<string, unknown>) {
  return apiRequest<unknown>('/efm/fo/closings/start', { method: 'POST', body: JSON.stringify(body) });
}

export function getEfmFoKpiDashboard(periodKey?: string) {
  const q = periodKey ? `?periodKey=${encodeURIComponent(periodKey)}` : '';
  return apiRequest<unknown>(`/efm/fo/kpis/dashboard${q}`);
}

export function calculateEfmFoKpis(periodKey: string) {
  return apiRequest<unknown[]>(`/efm/fo/kpis/calculate?periodKey=${encodeURIComponent(periodKey)}`, { method: 'POST', body: '{}' });
}

export function getEfmFoExecutiveDashboard(periodKey?: string) {
  const q = periodKey ? `?periodKey=${encodeURIComponent(periodKey)}` : '';
  return apiRequest<unknown>(`/efm/fo/dashboard/executive${q}`);
}

export function listEfmFoReports(category?: string) {
  const q = category ? `?category=${encodeURIComponent(category)}` : '';
  return apiRequest<unknown[]>(`/efm/fo/reports${q}`);
}

export function generateEfmFoReport(body: Record<string, unknown>) {
  return apiRequest<unknown>('/efm/fo/reports/generate', { method: 'POST', body: JSON.stringify(body) });
}

export function exportEfmFoReport(reportKey: string, format: string) {
  return apiRequest<unknown>(`/efm/fo/reports/${encodeURIComponent(reportKey)}/export`, {
    method: 'POST',
    body: JSON.stringify({ format }),
  });
}

export function listEfmFoCustomReports() {
  return apiRequest<unknown[]>('/efm/fo/custom-reports');
}

export function listEfmFoAiInsights() {
  return apiRequest<unknown[]>('/efm/fo/ai/insights');
}

export function generateEfmFoAiInsights(periodKey?: string) {
  const q = periodKey ? `?periodKey=${encodeURIComponent(periodKey)}` : '';
  return apiRequest<unknown[]>(`/efm/fo/ai/generate${q}`, { method: 'POST', body: '{}' });
}

export function listEfmFoAlerts(unread = true) {
  return apiRequest<unknown[]>(`/efm/fo/alerts?unread=${unread}`);
}

export function getEfmFoAnalyticsTrend(kpiCode: string, months = 12) {
  return apiRequest<unknown>(`/efm/fo/analytics/trend?kpiCode=${encodeURIComponent(kpiCode)}&months=${months}`);
}

export function getEfmFoAnalyticsProjection(horizonMonths = 12) {
  return apiRequest<unknown[]>(`/efm/fo/analytics/projection?horizonMonths=${horizonMonths}`);
}

export function simulateEfmFoScenario(body: Record<string, unknown>) {
  return apiRequest<unknown>('/efm/fo/scenarios', { method: 'POST', body: JSON.stringify(body) });
}

export function listEfmFoScenarios() {
  return apiRequest<unknown[]>('/efm/fo/scenarios');
}
