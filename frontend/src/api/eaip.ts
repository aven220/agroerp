import { apiRequest } from './client';

export interface EaipCenter {
  dashboard: Record<string, unknown>;
  models: unknown[];
  predictions: unknown[];
  recommendations: unknown[];
  simulations: unknown[];
}

export function getEaipCenter() {
  return apiRequest<EaipCenter>('/eaip/center');
}

export function bootstrapEaip() {
  return apiRequest<EaipCenter>('/eaip/bootstrap', { method: 'POST' });
}

export function getEaipDashboard() {
  return apiRequest<unknown>('/eaip/dashboard');
}

export function listEaipModels(serviceType?: string) {
  const q = serviceType ? `?serviceType=${serviceType}` : '';
  return apiRequest<unknown[]>(`/eaip/models${q}`);
}

export function registerEaipModel(body: Record<string, unknown>) {
  return apiRequest<unknown>('/eaip/models', { method: 'POST', body: JSON.stringify(body) });
}

export function activateEaipModel(modelKey: string) {
  return apiRequest<unknown>(`/eaip/models/${modelKey}/activate`, { method: 'POST' });
}

export function deactivateEaipModel(modelKey: string) {
  return apiRequest<unknown>(`/eaip/models/${modelKey}/deactivate`, { method: 'POST' });
}

export function listEaipExecutions() {
  return apiRequest<unknown[]>('/eaip/models/executions');
}

export function listEaipPredictions(serviceType?: string) {
  const q = serviceType ? `?serviceType=${serviceType}` : '';
  return apiRequest<unknown[]>(`/eaip/predictions${q}`);
}

export function runEaipPrediction(body: Record<string, unknown>) {
  return apiRequest<unknown>('/eaip/predictions', { method: 'POST', body: JSON.stringify(body) });
}

export function listEaipRecommendations(category?: string) {
  const q = category ? `?category=${category}` : '';
  return apiRequest<unknown[]>(`/eaip/recommendations${q}`);
}

export function generateEaipRecommendation(body: Record<string, unknown>) {
  return apiRequest<unknown>('/eaip/recommendations', { method: 'POST', body: JSON.stringify(body) });
}

export function listEaipSimulations() {
  return apiRequest<unknown[]>('/eaip/simulations');
}

export function runEaipSimulation(body: Record<string, unknown>) {
  return apiRequest<unknown>('/eaip/simulations', { method: 'POST', body: JSON.stringify(body) });
}

export function compareEaipSimulation(simulationKey: string) {
  return apiRequest<unknown>(`/eaip/simulations/${simulationKey}/compare`);
}

export function listEaipTwins(entityType?: string) {
  const q = entityType ? `?entityType=${entityType}` : '';
  return apiRequest<unknown[]>(`/eaip/twins${q}`);
}

export function listEaipAssistantSessions() {
  return apiRequest<unknown[]>('/eaip/assistant/sessions');
}

export function createEaipAssistantSession(title: string) {
  return apiRequest<unknown>('/eaip/assistant/sessions', { method: 'POST', body: JSON.stringify({ title }) });
}

export function sendEaipAssistantMessage(sessionKey: string, content: string) {
  return apiRequest<unknown>(`/eaip/assistant/sessions/${sessionKey}/messages`, { method: 'POST', body: JSON.stringify({ content }) });
}

export function getEaipAssistantMessages(sessionKey: string) {
  return apiRequest<unknown[]>(`/eaip/assistant/sessions/${sessionKey}/messages`);
}

export function getEaipProductivity() {
  return apiRequest<unknown>('/eaip/analytics/productivity');
}

export function listEaipAnalyticsSnapshots(category?: string) {
  const q = category ? `?category=${category}` : '';
  return apiRequest<unknown[]>(`/eaip/analytics/snapshots${q}`);
}

export function listEaipAudit(entityType?: string) {
  const q = entityType ? `?entityType=${entityType}` : '';
  return apiRequest<unknown[]>(`/eaip/audit${q}`);
}
