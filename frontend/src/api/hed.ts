import { apiRequest } from './client';

export function getHedDashboard(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<Record<string, unknown>>(`/hcm/executive-dashboard${q}`);
}

export function getHedKpis(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<Record<string, unknown>>(`/hcm/executive-dashboard/kpis${q}`);
}

export function getHedCharts(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<Record<string, unknown>>(`/hcm/executive-dashboard/charts${q}`);
}

export function exportHedDashboard(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<Record<string, unknown>>(`/hcm/executive-dashboard/export${q}`, {
    method: 'POST',
    body: '{}',
  });
}
