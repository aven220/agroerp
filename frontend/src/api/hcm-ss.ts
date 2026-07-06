import { apiRequest } from './client';

export function getHcmSsCenter() {
  return apiRequest<Record<string, unknown>>('/hcm/ss/center');
}

export function getHcmSsDashboard() {
  return apiRequest<Record<string, unknown>>('/hcm/ss/dashboard');
}

export function seedHcmSs() {
  return apiRequest<unknown>('/hcm/ss/seed', { method: 'POST', body: '{}' });
}

export function listHcmSsExams(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/hcm/ss/exams${q}`);
}

export function listHcmSsRestrictions(employeeKey?: string) {
  const q = employeeKey ? `?employeeKey=${encodeURIComponent(employeeKey)}&status=active` : '?status=active';
  return apiRequest<unknown[]>(`/hcm/ss/restrictions${q}`);
}

export function listHcmSsFollowUps(employeeKey?: string) {
  const q = employeeKey ? `?employeeKey=${encodeURIComponent(employeeKey)}` : '';
  return apiRequest<unknown[]>(`/hcm/ss/follow-ups${q}`);
}

export function listHcmSsRisks() {
  return apiRequest<unknown[]>('/hcm/ss/risks');
}

export function getHcmSsRiskMatrix() {
  return apiRequest<unknown[]>('/hcm/ss/risks/matrix');
}

export function listHcmSsAssessments(riskKey?: string) {
  const q = riskKey ? `?riskKey=${encodeURIComponent(riskKey)}` : '';
  return apiRequest<unknown[]>(`/hcm/ss/assessments${q}`);
}

export function listHcmSsMitigations(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<unknown[]>(`/hcm/ss/mitigations${q}`);
}

export function listHcmSsPpe() {
  return apiRequest<unknown[]>('/hcm/ss/ppe');
}

export function listHcmSsPpeAssignments(employeeKey?: string) {
  const q = employeeKey ? `?employeeKey=${encodeURIComponent(employeeKey)}` : '';
  return apiRequest<unknown[]>(`/hcm/ss/ppe/assignments${q}`);
}

export function listHcmSsPpeDeliveries(employeeKey?: string) {
  const q = employeeKey ? `?employeeKey=${encodeURIComponent(employeeKey)}` : '';
  return apiRequest<unknown[]>(`/hcm/ss/ppe/deliveries${q}`);
}

export function listHcmSsPpeExpiryAlerts() {
  return apiRequest<unknown[]>('/hcm/ss/ppe/expiry-alerts');
}

export function deliverHcmSsPpe(body: Record<string, unknown>) {
  return apiRequest<unknown>('/hcm/ss/ppe/deliveries', { method: 'POST', body: JSON.stringify(body) });
}

export function listHcmSsIncidents(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/hcm/ss/incidents${q}`);
}

export function reportHcmSsIncident(body: Record<string, unknown>) {
  return apiRequest<unknown>('/hcm/ss/incidents', { method: 'POST', body: JSON.stringify(body) });
}

export function listHcmSsInspections(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/hcm/ss/inspections${q}`);
}

export function listHcmSsWellbeingPrograms() {
  return apiRequest<unknown[]>('/hcm/ss/wellbeing/programs');
}

export function listHcmSsEmergencyPlans() {
  return apiRequest<unknown[]>('/hcm/ss/emergency/plans');
}
