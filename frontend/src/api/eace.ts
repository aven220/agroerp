import { apiRequest } from './client';

export interface EaceCenter {
  dashboard: Record<string, unknown>;
  producers: unknown[];
  collaborativeOrgs: unknown[];
  contracts: unknown[];
}

export function getEaceCenter() {
  return apiRequest<EaceCenter>('/eace/center');
}

export function bootstrapEace() {
  return apiRequest<EaceCenter>('/eace/bootstrap', { method: 'POST' });
}

export function getEaceDashboard() {
  return apiRequest<unknown>('/eace/dashboard');
}

export function listEaceProducers() {
  return apiRequest<unknown[]>('/eace/producers');
}

export function getEaceProducer(profileKey: string) {
  return apiRequest<unknown>(`/eace/producers/${profileKey}`);
}

export function registerEaceProducer(body: Record<string, unknown>) {
  return apiRequest<unknown>('/eace/producers', { method: 'POST', body: JSON.stringify(body) });
}

export function listEaceCooperatives(orgType?: string) {
  const q = orgType ? `?orgType=${orgType}` : '';
  return apiRequest<unknown[]>(`/eace/cooperatives${q}`);
}

export function createEaceCooperative(body: Record<string, unknown>) {
  return apiRequest<unknown>('/eace/cooperatives', { method: 'POST', body: JSON.stringify(body) });
}

export function listEaceContracts(status?: string) {
  const q = status ? `?status=${status}` : '';
  return apiRequest<unknown[]>(`/eace/contracts${q}`);
}

export function createEaceContract(body: Record<string, unknown>) {
  return apiRequest<unknown>('/eace/contracts', { method: 'POST', body: JSON.stringify(body) });
}

export function listEaceContractors(contractorType?: string) {
  const q = contractorType ? `?contractorType=${contractorType}` : '';
  return apiRequest<unknown[]>(`/eace/contractors${q}`);
}

export function listEaceAdvisors() {
  return apiRequest<unknown[]>('/eace/advisors');
}

export function listEaceVisits(advisorKey?: string) {
  const q = advisorKey ? `?advisorKey=${advisorKey}` : '';
  return apiRequest<unknown[]>(`/eace/visits${q}`);
}

export function scheduleEaceVisit(advisorKey: string, body: Record<string, unknown>) {
  return apiRequest<unknown>(`/eace/advisors/${advisorKey}/visits`, { method: 'POST', body: JSON.stringify(body) });
}

export function listEaceMarketplace(listingType?: string) {
  const q = listingType ? `?listingType=${listingType}` : '';
  return apiRequest<unknown[]>(`/eace/marketplace${q}`);
}

export function listEaceKnowledge(itemType?: string) {
  const q = itemType ? `?itemType=${itemType}` : '';
  return apiRequest<unknown[]>(`/eace/knowledge${q}`);
}

export function getEaceExecutive() {
  return apiRequest<unknown>('/eace/executive');
}

export function listEaceNotifications(recipientRef?: string) {
  const q = recipientRef ? `?recipientRef=${recipientRef}` : '';
  return apiRequest<unknown[]>(`/eace/notifications${q}`);
}

export function getEaceApiManifest() {
  return apiRequest<unknown>('/eace/api/manifest');
}

export function listEaceAudit(entityType?: string) {
  const q = entityType ? `?entityType=${entityType}` : '';
  return apiRequest<unknown[]>(`/eace/audit${q}`);
}
