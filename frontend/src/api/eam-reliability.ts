import { apiRequest } from './client';

export function getEamReliabilityCenter() {
  return apiRequest<Record<string, unknown>>('/eam/reliability/center');
}

export function bootstrapEamReliability() {
  return apiRequest<unknown>('/eam/reliability/bootstrap', { method: 'POST', body: '{}' });
}

export function computeEamReliabilityIndicators() {
  return apiRequest<unknown>('/eam/reliability/indicators/compute', { method: 'POST', body: '{}' });
}

export function getEamExecutiveDashboard() {
  return apiRequest<Record<string, unknown>>('/eam/reliability/dashboard/executive');
}

export function getEamEnergyDashboard() {
  return apiRequest<Record<string, unknown>>('/eam/reliability/dashboard/energy');
}

export function getEamIndicatorsPanel() {
  return apiRequest<Record<string, unknown>>('/eam/reliability/dashboard/indicators');
}

export function getEamAnalytics() {
  return apiRequest<Record<string, unknown>>('/eam/reliability/analytics');
}

export function computeEamAnalytics() {
  return apiRequest<unknown>('/eam/reliability/analytics/compute', { method: 'POST', body: '{}' });
}

export function listEamSimulations() {
  return apiRequest<unknown[]>('/eam/reliability/simulations');
}

export function getEamIotPanel() {
  return apiRequest<Record<string, unknown>>('/eam/reliability/iot/panel');
}

export function listEamConditionReadings(assetKey?: string) {
  const q = assetKey ? `?assetKey=${encodeURIComponent(assetKey)}` : '';
  return apiRequest<unknown[]>(`/eam/reliability/condition/readings${q}`);
}

export function listEamRelAlerts(unread = true) {
  return apiRequest<unknown[]>(`/eam/reliability/alerts?unread=${unread}`);
}

export function listEamPredictiveSlots() {
  return apiRequest<unknown[]>('/eam/reliability/predictive/slots');
}
