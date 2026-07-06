import { apiRequest } from './client';

export function getHcmRcCenter() {
  return apiRequest<Record<string, unknown>>('/hcm/rc/center');
}

export function seedHcmRc() {
  return apiRequest<unknown>('/hcm/rc/seed', { method: 'POST', body: '{}' });
}

export function listHcmRcVacancies(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/hcm/rc/vacancies${q}`);
}

export function listHcmRcPublishedVacancies(channel?: string) {
  const q = channel ? `?channel=${encodeURIComponent(channel)}` : '';
  return apiRequest<unknown[]>(`/hcm/rc/vacancies/published${q}`);
}

export function getHcmRcVacancy(vacancyKey: string) {
  return apiRequest<unknown>(`/hcm/rc/vacancies/${encodeURIComponent(vacancyKey)}`);
}

export function createHcmRcVacancy(body: Record<string, unknown>) {
  return apiRequest<unknown>('/hcm/rc/vacancies', { method: 'POST', body: JSON.stringify(body) });
}

export function submitHcmRcVacancy(vacancyKey: string) {
  return apiRequest<unknown>(`/hcm/rc/vacancies/${encodeURIComponent(vacancyKey)}/submit`, { method: 'POST', body: '{}' });
}

export function approveHcmRcVacancy(vacancyKey: string, level: number, approved: boolean, comments?: string) {
  return apiRequest<unknown>(`/hcm/rc/vacancies/${encodeURIComponent(vacancyKey)}/approve/${level}`, {
    method: 'POST',
    body: JSON.stringify({ approved, comments }),
  });
}

export function publishHcmRcVacancy(vacancyKey: string, internal?: boolean, external?: boolean) {
  return apiRequest<unknown>(`/hcm/rc/vacancies/${encodeURIComponent(vacancyKey)}/publish`, {
    method: 'POST',
    body: JSON.stringify({ internal, external }),
  });
}

export function listHcmRcCandidates(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/hcm/rc/candidates${q}`);
}

export function createHcmRcCandidate(body: Record<string, unknown>) {
  return apiRequest<unknown>('/hcm/rc/candidates', { method: 'POST', body: JSON.stringify(body) });
}

export function importHcmRcCandidates(rows: Array<Record<string, string>>) {
  return apiRequest<unknown[]>('/hcm/rc/candidates/import', { method: 'POST', body: JSON.stringify({ rows }) });
}

export function applyHcmRc(body: { vacancyKey: string; candidateKey: string }) {
  return apiRequest<unknown>('/hcm/rc/applications', { method: 'POST', body: JSON.stringify(body) });
}

export function getHcmRcPipeline(vacancyKey: string) {
  return apiRequest<unknown[]>(`/hcm/rc/pipeline/${encodeURIComponent(vacancyKey)}`);
}

export function autoFilterHcmRc(vacancyKey: string) {
  return apiRequest<unknown[]>(`/hcm/rc/vacancies/${encodeURIComponent(vacancyKey)}/auto-filter`, { method: 'POST', body: '{}' });
}

export function computeHcmRcRanking(vacancyKey: string) {
  return apiRequest<unknown[]>(`/hcm/rc/vacancies/${encodeURIComponent(vacancyKey)}/ranking`, { method: 'POST', body: '{}' });
}

export function listHcmRcRanking(vacancyKey: string) {
  return apiRequest<unknown[]>(`/hcm/rc/vacancies/${encodeURIComponent(vacancyKey)}/ranking`);
}

export function listHcmRcInterviews(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/hcm/rc/interviews${q}`);
}

export function scheduleHcmRcInterview(body: Record<string, unknown>) {
  return apiRequest<unknown>('/hcm/rc/interviews', { method: 'POST', body: JSON.stringify(body) });
}

export function completeHcmRcInterview(interviewKey: string, body: Record<string, unknown>) {
  return apiRequest<unknown>(`/hcm/rc/interviews/${encodeURIComponent(interviewKey)}/complete`, { method: 'POST', body: JSON.stringify(body) });
}

export function recordHcmRcEvaluation(body: Record<string, unknown>) {
  return apiRequest<unknown>('/hcm/rc/evaluations', { method: 'POST', body: JSON.stringify(body) });
}

export function listHcmRcOffers(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/hcm/rc/offers${q}`);
}

export function createHcmRcOffer(body: Record<string, unknown>) {
  return apiRequest<unknown>('/hcm/rc/offers', { method: 'POST', body: JSON.stringify(body) });
}

export function sendHcmRcOffer(offerKey: string) {
  return apiRequest<unknown>(`/hcm/rc/offers/${encodeURIComponent(offerKey)}/send`, { method: 'POST', body: '{}' });
}

export function acceptHcmRcOffer(offerKey: string) {
  return apiRequest<unknown>(`/hcm/rc/offers/${encodeURIComponent(offerKey)}/accept`, { method: 'POST', body: '{}' });
}

export function signHcmRcOffer(offerKey: string, body: Record<string, unknown>) {
  return apiRequest<unknown>(`/hcm/rc/offers/${encodeURIComponent(offerKey)}/sign`, { method: 'POST', body: JSON.stringify(body) });
}

export function listHcmRcOnboarding(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/hcm/rc/onboarding${q}`);
}

export function getHcmRcOnboarding(planKey: string) {
  return apiRequest<unknown>(`/hcm/rc/onboarding/${encodeURIComponent(planKey)}`);
}

export function updateHcmRcOnboardingTask(taskKey: string, status: string) {
  return apiRequest<unknown>(`/hcm/rc/onboarding/tasks/${encodeURIComponent(taskKey)}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export function listHcmRcTalentPool() {
  return apiRequest<unknown[]>('/hcm/rc/talent-pool');
}

export function listHcmRcAudit() {
  return apiRequest<unknown[]>('/hcm/rc/audit');
}
