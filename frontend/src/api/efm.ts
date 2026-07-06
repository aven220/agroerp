import { apiRequest } from './client';

export function getEfmCenter() {
  return apiRequest<Record<string, unknown>>('/efm/center');
}

export function seedEfm() {
  return apiRequest<unknown>('/efm/seed', { method: 'POST', body: '{}' });
}

export function listEfmCoaVersions() {
  return apiRequest<unknown[]>('/efm/coa/versions');
}

export function listEfmAccounts(versionKey?: string) {
  const q = versionKey ? `?versionKey=${encodeURIComponent(versionKey)}` : '';
  return apiRequest<unknown[]>(`/efm/coa/accounts${q}`);
}

export function getEfmCoaHierarchy(versionKey?: string) {
  const q = versionKey ? `?versionKey=${encodeURIComponent(versionKey)}` : '';
  return apiRequest<unknown[]>(`/efm/coa/hierarchy${q}`);
}

export function upsertEfmAccount(data: Record<string, unknown>) {
  return apiRequest<unknown>('/efm/coa/accounts', { method: 'POST', body: JSON.stringify(data) });
}

export function listEfmParameters() {
  return apiRequest<unknown[]>('/efm/parameters');
}

export function upsertEfmParameter(data: Record<string, unknown>) {
  return apiRequest<unknown>('/efm/parameters', { method: 'POST', body: JSON.stringify(data) });
}

export function listEfmCompanies() {
  return apiRequest<unknown[]>('/efm/companies');
}

export function listEfmCurrencies() {
  return apiRequest<unknown[]>('/efm/currencies');
}

export function listEfmCostCenters() {
  return apiRequest<unknown[]>('/efm/cost-centers');
}

export function listEfmFiscalYears() {
  return apiRequest<unknown[]>('/efm/fiscal-years');
}

export function listEfmRules(filters?: { sourceModule?: string; status?: string }) {
  const params = new URLSearchParams();
  if (filters?.sourceModule) params.set('sourceModule', filters.sourceModule);
  if (filters?.status) params.set('status', filters.status);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/efm/rules${q}`);
}

export function upsertEfmRule(data: Record<string, unknown>) {
  return apiRequest<unknown>('/efm/rules', { method: 'POST', body: JSON.stringify(data) });
}

export function listEfmJournals(filters?: { status?: string; periodKey?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.periodKey) params.set('periodKey', filters.periodKey);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/efm/journals${q}`);
}

export function generateEfmJournalFromEvent(eventType: string, payload: Record<string, unknown>) {
  return apiRequest<unknown>('/efm/engine/generate', {
    method: 'POST',
    body: JSON.stringify({ eventType, payload }),
  });
}

export function getEfmValidation() {
  return apiRequest<Record<string, unknown>>('/efm/validation');
}

export function listEfmAudit(entityType?: string) {
  const q = entityType ? `?entityType=${encodeURIComponent(entityType)}` : '';
  return apiRequest<unknown[]>(`/efm/audit${q}`);
}

export function listEfmVoucherTypes() {
  return apiRequest<unknown[]>('/efm/voucher-types');
}

export function upsertEfmVoucherType(data: Record<string, unknown>) {
  return apiRequest<unknown>('/efm/voucher-types', { method: 'POST', body: JSON.stringify(data) });
}

export function seedEfmVoucherTypes() {
  return apiRequest<unknown>('/efm/voucher-types/seed', { method: 'POST', body: '{}' });
}

export function listEfmVouchers(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  }
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/efm/vouchers${q}`);
}

export function getEfmVoucher(entryKey: string) {
  return apiRequest<unknown>(`/efm/vouchers/${encodeURIComponent(entryKey)}`);
}

export function createEfmManualVoucher(data: Record<string, unknown>) {
  return apiRequest<unknown>('/efm/vouchers', { method: 'POST', body: JSON.stringify(data) });
}

export function submitEfmVoucher(entryKey: string) {
  return apiRequest<unknown>(`/efm/vouchers/${encodeURIComponent(entryKey)}/submit`, { method: 'POST', body: '{}' });
}

export function approveEfmVoucher(entryKey: string, comments?: string) {
  return apiRequest<unknown>(`/efm/vouchers/${encodeURIComponent(entryKey)}/approve`, {
    method: 'POST',
    body: JSON.stringify({ comments }),
  });
}

export function rejectEfmVoucher(entryKey: string, reason: string) {
  return apiRequest<unknown>(`/efm/vouchers/${encodeURIComponent(entryKey)}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function voidEfmVoucher(entryKey: string, reason: string) {
  return apiRequest<unknown>(`/efm/vouchers/${encodeURIComponent(entryKey)}/void`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function reverseEfmVoucher(entryKey: string, reason?: string) {
  return apiRequest<unknown>(`/efm/vouchers/${encodeURIComponent(entryKey)}/reverse`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function validateEfmVoucher(entryKey: string) {
  return apiRequest<{ valid: boolean; errors: string[] }>(`/efm/vouchers/${encodeURIComponent(entryKey)}/validate`);
}

export function queryEfmJournalBook(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<{ totalEntries: number; totalLines: number; rows: unknown[] }>(`/efm/journal-book${q}`);
}

export function queryEfmLedger(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<{ periodKey: string | null; accounts: unknown[] }>(`/efm/ledger${q}`);
}

export function getEfmLedgerMovements(accountKey: string, filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown>(`/efm/ledger/${encodeURIComponent(accountKey)}/movements${q}`);
}

export function exportEfmJournalBookUrl(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  return `/efm/journal-book/export${params.toString() ? `?${params}` : ''}`;
}

export function exportEfmLedgerUrl(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  return `/efm/ledger/export${params.toString() ? `?${params}` : ''}`;
}
