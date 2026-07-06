import { apiRequest } from './client';

export interface IamCenter {
  dashboard: {
    events24h: number;
    loginSuccess24h: number;
    loginFailure24h: number;
    accessDenied24h: number;
    openAnomalies: number;
  };
  policy: Record<string, unknown>;
  alerts: Array<{ id: string; alertType: string; severity: string; description: string }>;
  activeSessions: number;
  userCount: number;
  roleCount: number;
}

export function getIamCenter() {
  return apiRequest<IamCenter>('/eiamp/center');
}

export function getIamSecurityPolicy() {
  return apiRequest<Record<string, unknown>>('/eiamp/security-policy');
}

export function updateIamSecurityPolicy(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eiamp/security-policy', { method: 'PATCH', body: JSON.stringify(data) });
}

export function listIamAudit(eventType?: string) {
  const q = eventType ? `?eventType=${eventType}` : '';
  return apiRequest<unknown[]>(`/eiamp/audit${q}`);
}

export function listIamSessions(userId?: string) {
  const q = userId ? `?userId=${userId}` : '';
  return apiRequest<unknown[]>(`/eiamp/sessions${q}`);
}

export function revokeIamSession(id: string) {
  return apiRequest<unknown>(`/eiamp/sessions/${id}`, { method: 'DELETE' });
}

export function listIamUsers() {
  return apiRequest<unknown[]>('/eiamp/users');
}

export function listIamRoles() {
  return apiRequest<unknown[]>('/eiamp/roles');
}

export function listIamPermissions() {
  return apiRequest<unknown[]>('/eiamp/permissions');
}

export function getEffectivePermissions() {
  return apiRequest<unknown>('/eiamp/permissions/effective');
}

export function listIamAnomalies() {
  return apiRequest<unknown[]>('/eiamp/anomalies');
}

export function setupIamMfa() {
  return apiRequest<{ factorId: string; secret: string; otpauth: string }>('/eiamp/mfa/totp/setup', { method: 'POST' });
}

export function verifyIamMfa(code: string) {
  return apiRequest<unknown>('/eiamp/mfa/totp/verify', { method: 'POST', body: JSON.stringify({ code }) });
}

export function changePassword(currentPassword: string, newPassword: string) {
  return apiRequest<unknown>('/eiamp/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function exportIamRole(id: string) {
  return apiRequest<unknown>(`/eiamp/roles/${id}/export`);
}

export function listIamRowPolicies(resourceType?: string) {
  const q = resourceType ? `?resourceType=${resourceType}` : '';
  return apiRequest<unknown[]>(`/eiamp/row-policies${q}`);
}

export function listIamSsoProviders() {
  return apiRequest<unknown[]>('/eiamp/sso/providers');
}
