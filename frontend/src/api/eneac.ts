import { apiRequest } from './client';

export interface NotificationMessage {
  id: string;
  title: string;
  body?: string | null;
  alertSeverity: string;
  channel: string;
  status: string;
  isImportant: boolean;
  groupKey?: string | null;
  sourceEventType?: string | null;
  readAt?: string | null;
  attendedAt?: string | null;
  createdAt: string;
  payload?: Record<string, unknown>;
  deliveries?: Array<{ id: string; channel: string; status: string; latencyMs?: number | null }>;
}

export interface NotificationRule {
  id: string;
  ruleKey: string;
  name: string;
  description?: string | null;
  status: string;
  priority: number;
  eventTypes: string[];
  eventCategory: string;
  alertSeverity: string;
  conditions: Record<string, unknown>;
  channels: Array<{ channel: string; template?: string; subject?: string }>;
  recipients: Array<{ type: string; ref?: string }>;
  schedule?: Record<string, unknown>;
  escalation?: Record<string, unknown>;
  suppression?: Record<string, unknown>;
}

export interface EneacDashboard {
  kpis: {
    unread: number;
    important: number;
    deliveredLast24h: number;
    failedDeliveries: number;
    activeRules: number;
    pendingSchedules: number;
    avgDeliveryLatencyMs: number;
    avgReadMinutes: number;
    avgAttendMinutes: number;
  };
  bySeverity: Array<{ severity: string; count: number }>;
  byChannel: Array<{ channel: string; count: number }>;
  aiReadiness: Record<string, boolean>;
}

export function getEneacInbox(params?: {
  status?: string;
  search?: string;
  severity?: string;
  groupKey?: string;
  important?: boolean;
}) {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.search) q.set('search', params.search);
  if (params?.severity) q.set('severity', params.severity);
  if (params?.groupKey) q.set('groupKey', params.groupKey);
  if (params?.important) q.set('important', 'true');
  const qs = q.toString();
  return apiRequest<NotificationMessage[]>(`/eneac/inbox${qs ? `?${qs}` : ''}`);
}

export function markNotificationRead(id: string) {
  return apiRequest<NotificationMessage>(`/eneac/inbox/${id}/read`, { method: 'PATCH' });
}

export function markNotificationImportant(id: string, important: boolean) {
  return apiRequest<NotificationMessage>(`/eneac/inbox/${id}/important`, {
    method: 'PATCH',
    body: JSON.stringify({ important }),
  });
}

export function archiveNotification(id: string) {
  return apiRequest<NotificationMessage>(`/eneac/inbox/${id}/archive`, { method: 'PATCH' });
}

export function deleteNotification(id: string) {
  return apiRequest<NotificationMessage>(`/eneac/inbox/${id}`, { method: 'DELETE' });
}

export function commentNotification(id: string, content: string) {
  return apiRequest<NotificationMessage>(`/eneac/inbox/${id}/comment`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export function attendNotification(id: string) {
  return apiRequest<NotificationMessage>(`/eneac/inbox/${id}/attend`, { method: 'POST' });
}

export function assignNotification(id: string, userId: string) {
  return apiRequest<NotificationMessage>(`/eneac/inbox/${id}/assign`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export function getEneacDashboard() {
  return apiRequest<EneacDashboard>('/eneac/dashboard');
}

export function getEneacTimeline(from?: string, to?: string, eventType?: string) {
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  if (eventType) q.set('eventType', eventType);
  const qs = q.toString();
  return apiRequest<{ domainEvents: unknown[]; notifications: NotificationMessage[] }>(
    `/eneac/timeline${qs ? `?${qs}` : ''}`,
  );
}

export function listNotificationRules() {
  return apiRequest<NotificationRule[]>('/eneac/rules');
}

export function createNotificationRule(data: Partial<NotificationRule> & { ruleKey: string; name: string; eventTypes: string[]; channels: NotificationRule['channels']; recipients: NotificationRule['recipients'] }) {
  return apiRequest<NotificationRule>('/eneac/rules', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateNotificationRule(id: string, data: Partial<NotificationRule>) {
  return apiRequest<NotificationRule>(`/eneac/rules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function activateNotificationRule(id: string) {
  return apiRequest<NotificationRule>(`/eneac/rules/${id}/activate`, { method: 'POST' });
}

export function deactivateNotificationRule(id: string) {
  return apiRequest<NotificationRule>(`/eneac/rules/${id}/deactivate`, { method: 'POST' });
}

export function sendNotification(data: {
  recipientId?: string;
  title: string;
  body?: string;
  alertSeverity?: string;
}) {
  return apiRequest<NotificationMessage>('/eneac/send', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export const ALERT_SEVERITY_LABELS: Record<string, string> = {
  info: 'Informativa',
  warning: 'Advertencia',
  critical: 'Crítica',
  emergency: 'Emergencia',
  operational: 'Operativa',
  financial: 'Financiera',
  logistics: 'Logística',
  quality: 'Calidad',
  security: 'Seguridad',
  geographic: 'Geográfica',
};
