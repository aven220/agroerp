import { apiRequest } from './client';

export interface BiDashboard {
  id: string;
  dashboardKey: string;
  name: string;
  description?: string | null;
  category: string;
  status: string;
  isSystem: boolean;
  layout: Record<string, unknown>;
  settings: Record<string, unknown>;
  versions?: Array<{ id: string; version: number; definition: BiDashboardDefinition; status: string }>;
}

export interface BiWidgetDefinition {
  id: string;
  type: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  query?: Record<string, unknown>;
  kpiKey?: string;
  config?: Record<string, unknown>;
}

export interface BiDashboardDefinition {
  version: number;
  widgets: BiWidgetDefinition[];
  settings?: Record<string, unknown>;
}

export interface BiKpi {
  id: string;
  kpiKey: string;
  name: string;
  description?: string | null;
  targetValue?: number | null;
  goalValue?: number | null;
  frequency: string;
  color?: string | null;
  unit?: string | null;
  active: boolean;
  history?: Array<{ value: number; variancePct?: number | null; capturedAt: string }>;
}

export interface BiReport {
  id: string;
  reportKey: string;
  name: string;
  description?: string | null;
  status: string;
  queryDef: Record<string, unknown>;
  version: number;
}

export interface BiCenter {
  executive: Record<string, unknown>;
  dashboardCount: number;
  kpiCount: number;
  reportCount: number;
  categories: Record<string, number>;
  aiReadiness: Record<string, boolean>;
}

export interface ResolvedWidget {
  type: string;
  title: string;
  data: Record<string, unknown> | null;
}

export const BI_WIDGET_TYPES = [
  'kpi', 'indicator', 'bar', 'line', 'area', 'pie', 'radar', 'treemap',
  'heatmap', 'gauge', 'funnel', 'table', 'card', 'calendar', 'map', 'timeline', 'realtime',
] as const;

export const BI_CATEGORIES = [
  'executive', 'financial', 'commercial', 'operational', 'agronomic',
  'purchases', 'inventory', 'quality', 'producers', 'gis', 'ai', 'custom',
] as const;

export const BI_DATA_SOURCES = [
  'producers', 'farms', 'lots', 'form_submissions', 'workflows', 'events',
  'lot_twins', 'farm_twins', 'kpi_history', 'notifications',
] as const;

export const BI_REPORT_FORMATS = ['excel', 'csv', 'pdf', 'ods', 'json', 'xml'] as const;

export function getBiCenter() {
  return apiRequest<BiCenter>('/ebiap/center');
}

export function getBiRealtime() {
  return apiRequest<Record<string, unknown>>('/ebiap/realtime');
}

export function listBiDashboards(params?: { category?: string; status?: string }) {
  const q = new URLSearchParams();
  if (params?.category) q.set('category', params.category);
  if (params?.status) q.set('status', params.status);
  const qs = q.toString();
  return apiRequest<BiDashboard[]>(`/ebiap/dashboards${qs ? `?${qs}` : ''}`);
}

export function getBiDashboard(id: string) {
  return apiRequest<BiDashboard>(`/ebiap/dashboards/${id}`);
}

export function getBiCategoryData(category: string) {
  return apiRequest<Record<string, unknown>>(`/ebiap/dashboards/category/${category}`);
}

export function createBiDashboard(data: {
  dashboardKey: string;
  name: string;
  description?: string;
  category?: string;
  definition?: BiDashboardDefinition;
}) {
  return apiRequest<BiDashboard>('/ebiap/dashboards', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateBiDashboard(id: string, data: Partial<{
  name: string;
  description: string;
  category: string;
  definition: BiDashboardDefinition;
}>) {
  return apiRequest<BiDashboard>(`/ebiap/dashboards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteBiDashboard(id: string) {
  return apiRequest<void>(`/ebiap/dashboards/${id}`, { method: 'DELETE' });
}

export function duplicateBiDashboard(id: string, data?: { dashboardKey?: string; name?: string }) {
  return apiRequest<BiDashboard>(`/ebiap/dashboards/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
  });
}

export function publishBiDashboard(id: string, changelog?: string) {
  return apiRequest<BiDashboard>(`/ebiap/dashboards/${id}/publish`, {
    method: 'POST',
    body: JSON.stringify({ changelog }),
  });
}

export function shareBiDashboard(id: string, sharedWith: string, permission: 'read' | 'write' = 'read') {
  return apiRequest<unknown>(`/ebiap/dashboards/${id}/share`, {
    method: 'POST',
    body: JSON.stringify({ sharedWith, permission }),
  });
}

export function resolveBiWidgets(widgets: BiWidgetDefinition[], category?: string) {
  return apiRequest<ResolvedWidget[]>('/ebiap/widgets/resolve', {
    method: 'POST',
    body: JSON.stringify({ widgets, category }),
  });
}

export function listBiKpis() {
  return apiRequest<BiKpi[]>('/ebiap/kpis');
}

export function getBiKpi(id: string) {
  return apiRequest<BiKpi>(`/ebiap/kpis/${id}`);
}

export function createBiKpi(data: Record<string, unknown>) {
  return apiRequest<BiKpi>('/ebiap/kpis', { method: 'POST', body: JSON.stringify(data) });
}

export function updateBiKpi(id: string, data: Record<string, unknown>) {
  return apiRequest<BiKpi>(`/ebiap/kpis/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function captureBiKpi(id: string, value?: number) {
  return apiRequest<unknown>(`/ebiap/kpis/${id}/capture`, {
    method: 'POST',
    body: JSON.stringify(value !== undefined ? { value } : {}),
  });
}

export function getBiKpiHistory(id: string) {
  return apiRequest<Array<{ value: number; capturedAt: string; variancePct?: number }>>(`/ebiap/kpis/${id}/history`);
}

export function listBiReports() {
  return apiRequest<BiReport[]>('/ebiap/reports');
}

export function createBiReport(data: Record<string, unknown>) {
  return apiRequest<BiReport>('/ebiap/reports', { method: 'POST', body: JSON.stringify(data) });
}

export function runBiReport(id: string, format = 'json', parameters?: Record<string, unknown>) {
  return apiRequest<{ run: unknown; export: { content: string; mimeType: string; format: string } }>(
    `/ebiap/reports/${id}/run`,
    { method: 'POST', body: JSON.stringify({ format, parameters }) },
  );
}

export function previewBiQuery(definition: Record<string, unknown>) {
  return apiRequest<{ rows: Record<string, unknown>[]; columns: Array<{ key: string; label: string }> }>(
    '/ebiap/queries/preview',
    { method: 'POST', body: JSON.stringify({ definition }) },
  );
}

export function executeBiQuery(definition: Record<string, unknown>) {
  return apiRequest<{ rows: Record<string, unknown>[]; columns: Array<{ key: string; label: string }> }>(
    '/ebiap/queries/execute',
    { method: 'POST', body: JSON.stringify({ definition }) },
  );
}

export function listBiQueries() {
  return apiRequest<Array<{ id: string; queryKey: string; name: string; dataSource: string }>>('/ebiap/queries');
}

export function createBiQuery(data: Record<string, unknown>) {
  return apiRequest<unknown>('/ebiap/queries', { method: 'POST', body: JSON.stringify(data) });
}

export function downloadExport(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
