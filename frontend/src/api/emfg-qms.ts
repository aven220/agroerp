import { apiRequest } from './client';

export function getEmfgQmsDashboard(periodDays?: number) {
  const q = periodDays ? `?periodDays=${periodDays}` : '';
  return apiRequest<Record<string, unknown>>(`/emfg/qms/dashboard${q}`);
}

export function listEmfgQmsPlans(scope?: string) {
  const q = scope ? `?scope=${encodeURIComponent(scope)}` : '';
  return apiRequest<unknown[]>(`/emfg/qms/plans${q}`);
}

export function createEmfgQmsPlan(body: Record<string, unknown>) {
  return apiRequest<unknown>('/emfg/qms/plans', { method: 'POST', body: JSON.stringify(body) });
}

export function listEmfgQmsInspections(inspectionType?: string, result?: string) {
  const params = new URLSearchParams();
  if (inspectionType) params.set('inspectionType', inspectionType);
  if (result) params.set('result', result);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/emfg/qms/inspections${q}`);
}

export function createEmfgQmsInspection(body: Record<string, unknown>) {
  return apiRequest<unknown>('/emfg/qms/inspections', { method: 'POST', body: JSON.stringify(body) });
}

export function addEmfgQmsMeasurement(inspectionKey: string, body: Record<string, unknown>) {
  return apiRequest<unknown>(`/emfg/qms/inspections/${encodeURIComponent(inspectionKey)}/measurements`, {
    method: 'POST', body: JSON.stringify(body),
  });
}

export function addEmfgQmsEvidence(inspectionKey: string, body: Record<string, unknown>) {
  return apiRequest<unknown>(`/emfg/qms/inspections/${encodeURIComponent(inspectionKey)}/evidences`, {
    method: 'POST', body: JSON.stringify(body),
  });
}

export function completeEmfgQmsInspection(inspectionKey: string) {
  return apiRequest<unknown>(`/emfg/qms/inspections/${encodeURIComponent(inspectionKey)}/complete`, {
    method: 'POST', body: '{}',
  });
}

export function listEmfgQmsNc(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<unknown[]>(`/emfg/qms/non-conformances${q}`);
}

export function createEmfgQmsNc(body: Record<string, unknown>) {
  return apiRequest<unknown>('/emfg/qms/non-conformances', { method: 'POST', body: JSON.stringify(body) });
}

export function closeEmfgQmsNc(ncKey: string) {
  return apiRequest<unknown>(`/emfg/qms/non-conformances/${encodeURIComponent(ncKey)}/close`, {
    method: 'POST', body: '{}',
  });
}

export function listEmfgQmsCapa() {
  return apiRequest<unknown[]>('/emfg/qms/capa');
}

export function createEmfgQmsCapa(body: Record<string, unknown>) {
  return apiRequest<unknown>('/emfg/qms/capa', { method: 'POST', body: JSON.stringify(body) });
}

export function verifyEmfgQmsCapa(capaKey: string, body: Record<string, unknown>) {
  return apiRequest<unknown>(`/emfg/qms/capa/${encodeURIComponent(capaKey)}/verify`, {
    method: 'POST', body: JSON.stringify(body),
  });
}

export function listEmfgQmsReleases(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<unknown[]>(`/emfg/qms/releases${q}`);
}

export function decideEmfgQmsRelease(releaseKey: string, body: { action: string; reason?: string }) {
  return apiRequest<unknown>(`/emfg/qms/releases/${encodeURIComponent(releaseKey)}/decide`, {
    method: 'POST', body: JSON.stringify(body),
  });
}

export function syncEmfgQmsOffline(body: { deviceId?: string; actions: unknown[] }) {
  return apiRequest<unknown>('/emfg/qms/offline/sync', { method: 'POST', body: JSON.stringify(body) });
}
