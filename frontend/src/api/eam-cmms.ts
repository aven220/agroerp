import { apiRequest } from './client';

export function getEamCmmsCenter() {
  return apiRequest<Record<string, unknown>>('/eam/cmms/center');
}

export function bootstrapEamCmms() {
  return apiRequest<unknown>('/eam/cmms/bootstrap', { method: 'POST', body: '{}' });
}

export function listEamCmmsPlans() {
  return apiRequest<unknown[]>('/eam/cmms/plans');
}

export function listEamCmmsWorkOrders(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<unknown[]>(`/eam/cmms/work-orders${q}`);
}

export function getEamCmmsWorkOrder(workOrderKey: string) {
  return apiRequest<Record<string, unknown>>(`/eam/cmms/work-orders/${encodeURIComponent(workOrderKey)}`);
}

export function listEamCmmsTechnicians() {
  return apiRequest<unknown[]>('/eam/cmms/technicians');
}

export function listEamCmmsIncidents(open = true) {
  return apiRequest<unknown[]>(`/eam/cmms/incidents?open=${open}`);
}

export function getEamCmmsCalendar(view: 'day' | 'week' | 'month' = 'week') {
  return apiRequest<unknown[]>(`/eam/cmms/calendar?view=${view}`);
}

export function getEamCmmsDashboard() {
  return apiRequest<Record<string, unknown>>('/eam/cmms/dashboard');
}

export function getEamCmmsCostDashboard() {
  return apiRequest<Record<string, unknown>>('/eam/cmms/dashboard/costs');
}

export function getEamCmmsComplianceDashboard() {
  return apiRequest<Record<string, unknown>>('/eam/cmms/dashboard/compliance');
}

export function computeEamCmmsIndicators() {
  return apiRequest<Record<string, unknown>>('/eam/cmms/indicators/compute', { method: 'POST', body: '{}' });
}

export function createEamCmmsWorkOrder(body: Record<string, unknown>) {
  return apiRequest<unknown>('/eam/cmms/work-orders', { method: 'POST', body: JSON.stringify(body) });
}

export function reportEamCmmsIncident(body: Record<string, unknown>) {
  return apiRequest<unknown>('/eam/cmms/incidents', { method: 'POST', body: JSON.stringify(body) });
}
