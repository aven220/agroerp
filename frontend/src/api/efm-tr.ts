import { apiRequest } from './client';

export function getEfmTrCenter() {
  return apiRequest<Record<string, unknown>>('/efm/tr/center');
}

export function seedEfmTr() {
  return apiRequest<unknown>('/efm/tr/seed', { method: 'POST', body: '{}' });
}

export function listEfmTrBanks() {
  return apiRequest<unknown[]>('/efm/tr/banks');
}

export function listEfmTrAccounts(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/efm/tr/accounts${q}`);
}

export function getEfmTrBalances() {
  return apiRequest<unknown[]>('/efm/tr/balances');
}

export function listEfmTrCashBoxes() {
  return apiRequest<unknown[]>('/efm/tr/cash-boxes');
}

export function listEfmTrMovements(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/efm/tr/movements${q}`);
}

export function listEfmTrReconciliations(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/efm/tr/reconciliations${q}`);
}

export function getEfmTrCashflowMonthly(dateFrom: string, dateTo: string) {
  return apiRequest<unknown>(`/efm/tr/cashflow/monthly?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`);
}

export function getEfmTrProjection(days = 90) {
  return apiRequest<unknown>(`/efm/tr/cashflow/projection?days=${days}`);
}

export function createEfmTrMovement(data: Record<string, unknown>) {
  return apiRequest<unknown>('/efm/tr/movements', { method: 'POST', body: JSON.stringify(data) });
}
