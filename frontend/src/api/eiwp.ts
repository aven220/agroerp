import { apiRequest } from './client';

export interface EiwpCenter {
  dashboard: Record<string, unknown>;
  sources: unknown[];
  sectors: unknown[];
  schedules: unknown[];
  stations: unknown[];
  balances: unknown[];
  activeAlerts: unknown[];
}

export function getEiwpCenter() {
  return apiRequest<EiwpCenter>('/eiwp/center');
}

export function bootstrapEiwp() {
  return apiRequest<EiwpCenter>('/eiwp/bootstrap', { method: 'POST' });
}

export function getEiwpDashboard() {
  return apiRequest<unknown>('/eiwp/dashboard');
}

export function listEiwpSources() {
  return apiRequest<unknown[]>('/eiwp/water/sources');
}

export function listEiwpSectors(fieldLotId?: string) {
  const q = fieldLotId ? `?fieldLotId=${fieldLotId}` : '';
  return apiRequest<unknown[]>(`/eiwp/water/sectors${q}`);
}

export function listEiwpSchedules(fieldLotId?: string) {
  const q = fieldLotId ? `?fieldLotId=${fieldLotId}` : '';
  return apiRequest<unknown[]>(`/eiwp/irrigation/schedules${q}`);
}

export function listEiwpStations() {
  return apiRequest<unknown[]>('/eiwp/weather/stations');
}

export function getEiwpClimateSnapshot() {
  return apiRequest<unknown>('/eiwp/weather/snapshot');
}

export function listEiwpBalances(fieldLotId?: string) {
  const q = fieldLotId ? `?fieldLotId=${fieldLotId}` : '';
  return apiRequest<unknown[]>(`/eiwp/balance${q}`);
}

export function listEiwpAlerts(active = true) {
  const q = active ? '?active=true' : '';
  return apiRequest<unknown[]>(`/eiwp/alerts${q}`);
}

export function listEiwpConsumption() {
  return apiRequest<unknown[]>('/eiwp/water/consumption');
}

export function listEiwpForecasts(horizon?: string) {
  const q = horizon ? `?horizon=${horizon}` : '';
  return apiRequest<unknown[]>(`/eiwp/forecasts${q}`);
}

export function listEiwpRecommendations() {
  return apiRequest<unknown[]>('/eiwp/recommendations');
}
