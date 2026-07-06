import { apiRequest } from './client';

export function getEmfgIntelligenceDashboard() {
  return apiRequest<Record<string, unknown>>('/emfg/intelligence/dashboard');
}

export function getEmfgIntelligenceExecutive() {
  return apiRequest<Record<string, unknown>>('/emfg/intelligence/executive');
}

export function getEmfgIntelligenceOee(scope?: string, entityKey?: string) {
  const params = new URLSearchParams();
  if (scope) params.set('scope', scope);
  if (entityKey) params.set('entityKey', entityKey);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/emfg/intelligence/oee${q}`);
}

export function getEmfgIntelligenceOeeHistory(entityKey: string) {
  return apiRequest<unknown[]>(`/emfg/intelligence/oee/history?entityKey=${encodeURIComponent(entityKey)}`);
}

export function getEmfgIntelligenceOeeComparatives() {
  return apiRequest<unknown[]>('/emfg/intelligence/oee/comparatives');
}

export function getEmfgIntelligenceKpis() {
  return apiRequest<Record<string, unknown>>('/emfg/intelligence/kpis');
}

export function getEmfgIntelligenceAnalytics(centerKey?: string, lineKey?: string) {
  const params = new URLSearchParams();
  if (centerKey) params.set('centerKey', centerKey);
  if (lineKey) params.set('lineKey', lineKey);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<Record<string, unknown>>(`/emfg/intelligence/analytics${q}`);
}

export function getEmfgIntelligenceAlerts(unreadOnly?: boolean) {
  const q = unreadOnly ? '?unreadOnly=true' : '';
  return apiRequest<unknown[]>(`/emfg/intelligence/alerts${q}`);
}

export function listEmfgIntelligenceSimulations(authorizedOnly?: boolean) {
  const q = authorizedOnly ? '?authorizedOnly=true' : '';
  return apiRequest<unknown[]>(`/emfg/intelligence/simulations${q}`);
}

export function createEmfgIntelligenceSimulation(body: Record<string, unknown>) {
  return apiRequest<unknown>('/emfg/intelligence/simulations', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function runEmfgIntelligenceSimulation(simulationKey: string) {
  return apiRequest<unknown>(`/emfg/intelligence/simulations/${encodeURIComponent(simulationKey)}/run`, {
    method: 'POST',
    body: '{}',
  });
}

export function compareEmfgIntelligenceSimulations(simulationKeys: string[]) {
  return apiRequest<unknown>('/emfg/intelligence/simulations/compare', {
    method: 'POST',
    body: JSON.stringify({ simulationKeys }),
  });
}

export function runEmfgIntelligenceAggregate() {
  return apiRequest<unknown>('/emfg/intelligence/aggregate', { method: 'POST', body: '{}' });
}

export function computeEmfgIntelligenceOee() {
  return apiRequest<unknown>('/emfg/intelligence/oee/compute', { method: 'POST', body: '{}' });
}

export function exportEmfgIntelligence(exportType: string, format: string, payload: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>('/emfg/intelligence/export', {
    method: 'POST',
    body: JSON.stringify({ exportType, format, payload }),
  });
}

export function getEmfgIntelligenceAiCapabilities() {
  return apiRequest<unknown[]>('/emfg/intelligence/ai/capabilities');
}

export function getEmfgIntelligenceQueryHistory() {
  return apiRequest<unknown[]>('/emfg/intelligence/history/queries');
}

export function getEmfgIntelligenceExportHistory() {
  return apiRequest<unknown[]>('/emfg/intelligence/history/exports');
}
