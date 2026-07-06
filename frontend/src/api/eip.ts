import { apiRequest } from './client';

export interface EipCenter {
  dashboard: Record<string, unknown>;
  ruleBindings: unknown[];
  apis: unknown[];
  webhooks: unknown[];
  esbRoutes: unknown[];
  topics: unknown[];
  connectorSlots: unknown[];
  providers: unknown[];
  externalTargets: unknown[];
  messagingSlots: unknown[];
  connectorCatalog: unknown;
}

export function getEipCenter() {
  return apiRequest<EipCenter>('/eip/center');
}

export function bootstrapEip() {
  return apiRequest<EipCenter>('/eip/bootstrap', { method: 'POST' });
}

export function listEipAudit(entityType?: string) {
  const q = entityType ? `?entityType=${entityType}` : '';
  return apiRequest<unknown[]>(`/eip/audit${q}`);
}

export function listEipBindings(moduleRef?: string) {
  const q = moduleRef ? `?moduleRef=${moduleRef}` : '';
  return apiRequest<unknown[]>(`/eip/bre/bindings${q}`);
}

export function createEipBinding(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eip/bre/bindings', { method: 'POST', body: JSON.stringify(data) });
}

export function listEipBreRules(status?: string) {
  const q = status ? `?status=${status}` : '';
  return apiRequest<unknown[]>(`/eip/bre/rules${q}`);
}

export function simulateEipRule(ruleId: string, payload: Record<string, unknown>) {
  return apiRequest<unknown>(`/eip/bre/rules/${ruleId}/simulate`, {
    method: 'POST',
    body: JSON.stringify({ payload }),
  });
}

export function listEipApis() {
  return apiRequest<unknown[]>('/eip/gateway/apis');
}

export function listEipPolicies() {
  return apiRequest<unknown[]>('/eip/gateway/policies');
}

export function createEipPolicy(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eip/gateway/policies', { method: 'POST', body: JSON.stringify(data) });
}

export function getEipGatewayAnalytics() {
  return apiRequest<unknown>('/eip/gateway/analytics');
}

export function listEipWebhooks(direction?: string) {
  const q = direction ? `?direction=${direction}` : '';
  return apiRequest<unknown[]>(`/eip/webhooks${q}`);
}

export function createEipWebhook(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eip/webhooks', { method: 'POST', body: JSON.stringify(data) });
}

export function listEipWebhookHistory(webhookKey?: string) {
  const q = webhookKey ? `?webhookKey=${webhookKey}` : '';
  return apiRequest<unknown[]>(`/eip/webhooks/history${q}`);
}

export function retryEipWebhooks() {
  return apiRequest<unknown>('/eip/webhooks/retry', { method: 'POST' });
}

export function listEipEsbRoutes(status?: string) {
  const q = status ? `?status=${status}` : '';
  return apiRequest<unknown[]>(`/eip/esb/routes${q}`);
}

export function createEipEsbRoute(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eip/esb/routes', { method: 'POST', body: JSON.stringify(data) });
}

export function listEipEsbMessages(status?: string) {
  const q = status ? `?status=${status}` : '';
  return apiRequest<unknown[]>(`/eip/esb/messages${q}`);
}

export function listEipEventTopics() {
  return apiRequest<unknown[]>('/eip/events/topics');
}

export function publishEipEvent(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eip/events/publish', { method: 'POST', body: JSON.stringify(data) });
}

export function listEipEventMessages(eventType?: string) {
  const q = eventType ? `?eventType=${eventType}` : '';
  return apiRequest<unknown[]>(`/eip/events/messages${q}`);
}

export function listEipDlq() {
  return apiRequest<unknown[]>('/eip/events/dlq');
}

export function getEipConnectorCatalog() {
  return apiRequest<unknown>('/eip/connectors/catalog');
}

export function listEipConnectors() {
  return apiRequest<unknown[]>('/eip/connectors');
}

export function registerEipConnector(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eip/connectors', { method: 'POST', body: JSON.stringify(data) });
}

export function getEipMessagingSlots() {
  return apiRequest<unknown[]>('/eip/messaging/slots');
}

export function listEipMessagingProviders() {
  return apiRequest<unknown[]>('/eip/messaging/providers');
}

export function getEipMonitoringDashboard() {
  return apiRequest<Record<string, unknown>>('/eip/monitoring/dashboard');
}

export function listEipErrors() {
  return apiRequest<unknown[]>('/eip/monitoring/errors');
}

export function listEipInvocations(channel?: string) {
  const q = channel ? `?channel=${channel}` : '';
  return apiRequest<unknown[]>(`/eip/monitoring/invocations${q}`);
}

export function getEipBridgeTargets() {
  return apiRequest<unknown[]>('/eip/bridge/targets');
}

export function bridgeEipEvent(data: Record<string, unknown>) {
  return apiRequest<unknown>('/eip/bridge/event', { method: 'POST', body: JSON.stringify(data) });
}
