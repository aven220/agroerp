import { apiRequest } from './client';

export function getHcmPyCenter() {
  return apiRequest<Record<string, unknown>>('/hcm/py/center');
}

export function getHcmPyDashboard(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<Record<string, unknown>>(`/hcm/py/dashboard${q}`);
}

export function seedHcmPy() {
  return apiRequest<unknown>('/hcm/py/seed', { method: 'POST', body: '{}' });
}

export function listHcmPyConcepts() {
  return apiRequest<unknown[]>('/hcm/py/concepts');
}

export function listHcmPyFunds() {
  return apiRequest<unknown[]>('/hcm/py/funds');
}

export function listHcmPyConfigs() {
  return apiRequest<unknown[]>('/hcm/py/configs');
}

export function listHcmPyPeriods(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/hcm/py/periods${q}`);
}

export function listHcmPyRuns(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/hcm/py/runs${q}`);
}

export function listHcmPyPayslips(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>('/hcm/py/payslips' + q);
}

export function listHcmPyBenefits(employeeKey?: string) {
  const q = employeeKey ? `?employeeKey=${encodeURIComponent(employeeKey)}` : '';
  return apiRequest<unknown[]>(`/hcm/py/benefits${q}`);
}

export function listHcmPySettlements(employeeKey?: string) {
  const q = employeeKey ? `?employeeKey=${encodeURIComponent(employeeKey)}` : '';
  return apiRequest<unknown[]>(`/hcm/py/settlements${q}`);
}

export function listHcmPyProvisions(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/hcm/py/provisions${q}`);
}

export function listHcmPyDocuments(employeeKey?: string) {
  const q = employeeKey ? `?employeeKey=${encodeURIComponent(employeeKey)}` : '';
  return apiRequest<unknown[]>(`/hcm/py/documents${q}`);
}

export function getHcmPySalaryHistory(employeeKey: string) {
  return apiRequest<Record<string, unknown>>(`/hcm/py/salary-history/${encodeURIComponent(employeeKey)}`);
}

export function calculateHcmPyRun(runKey: string) {
  return apiRequest<unknown>(`/hcm/py/runs/${encodeURIComponent(runKey)}/calculate`, { method: 'POST', body: '{}' });
}

export function approveHcmPyRun(runKey: string) {
  return apiRequest<unknown>(`/hcm/py/runs/${encodeURIComponent(runKey)}/approve`, { method: 'POST', body: '{}' });
}
