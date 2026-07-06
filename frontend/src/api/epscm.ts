import { apiRequest } from './client';

export function getEpscmCenter() {
  return apiRequest<Record<string, unknown>>('/epscm/center');
}

export function getEpscmDashboard() {
  return apiRequest<Record<string, unknown>>('/epscm/dashboard');
}

export function seedEpscm() {
  return apiRequest<unknown>('/epscm/seed', { method: 'POST', body: '{}' });
}

export function getEpscmDemandPanel() {
  return apiRequest<Record<string, unknown>>('/epscm/demand/panel');
}

export function listEpscmForecasts() {
  return apiRequest<unknown[]>('/epscm/demand/forecasts');
}

export function createEpscmForecast(body: Record<string, unknown>) {
  return apiRequest<unknown>('/epscm/demand/forecasts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function computeEpscmForecast(versionKey: string) {
  return apiRequest<unknown>(`/epscm/demand/forecasts/${encodeURIComponent(versionKey)}/compute`, {
    method: 'POST', body: '{}',
  });
}

export function compareEpscmForecast(versionKey: string) {
  return apiRequest<unknown[]>(`/epscm/demand/forecasts/${encodeURIComponent(versionKey)}/compare`, {
    method: 'POST', body: '{}',
  });
}

export function listEpscmDemandHistory(itemKey?: string) {
  const q = itemKey ? `?itemKey=${encodeURIComponent(itemKey)}` : '';
  return apiRequest<unknown[]>(`/epscm/demand/history${q}`);
}

export function listEpscmReplenishmentPolicies() {
  return apiRequest<unknown[]>('/epscm/replenishment/policies');
}

export function listEpscmReplenishmentProposals(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<unknown[]>(`/epscm/replenishment/proposals${q}`);
}

export function runEpscmReplenishment() {
  return apiRequest<unknown[]>('/epscm/replenishment/run', { method: 'POST', body: '{}' });
}

export function listEpscmSupplyPlans() {
  return apiRequest<unknown[]>('/epscm/supply-plans');
}

export function createEpscmSupplyPlan(body: Record<string, unknown>) {
  return apiRequest<unknown>('/epscm/supply-plans', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listEpscmClassifications() {
  return apiRequest<unknown[]>('/epscm/inventory/classifications');
}

export function classifyEpscmInventory() {
  return apiRequest<unknown[]>('/epscm/inventory/classify', { method: 'POST', body: '{}' });
}

export function getEpscmInventoryIndicators() {
  return apiRequest<Record<string, unknown>>('/epscm/inventory/indicators');
}

export function listEpscmAlerts(unreadOnly?: boolean) {
  const q = unreadOnly ? '?unreadOnly=true' : '';
  return apiRequest<unknown[]>(`/epscm/alerts${q}`);
}

export function runEpscmPlanningCycle(versionKey: string) {
  return apiRequest<unknown>('/epscm/planning/run', {
    method: 'POST',
    body: JSON.stringify({ versionKey }),
  });
}

export function getEpscmSupplyCalendar() {
  return apiRequest<unknown[]>('/epscm/supply-calendar');
}

export function getEpscmAuditLog() {
  return apiRequest<unknown[]>('/epscm/audit');
}
