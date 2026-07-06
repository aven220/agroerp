import { apiRequest } from './client';

export function getEfmBgCenter() {
  return apiRequest<Record<string, unknown>>('/efm/bg/center');
}

export function seedEfmBg() {
  return apiRequest<unknown>('/efm/bg/seed', { method: 'POST', body: '{}' });
}

export function getEfmBgHierarchy() {
  return apiRequest<Record<string, unknown>>('/efm/bg/dimensions/hierarchy');
}

export function listEfmBgBudgets(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/efm/bg/budgets${q}`);
}

export function getEfmBgBudget(budgetKey: string) {
  return apiRequest<unknown>(`/efm/bg/budgets/${encodeURIComponent(budgetKey)}`);
}

export function getEfmBgAvailability(params: Record<string, string>) {
  const q = new URLSearchParams(params).toString();
  return apiRequest<unknown>(`/efm/bg/availability?${q}`);
}

export function listEfmBgCommitments(budgetKey?: string) {
  const q = budgetKey ? `?budgetKey=${encodeURIComponent(budgetKey)}` : '';
  return apiRequest<unknown[]>(`/efm/bg/commitments${q}`);
}

export function listEfmBgExecutions(budgetKey?: string) {
  const q = budgetKey ? `?budgetKey=${encodeURIComponent(budgetKey)}` : '';
  return apiRequest<unknown[]>(`/efm/bg/executions${q}`);
}

export function listEfmBgTransfers(budgetKey?: string) {
  const q = budgetKey ? `?budgetKey=${encodeURIComponent(budgetKey)}` : '';
  return apiRequest<unknown[]>(`/efm/bg/transfers${q}`);
}

export function getEfmBgBudgetVsExecuted(budgetKey: string, periodKey?: string) {
  const q = new URLSearchParams({ budgetKey });
  if (periodKey) q.set('periodKey', periodKey);
  return apiRequest<unknown>(`/efm/bg/analysis/budget-vs-executed?${q}`);
}

export function getEfmBgByCostCenter(budgetKey: string) {
  return apiRequest<unknown[]>(`/efm/bg/analysis/by-cost-center?budgetKey=${encodeURIComponent(budgetKey)}`);
}

export function getEfmBgClosingProjection(budgetKey: string) {
  return apiRequest<unknown>(`/efm/bg/analysis/closing-projection?budgetKey=${encodeURIComponent(budgetKey)}`);
}

export function listEfmBgAlerts(resolved = false) {
  return apiRequest<unknown[]>(`/efm/bg/alerts?resolved=${resolved}`);
}

export function listEfmBgPendingApprovals() {
  return apiRequest<unknown[]>('/efm/bg/mobile/pending-approvals');
}
