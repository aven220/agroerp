import { apiRequest } from './client';

export function getEmfgCenter() {
  return apiRequest<Record<string, unknown>>('/emfg/center');
}

export function seedEmfg() {
  return apiRequest<unknown>('/emfg/seed', { method: 'POST', body: '{}' });
}

export function getEmfgCapacitySummary() {
  return apiRequest<Record<string, unknown>>('/emfg/capacity/summary');
}

export function listEmfgCenters() {
  return apiRequest<unknown[]>('/emfg/centers');
}

export function listEmfgMasterPlans() {
  return apiRequest<unknown[]>('/emfg/master-plans');
}

export function getEmfgMasterPlan(planKey: string) {
  return apiRequest<Record<string, unknown>>(`/emfg/master-plans/${encodeURIComponent(planKey)}`);
}

export function createEmfgMasterPlan(body: Record<string, unknown>) {
  return apiRequest<unknown>('/emfg/master-plans', { method: 'POST', body: JSON.stringify(body) });
}

export function activateEmfgMasterPlan(planKey: string) {
  return apiRequest<unknown>(`/emfg/master-plans/${encodeURIComponent(planKey)}/activate`, { method: 'POST', body: '{}' });
}

export function generateEmfgOrders(planKey: string, centerKey: string) {
  return apiRequest<unknown>(`/emfg/master-plans/${encodeURIComponent(planKey)}/generate-orders`, {
    method: 'POST',
    body: JSON.stringify({ centerKey }),
  });
}

export function listEmfgBoms(itemKey?: string) {
  const q = itemKey ? `?itemKey=${encodeURIComponent(itemKey)}` : '';
  return apiRequest<unknown[]>(`/emfg/boms${q}`);
}

export function getEmfgBom(bomKey: string) {
  return apiRequest<Record<string, unknown>>(`/emfg/boms/${encodeURIComponent(bomKey)}`);
}

export function createEmfgBom(body: Record<string, unknown>) {
  return apiRequest<unknown>('/emfg/boms', { method: 'POST', body: JSON.stringify(body) });
}

export function listEmfgRoutings(itemKey?: string) {
  const q = itemKey ? `?itemKey=${encodeURIComponent(itemKey)}` : '';
  return apiRequest<unknown[]>(`/emfg/routings${q}`);
}

export function getEmfgRouting(routingKey: string) {
  return apiRequest<Record<string, unknown>>(`/emfg/routings/${encodeURIComponent(routingKey)}`);
}

export function createEmfgRouting(body: Record<string, unknown>) {
  return apiRequest<unknown>('/emfg/routings', { method: 'POST', body: JSON.stringify(body) });
}

export function listEmfgOrders(status?: string, centerKey?: string) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (centerKey) params.set('centerKey', centerKey);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/emfg/orders${q}`);
}

export function getEmfgOrder(orderKey: string) {
  return apiRequest<Record<string, unknown>>(`/emfg/orders/${encodeURIComponent(orderKey)}`);
}

export function createEmfgOrder(body: Record<string, unknown>) {
  return apiRequest<unknown>('/emfg/orders', { method: 'POST', body: JSON.stringify(body) });
}

export function releaseEmfgOrder(orderKey: string) {
  return apiRequest<unknown>(`/emfg/orders/${encodeURIComponent(orderKey)}/release`, { method: 'POST', body: '{}' });
}

export function recordEmfgProgress(orderKey: string, body: Record<string, unknown>) {
  return apiRequest<unknown>(`/emfg/orders/${encodeURIComponent(orderKey)}/progress`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listEmfgSchedule(workCenterKey?: string) {
  const q = workCenterKey ? `?workCenterKey=${encodeURIComponent(workCenterKey)}` : '';
  return apiRequest<unknown[]>(`/emfg/schedule${q}`);
}

export function listEmfgConflicts() {
  return apiRequest<unknown[]>('/emfg/schedule/conflicts');
}

export function scheduleEmfgAuto(orderKey: string, horizonStart?: string) {
  return apiRequest<unknown>(`/emfg/orders/${encodeURIComponent(orderKey)}/schedule/auto`, {
    method: 'POST',
    body: JSON.stringify({ horizonStart }),
  });
}

export function rescheduleEmfgOrder(orderKey: string, body: Record<string, unknown>) {
  return apiRequest<unknown>(`/emfg/orders/${encodeURIComponent(orderKey)}/reschedule`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listEmfgAudit(entityType?: string) {
  const q = entityType ? `?entityType=${encodeURIComponent(entityType)}` : '';
  return apiRequest<unknown[]>(`/emfg/audit${q}`);
}
