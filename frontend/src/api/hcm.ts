import { apiRequest } from './client';

export function getHcmCenter() {
  return apiRequest<Record<string, unknown>>('/hcm/center');
}

export function seedHcm() {
  return apiRequest<unknown>('/hcm/seed', { method: 'POST', body: '{}' });
}

export function getHcmHierarchy() {
  return apiRequest<Record<string, unknown>>('/hcm/org/hierarchy');
}

export function rebuildHcmOrgChart() {
  return apiRequest<unknown>('/hcm/org/chart/rebuild', { method: 'POST', body: '{}' });
}

export function listHcmEmployees(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/hcm/employees${q}`);
}

export function searchHcmEmployees(q: string) {
  return apiRequest<unknown[]>(`/hcm/employees/search?q=${encodeURIComponent(q)}`);
}

export function getHcmEmployee(employeeKey: string) {
  return apiRequest<unknown>(`/hcm/employees/${encodeURIComponent(employeeKey)}`);
}

export function createHcmEmployee(body: Record<string, unknown>) {
  return apiRequest<unknown>('/hcm/employees', { method: 'POST', body: JSON.stringify(body) });
}

export function transferHcmEmployee(employeeKey: string, body: Record<string, unknown>) {
  return apiRequest<unknown>(`/hcm/employees/${encodeURIComponent(employeeKey)}/transfer`, { method: 'POST', body: JSON.stringify(body) });
}

export function listHcmContracts(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/hcm/contracts${q}`);
}

export function createHcmContract(body: Record<string, unknown>) {
  return apiRequest<unknown>('/hcm/contracts', { method: 'POST', body: JSON.stringify(body) });
}

export function listHcmDocuments(employeeKey?: string) {
  const q = employeeKey ? `?employeeKey=${encodeURIComponent(employeeKey)}` : '';
  return apiRequest<unknown[]>(`/hcm/documents${q}`);
}

export function uploadHcmDocument(employeeKey: string, body: Record<string, unknown>) {
  return apiRequest<unknown>(`/hcm/employees/${encodeURIComponent(employeeKey)}/documents`, { method: 'POST', body: JSON.stringify(body) });
}

export function importHcmEmployees(rows: Array<Record<string, string>>) {
  return apiRequest<unknown[]>('/hcm/employees/import', { method: 'POST', body: JSON.stringify({ rows }) });
}

export function listHcmAudit(entityType?: string) {
  const q = entityType ? `?entityType=${encodeURIComponent(entityType)}` : '';
  return apiRequest<unknown[]>(`/hcm/audit${q}`);
}
