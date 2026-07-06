import { apiRequest } from './client';

export function getEfmApCenter() {
  return apiRequest<Record<string, unknown>>('/efm/ap/center');
}

export function seedEfmAp() {
  return apiRequest<unknown>('/efm/ap/seed', { method: 'POST', body: '{}' });
}

export function listEfmApSuppliers() {
  return apiRequest<unknown[]>('/efm/ap/suppliers');
}

export function getEfmApSupplierStatement(supplierKey: string) {
  return apiRequest<unknown>(`/efm/ap/suppliers/${encodeURIComponent(supplierKey)}/statement`);
}

export function listEfmApInvoices(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/efm/ap/invoices${q}`);
}

export function listEfmApPayables(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/efm/ap/payables${q}`);
}

export function listEfmApPayments(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/efm/ap/payments${q}`);
}

export function listEfmApSchedule(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/efm/ap/schedule${q}`);
}

export function listEfmApPendingApprovals() {
  return apiRequest<unknown[]>('/efm/ap/approvals/pending');
}

export function approveEfmApPayment(paymentKey: string, comments?: string) {
  return apiRequest<unknown>(`/efm/ap/payments/${encodeURIComponent(paymentKey)}/approve`, {
    method: 'POST',
    body: JSON.stringify({ comments }),
  });
}

export function listEfmApIncidents(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/efm/ap/incidents${q}`);
}

export function createEfmApIncident(data: Record<string, unknown>) {
  return apiRequest<unknown>('/efm/ap/incidents', { method: 'POST', body: JSON.stringify(data) });
}
