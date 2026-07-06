import { apiRequest } from './client';

export function getHcmTdCenter() {
  return apiRequest<Record<string, unknown>>('/hcm/td/center');
}

export function getHcmTdDashboard() {
  return apiRequest<Record<string, unknown>>('/hcm/td/dashboard');
}

export function seedHcmTd() {
  return apiRequest<unknown>('/hcm/td/seed', { method: 'POST', body: '{}' });
}

export function listHcmTdCourses() {
  return apiRequest<unknown[]>('/hcm/td/courses');
}

export function listHcmTdPlans() {
  return apiRequest<unknown[]>('/hcm/td/plans');
}

export function listHcmTdEnrollments(employeeKey?: string) {
  const q = employeeKey ? `?employeeKey=${encodeURIComponent(employeeKey)}` : '';
  return apiRequest<unknown[]>(`/hcm/td/enrollments${q}`);
}

export function listHcmTdCertifications(employeeKey?: string) {
  const q = employeeKey ? `?employeeKey=${encodeURIComponent(employeeKey)}` : '';
  return apiRequest<unknown[]>(`/hcm/td/certifications${q}`);
}

export function listHcmTdCompetencies() {
  return apiRequest<unknown[]>('/hcm/td/competencies');
}

export function getHcmTdSkillMatrix(departmentKey?: string) {
  const q = departmentKey ? `?departmentKey=${encodeURIComponent(departmentKey)}` : '';
  return apiRequest<unknown[]>(`/hcm/td/competencies/matrix${q}`);
}

export function listHcmTdEmployeeCompetencies(employeeKey?: string) {
  const q = employeeKey ? `?employeeKey=${encodeURIComponent(employeeKey)}` : '';
  return apiRequest<unknown[]>(`/hcm/td/competencies/employee${q}`);
}

export function listHcmTdCycles() {
  return apiRequest<unknown[]>('/hcm/td/cycles');
}

export function listHcmTdEvaluations(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/hcm/td/evaluations${q}`);
}

export function listHcmTdObjectives(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/hcm/td/objectives${q}`);
}

export function listHcmTdCareerPlans(employeeKey?: string) {
  const q = employeeKey ? `?employeeKey=${encodeURIComponent(employeeKey)}` : '';
  return apiRequest<unknown[]>(`/hcm/td/career-plans${q}`);
}

export function listHcmTdHighPotential() {
  return apiRequest<unknown[]>('/hcm/td/career-plans/high-potential');
}

export function listHcmTdReminders(employeeKey?: string) {
  const q = employeeKey ? `?employeeKey=${encodeURIComponent(employeeKey)}` : '';
  return apiRequest<unknown[]>(`/hcm/td/reminders${q}`);
}
