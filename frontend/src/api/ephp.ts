import { apiRequest } from './client';

export interface EphpCenter {
  dashboard: Record<string, unknown>;
  pestCatalog: unknown[];
  diseaseCatalog: unknown[];
  treatments: unknown[];
  ipmPlans: unknown[];
  frameworks: unknown[];
  activeAlerts: unknown[];
}

export function getEphpCenter() {
  return apiRequest<EphpCenter>('/ephp/center');
}

export function bootstrapEphp() {
  return apiRequest<EphpCenter>('/ephp/bootstrap', { method: 'POST' });
}

export function getEphpDashboard() {
  return apiRequest<unknown>('/ephp/dashboard');
}

export function listEphpPestCatalog() {
  return apiRequest<unknown[]>('/ephp/pests/catalog');
}

export function listEphpPestRecords(fieldLotId?: string) {
  const q = fieldLotId ? `?fieldLotId=${fieldLotId}` : '';
  return apiRequest<unknown[]>(`/ephp/pests/records${q}`);
}

export function listEphpDiseaseCatalog() {
  return apiRequest<unknown[]>('/ephp/diseases/catalog');
}

export function listEphpMonitoring(fieldLotId?: string) {
  const q = fieldLotId ? `?fieldLotId=${fieldLotId}` : '';
  return apiRequest<unknown[]>(`/ephp/monitoring${q}`);
}

export function listEphpTreatments(fieldLotId?: string) {
  const q = fieldLotId ? `?fieldLotId=${fieldLotId}` : '';
  return apiRequest<unknown[]>(`/ephp/treatments${q}`);
}

export function listEphpApplications(fieldLotId?: string) {
  const q = fieldLotId ? `?fieldLotId=${fieldLotId}` : '';
  return apiRequest<unknown[]>(`/ephp/applications${q}`);
}

export function listEphpIpmPlans(fieldLotId?: string) {
  const q = fieldLotId ? `?fieldLotId=${fieldLotId}` : '';
  return apiRequest<unknown[]>(`/ephp/ipm/plans${q}`);
}

export function listEphpAlerts() {
  return apiRequest<unknown[]>('/ephp/alerts');
}

export function listEphpFrameworks() {
  return apiRequest<unknown[]>('/ephp/compliance/frameworks');
}

export function listEphpIntervalAlerts() {
  return apiRequest<unknown[]>('/ephp/intervals/alerts');
}

export function listEphpMrl(countryCode?: string) {
  const q = countryCode ? `?countryCode=${countryCode}` : '';
  return apiRequest<unknown[]>(`/ephp/mrl${q}`);
}
