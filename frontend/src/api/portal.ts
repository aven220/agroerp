import { apiRequest } from './client';

export function getPortalDashboard(employeeKey?: string) {
  const q = employeeKey ? `?employeeKey=${encodeURIComponent(employeeKey)}` : '';
  return apiRequest<Record<string, unknown>>(`/portal/dashboard${q}`);
}

export function seedPortal() {
  return apiRequest<unknown>('/portal/seed', { method: 'POST', body: '{}' });
}

export function getPortalProfile(employeeKey?: string) {
  const q = employeeKey ? `?employeeKey=${encodeURIComponent(employeeKey)}` : '';
  return apiRequest<Record<string, unknown>>(`/portal/profile${q}`);
}

export function updatePortalProfile(body: Record<string, unknown>) {
  return apiRequest<Record<string, unknown>>('/portal/profile', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function recordPortalLogin(employeeKey?: string) {
  return apiRequest<unknown>('/portal/login', {
    method: 'POST',
    body: JSON.stringify(employeeKey ? { employeeKey } : {}),
  });
}

export function listPortalNews() {
  return apiRequest<unknown[]>('/portal/news');
}

export function listPortalNotices() {
  return apiRequest<unknown[]>('/portal/notices');
}

export function listPortalQuickLinks() {
  return apiRequest<unknown[]>('/portal/quick-links');
}

export function listPortalBirthdays() {
  return apiRequest<unknown[]>('/portal/birthdays');
}

export function listPortalRequests(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/portal/requests${q}`);
}

export function getPortalRequestHistory(employeeKey?: string) {
  const q = employeeKey ? `?employeeKey=${encodeURIComponent(employeeKey)}` : '';
  return apiRequest<unknown[]>(`/portal/requests/history${q}`);
}

export function getPortalVacationSummary(employeeKey?: string) {
  const q = employeeKey ? `?employeeKey=${encodeURIComponent(employeeKey)}` : '';
  return apiRequest<Record<string, unknown>>(`/portal/requests/vacations${q}`);
}

export function createPortalRequest(body: Record<string, unknown>) {
  return apiRequest<unknown>('/portal/requests', { method: 'POST', body: JSON.stringify(body) });
}

export function submitPortalRequest(requestKey: string) {
  return apiRequest<unknown>(`/portal/requests/${encodeURIComponent(requestKey)}/submit`, {
    method: 'POST',
    body: '{}',
  });
}

export function cancelPortalRequest(requestKey: string, reason?: string) {
  return apiRequest<unknown>(`/portal/requests/${encodeURIComponent(requestKey)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function decidePortalRequest(requestKey: string, approved: boolean, comment?: string) {
  return apiRequest<unknown>(`/portal/requests/${encodeURIComponent(requestKey)}/decide`, {
    method: 'POST',
    body: JSON.stringify({ approved, comment }),
  });
}

export function addPortalRequestAttachment(body: Record<string, unknown>) {
  return apiRequest<unknown>('/portal/requests/attachments', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listPortalCertificates() {
  return apiRequest<unknown[]>('/portal/certificates');
}

export function createPortalCertificate(body: Record<string, unknown>) {
  return apiRequest<unknown>('/portal/certificates', { method: 'POST', body: JSON.stringify(body) });
}

export function downloadPortalCertificate(certificateKey: string) {
  return apiRequest<Record<string, unknown>>(`/portal/certificates/${encodeURIComponent(certificateKey)}/download`);
}

export function listPortalPayslips(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<unknown[]>(`/portal/payroll/payslips${q}`);
}

export function previewPortalPayslip(payslipKey: string) {
  return apiRequest<Record<string, unknown>>(`/portal/payroll/payslips/${encodeURIComponent(payslipKey)}/preview`);
}

export function downloadPortalPayslip(payslipKey: string) {
  return apiRequest<Record<string, unknown>>(`/portal/payroll/payslips/${encodeURIComponent(payslipKey)}/download`);
}

export function downloadPortalPayslipsBulk(payslipKeys: string[]) {
  return apiRequest<Record<string, unknown>>('/portal/payroll/payslips/download-bulk', {
    method: 'POST',
    body: JSON.stringify({ payslipKeys }),
  });
}

export function getPortalSalaryHistory(employeeKey?: string) {
  const q = employeeKey ? `?employeeKey=${encodeURIComponent(employeeKey)}` : '';
  return apiRequest<Record<string, unknown>>(`/portal/payroll/salary-history${q}`);
}

export function getPortalContributions(filters?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<Record<string, unknown>>(`/portal/payroll/contributions${q}`);
}

export function getPortalDocumentsCenter(employeeKey?: string) {
  const q = employeeKey ? `?employeeKey=${encodeURIComponent(employeeKey)}` : '';
  return apiRequest<Record<string, unknown>>(`/portal/documents/center${q}`);
}

export function getPortalPersonalDocuments(employeeKey?: string) {
  const q = employeeKey ? `?employeeKey=${encodeURIComponent(employeeKey)}` : '';
  return apiRequest<Record<string, unknown>>(`/portal/documents/personal${q}`);
}

export function downloadPortalPersonalDocument(documentKey: string) {
  return apiRequest<Record<string, unknown>>(`/portal/documents/personal/${encodeURIComponent(documentKey)}/download`);
}

export function listPortalAllCertificates(employeeKey?: string) {
  const q = employeeKey ? `?employeeKey=${encodeURIComponent(employeeKey)}` : '';
  return apiRequest<Record<string, unknown>>(`/portal/documents/certificates${q}`);
}

export function downloadPortalDocCertificate(certificateKey: string, source: 'portal' | 'payroll' = 'portal') {
  return apiRequest<Record<string, unknown>>(
    `/portal/documents/certificates/${encodeURIComponent(certificateKey)}/download?source=${source}`,
  );
}

export function listPortalOfflineDocs() {
  return apiRequest<unknown[]>('/portal/documents/offline');
}

export function savePortalOfflineDoc(body: Record<string, unknown>) {
  return apiRequest<unknown>('/portal/documents/offline', { method: 'POST', body: JSON.stringify(body) });
}
