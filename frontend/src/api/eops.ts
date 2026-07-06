import { apiRequest } from './client';

export interface EopsCenter {
  dashboard: Record<string, unknown>;
  globalConfigs: unknown[];
  flags: unknown[];
  backupSchedules: unknown[];
  deployments: unknown[];
  plans: unknown[];
  policies: unknown[];
  probes: unknown[];
}

export function getEopsCenter() {
  return apiRequest<EopsCenter>('/eops/center');
}

export function bootstrapEops() {
  return apiRequest<EopsCenter>('/eops/bootstrap', { method: 'POST' });
}

export function listEopsAudit(entityType?: string) {
  const q = entityType ? `?entityType=${entityType}` : '';
  return apiRequest<unknown[]>(`/eops/audit${q}`);
}

export function getEopsMonitoring() {
  return apiRequest<unknown>('/eops/monitoring/dashboard');
}

export function getEopsObservability() {
  return apiRequest<unknown>('/eops/observability/dashboard');
}

export function runEopsHealthCheck() {
  return apiRequest<unknown>('/eops/health/check', { method: 'POST' });
}

export function listEopsHealthProbes() {
  return apiRequest<unknown[]>('/eops/health/probes');
}

export function listEopsGlobalConfigs() {
  return apiRequest<unknown[]>('/eops/admin/configs');
}

export function listEopsFeatureFlags() {
  return apiRequest<unknown[]>('/eops/config/flags');
}

export function listEopsBackupSchedules() {
  return apiRequest<unknown[]>('/eops/backups/schedules');
}

export function listEopsBackupRuns() {
  return apiRequest<unknown[]>('/eops/backups/runs');
}

export function listEopsDeployments() {
  return apiRequest<unknown[]>('/eops/devops/deployments');
}

export function listEopsWorkerJobs() {
  return apiRequest<unknown[]>('/eops/devops/workers');
}

export function getEopsOptimization() {
  return apiRequest<unknown>('/eops/optimization/dashboard');
}

export function listEopsLicensePlans() {
  return apiRequest<unknown[]>('/eops/licenses/plans');
}

export function listEopsLicenses() {
  return apiRequest<unknown[]>('/eops/licenses');
}

export function getEopsLicenseUsage() {
  return apiRequest<unknown>('/eops/licenses/usage');
}

export function listEopsSecurityPolicies() {
  return apiRequest<unknown[]>('/eops/security/policies');
}

export function listEopsSecurityAlerts() {
  return apiRequest<unknown[]>('/eops/security/alerts');
}

export function runEopsSecurityScan() {
  return apiRequest<unknown>('/eops/security/scan', { method: 'POST' });
}

export function getEopsHaReadiness() {
  return apiRequest<unknown>('/eops/ha/readiness');
}

export function listEopsMaintenance() {
  return apiRequest<unknown[]>('/eops/admin/maintenance');
}

export function getEopsBridgeModules() {
  return apiRequest<unknown[]>('/eops/bridge/modules');
}
