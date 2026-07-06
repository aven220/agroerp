import { apiRequest } from './client';

export interface EihDashboard {
  totalConnectors: number;
  activeConnectors: number;
  errorConnectors: number;
  totalFlows: number;
  publishedFlows: number;
  syncs24h: number;
  failedSyncs24h: number;
  pendingErrors: number;
  webhooks: number;
  avgDurationMs: number;
  successRate24h: number;
  recentRuns: Array<{
    runKey: string;
    status: string;
    recordsIn: number;
    recordsOut: number;
    durationMs: number | null;
    createdAt: string;
  }>;
}

export interface EihConnector {
  id: string;
  connectorKey: string;
  name: string;
  protocol: string;
  category: string;
  status: string;
  authType: string;
  dataFormat: string;
  syncMode: string;
  endpointUrl?: string;
  lastSyncAt?: string;
  tags: string[];
}

export interface EihFlow {
  id: string;
  flowKey: string;
  name: string;
  status: string;
  syncMode: string;
  steps?: Array<{ stepKey: string; name: string; stepOrder: number }>;
  fieldMappings?: Array<{ sourceField: string; targetField: string }>;
}

export interface EihCenter {
  dashboard: EihDashboard;
  suggestions: Array<Record<string, unknown>>;
  connectors: EihConnector[];
  flows: EihFlow[];
}

export interface EihSyncRun {
  id: string;
  runKey: string;
  status: string;
  syncMode: string;
  recordsIn: number;
  recordsOut: number;
  recordsFailed: number;
  durationMs?: number;
  createdAt: string;
}

export interface EihSyncError {
  id: string;
  errorKey: string;
  status: string;
  message: string;
  retryCount: number;
  createdAt: string;
}

export interface EihCatalogItem {
  catalogKey: string;
  name: string;
  protocol: string;
  category: string;
  description?: string;
}

export function getEihCenter() {
  return apiRequest<EihCenter>('/eih/center');
}

export function listEihConnectors(params?: { status?: string; category?: string }) {
  const q = params ? `?${new URLSearchParams(params as Record<string, string>)}` : '';
  return apiRequest<EihConnector[]>(`/eih/connectors${q}`);
}

export function registerEihConnector(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eih/connectors', { method: 'POST', body: JSON.stringify(data) });
}

export function activateEihConnector(connectorKey: string) {
  return apiRequest<unknown>(`/eih/connectors/${connectorKey}/activate`, { method: 'POST' });
}

export function listEihCatalog() {
  return apiRequest<EihCatalogItem[]>('/eih/catalog');
}

export function listEihFlows(status?: string) {
  const q = status ? `?status=${status}` : '';
  return apiRequest<EihFlow[]>(`/eih/flows${q}`);
}

export function createEihFlow(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eih/flows', { method: 'POST', body: JSON.stringify(data) });
}

export function publishEihFlow(flowKey: string) {
  return apiRequest<unknown>(`/eih/flows/${flowKey}/publish`, { method: 'POST' });
}

export function executeEihFlowSync(flowKey: string, data: Record<string, unknown>[]) {
  return apiRequest<unknown>(`/eih/flows/${flowKey}/sync`, {
    method: 'POST',
    body: JSON.stringify({ data }),
  });
}

export function listEihSyncHistory() {
  return apiRequest<EihSyncRun[]>('/eih/sync/history');
}

export function listEihErrors(status?: string) {
  const q = status ? `?status=${status}` : '';
  return apiRequest<EihSyncError[]>(`/eih/errors${q}`);
}

export function retryEihError(id: string) {
  return apiRequest<unknown>(`/eih/errors/${id}/retry`, { method: 'POST' });
}

export function resolveEihError(id: string) {
  return apiRequest<unknown>(`/eih/errors/${id}/resolve`, { method: 'POST' });
}

export function listEihWebhooks() {
  return apiRequest<unknown[]>('/eih/webhooks');
}

export function getEihBusInfo() {
  return apiRequest<unknown>('/eih/bus');
}

export function suggestEihMappings(sourceFields: string[], targetFields: string[]) {
  return apiRequest<unknown>('/eih/ai/suggest-mappings', {
    method: 'POST',
    body: JSON.stringify({ sourceFields, targetFields }),
  });
}

export function listEihAudit(entityKey?: string) {
  const q = entityKey ? `?entityKey=${entityKey}` : '';
  return apiRequest<unknown[]>(`/eih/audit${q}`);
}
