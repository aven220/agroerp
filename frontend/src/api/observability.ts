import { apiRequest } from './client';

export interface EopDashboard {
  logs24h: number;
  errors24h: number;
  openAlerts: number;
  openIncidents: number;
  traces24h: number;
  mobileEvents: number;
  health: string;
  metrics: {
    summary: Record<string, { avg: number; max: number; min: number; count: number }>;
    byModule: Array<{ moduleKey: string | null; count: number; avg: number | null }>;
    byApi: Array<{ apiPath: string | null; count: number; avg: number | null }>;
    sampleCount: number;
  };
  ai: {
    requests: number;
    tokensIn: number;
    tokensOut: number;
    costUsd: number;
    avgDurationMs: number;
    errorRate: number;
  };
  serviceMap: { nodes: number; edges: number };
}

export interface EopAlert {
  id: string;
  alertKey: string;
  title: string;
  message: string;
  severity: string;
  status: string;
  component?: string;
  createdAt: string;
}

export interface EopIncident {
  id: string;
  incidentKey: string;
  title: string;
  status: string;
  severity: string;
  timeline?: unknown[];
  createdAt: string;
  updatedAt: string;
}

export interface EopLogEntry {
  id: string;
  level: string;
  component: string;
  serviceName: string;
  message: string;
  recordedAt: string;
}

export interface EopServiceMap {
  nodes: Array<{ id: string; key: string; name: string; component: string; status: string }>;
  edges: Array<{ id: string; source: string; target: string; type: string; latencyMsAvg?: number }>;
}

export function getEopCenter() {
  return apiRequest<EopDashboard>('/eop/center');
}

export function listEopLogs(params?: { level?: string; component?: string }) {
  const q = params ? `?${new URLSearchParams(params as Record<string, string>)}` : '';
  return apiRequest<EopLogEntry[]>(`/eop/logs${q}`);
}

export function listEopMetricsDashboard() {
  return apiRequest<EopDashboard['metrics']>('/eop/metrics/dashboard');
}

export function getEopHealth() {
  return apiRequest<{ status: string; checks: unknown[] }>('/eop/health');
}

export function listEopAlerts(all?: boolean) {
  return apiRequest<EopAlert[]>(`/eop/alerts${all ? '?all=true' : ''}`);
}

export function acknowledgeEopAlert(id: string) {
  return apiRequest<unknown>(`/eop/alerts/${id}/acknowledge`, { method: 'POST' });
}

export function resolveEopAlert(id: string) {
  return apiRequest<unknown>(`/eop/alerts/${id}/resolve`, { method: 'POST' });
}

export function listEopIncidents(status?: string) {
  const q = status ? `?status=${status}` : '';
  return apiRequest<EopIncident[]>(`/eop/incidents${q}`);
}

export function getEopIncidentTimeline() {
  return apiRequest<EopIncident[]>('/eop/incidents/timeline');
}

export function openEopIncident(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eop/incidents', { method: 'POST', body: JSON.stringify(data) });
}

export function updateEopIncidentStatus(incidentKey: string, status: string, note?: string) {
  return apiRequest<unknown>(`/eop/incidents/${incidentKey}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note }),
  });
}

export function getEopServiceMap() {
  return apiRequest<EopServiceMap>('/eop/service-map');
}

export function listEopErrors() {
  return apiRequest<unknown[]>('/eop/errors');
}

export function getEopAiSummary() {
  return apiRequest<EopDashboard['ai']>('/eop/ai');
}

export function listEopTraces() {
  return apiRequest<unknown[]>('/eop/traces');
}

export function ingestEopRum(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eop/rum', { method: 'POST', body: JSON.stringify(data) });
}
