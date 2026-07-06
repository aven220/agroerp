import { apiRequest } from './client';

export function getHpaPersonalDashboard(employeeKey?: string) {
  const q = employeeKey ? `?employeeKey=${encodeURIComponent(employeeKey)}` : '';
  return apiRequest<Record<string, unknown>>(`/portal/analytics/personal-dashboard${q}`);
}

export function getHpaKpis(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<Record<string, unknown>>(`/portal/analytics/kpis${q}`);
}

export function getHpaAnalyticsCenter(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<Record<string, unknown>>(`/portal/analytics/center${q}`);
}

export function exportHpaAnalytics(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<Record<string, unknown>>(`/portal/analytics/export${q}`, { method: 'POST', body: '{}' });
}

export function getHpaNotifications(employeeKey?: string) {
  const q = employeeKey ? `?employeeKey=${encodeURIComponent(employeeKey)}` : '';
  return apiRequest<unknown[]>(`/portal/analytics/notifications${q}`);
}

export function getHpaAiPanel(employeeKey?: string) {
  const q = employeeKey ? `?employeeKey=${encodeURIComponent(employeeKey)}` : '';
  return apiRequest<Record<string, unknown>>(`/portal/analytics/ai${q}`);
}

export function getHpaAiCapabilities() {
  return apiRequest<Record<string, unknown>>('/portal/analytics/ai/capabilities');
}
