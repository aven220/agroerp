import { apiRequest } from './client';

export function getEpscmCollabCenter() {
  return apiRequest<Record<string, unknown>>('/epscm/collab/center');
}

export function bootstrapEpscmCollab() {
  return apiRequest<unknown>('/epscm/collab/bootstrap', { method: 'POST', body: '{}' });
}

export function listEpscmCollabPartners() {
  return apiRequest<unknown[]>('/epscm/collab/partners');
}

export function getEpscmCollabSupplierPortal(partnerKey: string) {
  return apiRequest<Record<string, unknown>>(`/epscm/collab/suppliers/${encodeURIComponent(partnerKey)}/portal`);
}

export function syncEpscmCollabSupplierOrders(partnerKey: string) {
  return apiRequest<unknown>(`/epscm/collab/suppliers/${encodeURIComponent(partnerKey)}/sync-orders`, { method: 'POST', body: '{}' });
}

export function getEpscmCollabOperatorPortal(partnerKey: string) {
  return apiRequest<Record<string, unknown>>(`/epscm/collab/operators/${encodeURIComponent(partnerKey)}/portal`);
}

export function getEpscmCollabSlaCenter() {
  return apiRequest<Record<string, unknown>>('/epscm/collab/sla');
}

export function getEpscmCollabCollaboration() {
  return apiRequest<Record<string, unknown>>('/epscm/collab/collaboration');
}

export function listEpscmCollabTasks() {
  return apiRequest<unknown[]>('/epscm/collab/tasks');
}

export function getEpscmCollabExecutiveDashboard() {
  return apiRequest<Record<string, unknown>>('/epscm/collab/dashboard/executive');
}

export function getEpscmCollabComplianceDashboard() {
  return apiRequest<Record<string, unknown>>('/epscm/collab/dashboard/compliance');
}

export function computeEpscmCollabAnalytics() {
  return apiRequest<Record<string, unknown>>('/epscm/collab/analytics/compute', { method: 'POST', body: '{}' });
}

export function listEpscmCollabSimulations() {
  return apiRequest<unknown[]>('/epscm/collab/simulations');
}

export function createEpscmCollabSimulation(body: Record<string, unknown>) {
  return apiRequest<unknown>('/epscm/collab/simulations', { method: 'POST', body: JSON.stringify(body) });
}

export function runEpscmCollabSimulation(simulationKey: string) {
  return apiRequest<unknown>(`/epscm/collab/simulations/${encodeURIComponent(simulationKey)}/run`, { method: 'POST', body: '{}' });
}
