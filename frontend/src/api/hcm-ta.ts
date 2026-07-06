import { apiRequest } from './client';

export function getHcmTaCenter() {
  return apiRequest<Record<string, unknown>>('/hcm/ta/center');
}

export function getHcmTaDashboard(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<Record<string, unknown>>(`/hcm/ta/dashboard${q}`);
}

export function seedHcmTa() {
  return apiRequest<unknown>('/hcm/ta/seed', { method: 'POST', body: '{}' });
}

export function listHcmTaShifts() {
  return apiRequest<unknown[]>('/hcm/ta/shifts');
}

export function listHcmTaSchedules() {
  return apiRequest<unknown[]>('/hcm/ta/schedules');
}

export function listHcmTaCalendars() {
  return apiRequest<unknown[]>('/hcm/ta/calendars');
}

export function listHcmTaAssignments(employeeKey?: string) {
  const q = employeeKey ? `?employeeKey=${encodeURIComponent(employeeKey)}` : '';
  return apiRequest<unknown[]>(`/hcm/ta/assignments${q}`);
}

export function listHcmTaPunches(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/hcm/ta/punches${q}`);
}

export function punchHcmTa(body: Record<string, unknown>) {
  return apiRequest<unknown>('/hcm/ta/punches', { method: 'POST', body: JSON.stringify(body) });
}

export function listHcmTaCorrections(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<unknown[]>(`/hcm/ta/corrections${q}`);
}

export function decideHcmTaCorrection(correctionKey: string, approved: boolean, reviewNotes?: string) {
  return apiRequest<unknown>(`/hcm/ta/corrections/${encodeURIComponent(correctionKey)}/decide`, {
    method: 'POST',
    body: JSON.stringify({ approved, reviewNotes }),
  });
}

export function listHcmTaNovelties(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/hcm/ta/novelties${q}`);
}

export function createHcmTaNovelty(body: Record<string, unknown>) {
  return apiRequest<unknown>('/hcm/ta/novelties', { method: 'POST', body: JSON.stringify(body) });
}

export function decideHcmTaNovelty(noveltyKey: string, approved: boolean, payrollPeriod?: string) {
  return apiRequest<unknown>(`/hcm/ta/novelties/${encodeURIComponent(noveltyKey)}/decide`, {
    method: 'POST',
    body: JSON.stringify({ approved, payrollPeriod }),
  });
}

export function listHcmTaSwaps(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<unknown[]>(`/hcm/ta/swaps${q}`);
}

export function listHcmTaAbsences(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/hcm/ta/absences${q}`);
}

export function listHcmTaGeofences() {
  return apiRequest<unknown[]>('/hcm/ta/geofences');
}

export function getHcmTaDaySummary(employeeKey: string, workDate: string) {
  return apiRequest<unknown>(`/hcm/ta/punches/summary?employeeKey=${encodeURIComponent(employeeKey)}&workDate=${encodeURIComponent(workDate)}`);
}
