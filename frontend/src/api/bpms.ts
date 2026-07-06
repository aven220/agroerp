import { apiRequest } from './client';

export function getBpmsCenter() {
  return apiRequest<Record<string, unknown>>('/bpms/center');
}

export function bootstrapBpms() {
  return apiRequest<unknown>('/bpms/bootstrap', { method: 'POST', body: '{}' });
}

export function listBpmsProcesses() {
  return apiRequest<unknown[]>('/bpms/processes');
}

export function getBpmsProcess(processKey: string) {
  return apiRequest<Record<string, unknown>>(`/bpms/processes/${encodeURIComponent(processKey)}`);
}

export function getBpmsDiagram(versionKey: string) {
  return apiRequest<Record<string, unknown>>(`/bpms/designer/${encodeURIComponent(versionKey)}`);
}

export function saveBpmsDiagram(versionKey: string, elements: unknown[], flows: unknown[]) {
  return apiRequest<unknown>(`/bpms/designer/${encodeURIComponent(versionKey)}`, {
    method: 'POST',
    body: JSON.stringify({ elements, flows }),
  });
}

export function validateBpmsDiagram(versionKey: string) {
  return apiRequest<Record<string, unknown>>(`/bpms/designer/${encodeURIComponent(versionKey)}/validate`);
}

export function publishBpmsVersion(versionKey: string) {
  return apiRequest<unknown>(`/bpms/versions/${encodeURIComponent(versionKey)}/publish`, { method: 'POST', body: '{}' });
}

export function listBpmsInstances(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<unknown[]>(`/bpms/instances${q}`);
}

export function startBpmsInstance(processKey: string, context?: Record<string, unknown>) {
  return apiRequest<unknown>('/bpms/instances/start', { method: 'POST', body: JSON.stringify({ processKey, context }) });
}

export function getBpmsInbox() {
  return apiRequest<unknown[]>('/bpms/tasks/inbox');
}

export function completeBpmsTask(taskKey: string, approved = true, signatureUrl?: string) {
  return apiRequest<unknown>(`/bpms/tasks/${encodeURIComponent(taskKey)}/complete`, {
    method: 'POST',
    body: JSON.stringify({ approved, signatureUrl }),
  });
}

export function listBpmsAutomations() {
  return apiRequest<unknown[]>('/bpms/automations');
}

export function getBpmsMonitoring() {
  return apiRequest<Record<string, unknown>>('/bpms/monitoring');
}

export function computeBpmsMonitoring() {
  return apiRequest<unknown>('/bpms/monitoring/compute', { method: 'POST', body: '{}' });
}

export function listBpmsTemplates() {
  return apiRequest<unknown[]>('/bpms/templates');
}

export function exportBpmsProcess(processKey: string) {
  return apiRequest<Record<string, unknown>>(`/bpms/processes/${encodeURIComponent(processKey)}/export`);
}
