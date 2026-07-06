import { apiRequest } from './client';

export interface BreCenter {
  dashboard: {
    totalRules: number;
    publishedRules: number;
    executions24h: number;
    failures24h: number;
    avgDurationMs: number;
    simulations24h: number;
    openConflicts: number;
    topRules: Array<{ ruleKey: string; count: number }>;
    successRatePct: number;
  };
  groups: unknown[];
  suggestions: unknown[];
}

export interface BreRule {
  id: string;
  ruleKey: string;
  name: string;
  description?: string;
  status: string;
  version: number;
  priority: number;
  triggerType: string;
  eventTypes: string[];
  eventCategory: string;
  conditions: Record<string, unknown>;
  expressions: unknown[];
  actions: unknown[];
  dependencies: string[];
  schedule: Record<string, unknown>;
  group?: { groupKey: string; name: string };
}

export function getBreCenter() {
  return apiRequest<BreCenter>('/ebre/center');
}

export function listBreRules(status?: string, groupKey?: string) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (groupKey) params.set('groupKey', groupKey);
  const q = params.toString() ? `?${params}` : '';
  return apiRequest<BreRule[]>(`/ebre/rules${q}`);
}

export function getBreRule(id: string) {
  return apiRequest<BreRule>(`/ebre/rules/${id}`);
}

export function createBreRule(data: Record<string, unknown>) {
  return apiRequest<BreRule>('/ebre/rules', { method: 'POST', body: JSON.stringify(data) });
}

export function updateBreRule(id: string, data: Record<string, unknown>) {
  return apiRequest<BreRule>(`/ebre/rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function cloneBreRule(id: string, newKey: string, newName: string) {
  return apiRequest<BreRule>(`/ebre/rules/${id}/clone`, {
    method: 'POST',
    body: JSON.stringify({ newKey, newName }),
  });
}

export function publishBreRule(id: string) {
  return apiRequest<BreRule>(`/ebre/rules/${id}/publish`, { method: 'POST' });
}

export function unpublishBreRule(id: string) {
  return apiRequest<BreRule>(`/ebre/rules/${id}/unpublish`, { method: 'POST' });
}

export function versionBreRule(id: string, changelog?: string) {
  return apiRequest<BreRule>(`/ebre/rules/${id}/version`, {
    method: 'POST',
    body: JSON.stringify({ changelog }),
  });
}

export function listBreRuleVersions(id: string) {
  return apiRequest<unknown[]>(`/ebre/rules/${id}/versions`);
}

export function exportBreRule(id: string) {
  return apiRequest<unknown>(`/ebre/rules/${id}/export`);
}

export function importBreRule(data: Record<string, unknown>) {
  return apiRequest<BreRule>('/ebre/rules/import', { method: 'POST', body: JSON.stringify(data) });
}

export function simulateBreRule(id: string, input: Record<string, unknown>) {
  return apiRequest<unknown>(`/ebre/rules/${id}/simulate`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function simulateBreBatch(eventType: string, payload?: Record<string, unknown>) {
  return apiRequest<unknown>('/ebre/simulate/batch', {
    method: 'POST',
    body: JSON.stringify({ eventType, payload }),
  });
}

export function listBreExecutions(ruleId?: string) {
  const q = ruleId ? `?ruleId=${ruleId}` : '';
  return apiRequest<unknown[]>(`/ebre/executions${q}`);
}

export function listBreAudit(ruleId?: string) {
  const q = ruleId ? `?ruleId=${ruleId}` : '';
  return apiRequest<unknown[]>(`/ebre/audit${q}`);
}

export function listBreGroups() {
  return apiRequest<unknown[]>('/ebre/groups');
}

export function createBreGroup(data: Record<string, unknown>) {
  return apiRequest<unknown>('/ebre/groups', { method: 'POST', body: JSON.stringify(data) });
}

export function listDecisionTables() {
  return apiRequest<unknown[]>('/ebre/decision-tables');
}

export function getBreAiSuggestions() {
  return apiRequest<unknown[]>('/ebre/ai/suggestions');
}

export function getBreRuleConflicts(id: string) {
  return apiRequest<unknown[]>(`/ebre/rules/${id}/conflicts`);
}
