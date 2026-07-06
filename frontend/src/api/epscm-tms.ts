import { apiRequest } from './client';

export function getEpscmTmsCenter() {
  return apiRequest<Record<string, unknown>>('/epscm/tms/center');
}

export function bootstrapEpscmTms() {
  return apiRequest<unknown>('/epscm/tms/bootstrap', { method: 'POST', body: '{}' });
}

export function getEpscmTmsLogisticsDashboard() {
  return apiRequest<Record<string, unknown>>('/epscm/tms/dashboard/logistics');
}

export function getEpscmTmsCostDashboard() {
  return apiRequest<Record<string, unknown>>('/epscm/tms/dashboard/costs');
}

export function listEpscmTmsVehicles() {
  return apiRequest<unknown[]>('/epscm/tms/fleet/vehicles');
}

export function listEpscmTmsDrivers() {
  return apiRequest<unknown[]>('/epscm/tms/drivers');
}

export function listEpscmTmsRoutes() {
  return apiRequest<unknown[]>('/epscm/tms/routes');
}

export function createEpscmTmsRoute(body: Record<string, unknown>) {
  return apiRequest<unknown>('/epscm/tms/routes', { method: 'POST', body: JSON.stringify(body) });
}

export function optimizeEpscmTmsRoute(routeKey: string, body: Record<string, unknown>) {
  return apiRequest<unknown>(`/epscm/tms/routes/${encodeURIComponent(routeKey)}/optimize`, {
    method: 'POST', body: JSON.stringify(body),
  });
}

export function listEpscmTmsTrips(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<unknown[]>(`/epscm/tms/trips${q}`);
}

export function scheduleEpscmTmsTrip(body: Record<string, unknown>) {
  return apiRequest<unknown>('/epscm/tms/trips', { method: 'POST', body: JSON.stringify(body) });
}

export function startEpscmTmsTrip(tripKey: string) {
  return apiRequest<unknown>(`/epscm/tms/trips/${encodeURIComponent(tripKey)}/start`, {
    method: 'POST', body: '{}',
  });
}

export function listEpscmTmsDeliveries(tripKey?: string) {
  const q = tripKey ? `?tripKey=${encodeURIComponent(tripKey)}` : '';
  return apiRequest<unknown[]>(`/epscm/tms/deliveries${q}`);
}

export function listEpscmTmsPods() {
  return apiRequest<unknown[]>('/epscm/tms/pod');
}

export function listEpscmTmsCosts() {
  return apiRequest<unknown[]>('/epscm/tms/costs');
}

export function recordEpscmTmsCost(body: Record<string, unknown>) {
  return apiRequest<unknown>('/epscm/tms/costs', { method: 'POST', body: JSON.stringify(body) });
}
