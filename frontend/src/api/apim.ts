import { apiRequest } from './client';

export interface ApiCenter {
  apiCount: number;
  publishedCount: number;
  connectorCount: number;
  metrics: ApiMetrics;
  health: Array<{ targetRef: string; status: string; latencyMs?: number }>;
  discoveredModules: number;
}

export interface ApiMetrics {
  kpis: {
    requests24h: number;
    requestsMonth: number;
    avgLatencyMs: number;
    errorRatePct: number;
    successRatePct: number;
    availabilityPct: number;
  };
  byClient: Array<{ clientId: string; count: number }>;
  byModule: Array<{ module: string; count: number }>;
  byEndpoint: Array<{ method: string; path: string; count: number }>;
}

export function getApiCenter() {
  return apiRequest<ApiCenter>('/eamip/center');
}

export function listApiCatalog(domain?: string) {
  const q = domain ? `?domain=${domain}` : '';
  return apiRequest<unknown[]>(`/eamip/catalog${q}`);
}

export function listApiDiscovery() {
  return apiRequest<Array<{ moduleRef: string; name: string; basePath: string; domain: string }>>('/eamip/discovery');
}

export function listApiClients() {
  return apiRequest<unknown[]>('/eamip/clients');
}

export function createApiClient(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eamip/clients', { method: 'POST', body: JSON.stringify(data) });
}

export function createApiKey(clientId: string, name: string) {
  return apiRequest<{ apiKey: string; keyPrefix: string }>(`/eamip/clients/${clientId}/keys`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function listApiConnectors() {
  return apiRequest<unknown[]>('/eamip/connectors');
}

export function getApiMetrics() {
  return apiRequest<ApiMetrics>('/eamip/metrics');
}

export function getDeveloperPortal() {
  return apiRequest<unknown>('/eamip/developer-portal');
}

export function createApiDefinition(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eamip/apis', { method: 'POST', body: JSON.stringify(data) });
}

export function publishApi(id: string) {
  return apiRequest<unknown>(`/eamip/apis/${id}/publish`, { method: 'POST' });
}

export function getApiOpenApi(id: string) {
  return apiRequest<Record<string, unknown>>(`/eamip/apis/${id}/openapi`);
}

export function listApiVersions(apiId: string) {
  return apiRequest<unknown[]>(`/eamip/apis/${apiId}/versions`);
}

export function createApiVersion(apiId: string, data: Record<string, unknown>) {
  return apiRequest<unknown>(`/eamip/apis/${apiId}/versions`, { method: 'POST', body: JSON.stringify(data) });
}
