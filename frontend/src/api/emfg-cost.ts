import { apiRequest } from './client';

export function getEmfgCostDashboard() {
  return apiRequest<Record<string, unknown>>('/emfg/cost/dashboard');
}

export function getEmfgCostHistory() {
  return apiRequest<unknown[]>('/emfg/cost/history');
}

export function listEmfgCostStandards() {
  return apiRequest<unknown[]>('/emfg/cost/standards');
}

export function createEmfgCostStandard(body: Record<string, unknown>) {
  return apiRequest<unknown>('/emfg/cost/standards', { method: 'POST', body: JSON.stringify(body) });
}

export function buildEmfgCostStandardFromOrder(orderKey: string) {
  return apiRequest<unknown>(`/emfg/cost/standards/from-order/${encodeURIComponent(orderKey)}`, {
    method: 'POST', body: '{}',
  });
}

export function listEmfgCostWip(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<unknown[]>(`/emfg/cost/wip${q}`);
}

export function getEmfgCostWip(orderKey: string) {
  return apiRequest<Record<string, unknown>>(`/emfg/cost/wip/${encodeURIComponent(orderKey)}`);
}

export function transferEmfgCostWip(orderKey: string) {
  return apiRequest<unknown>(`/emfg/cost/wip/${encodeURIComponent(orderKey)}/transfer`, {
    method: 'POST', body: '{}',
  });
}

export function listEmfgCostVariances(orderKey?: string) {
  const q = orderKey ? `?orderKey=${encodeURIComponent(orderKey)}` : '';
  return apiRequest<unknown[]>(`/emfg/cost/variances${q}`);
}

export function runEmfgCostCalculation(orderKey: string, salesPrice?: number) {
  return apiRequest<unknown>(`/emfg/cost/orders/${encodeURIComponent(orderKey)}/run`, {
    method: 'POST',
    body: JSON.stringify({ salesPrice }),
  });
}

export function getEmfgCostActuals(orderKey: string) {
  return apiRequest<unknown[]>(`/emfg/cost/orders/${encodeURIComponent(orderKey)}/actuals`);
}
