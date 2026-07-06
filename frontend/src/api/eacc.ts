import { apiRequest } from './client';

export interface EaccCenter {
  dashboard: Record<string, unknown>;
  frameworks: unknown[];
  certifications: unknown[];
  activeAlerts: unknown[];
  openFindings: unknown[];
}

export function getEaccCenter() {
  return apiRequest<EaccCenter>('/eacc/center');
}

export function bootstrapEacc() {
  return apiRequest<EaccCenter>('/eacc/bootstrap', { method: 'POST' });
}

export function getEaccDashboard() {
  return apiRequest<unknown>('/eacc/dashboard');
}

export function listEaccFrameworks() {
  return apiRequest<unknown[]>('/eacc/frameworks');
}

export function listEaccCertifications(certType?: string) {
  const q = certType ? `?certType=${certType}` : '';
  return apiRequest<unknown[]>(`/eacc/certifications${q}`);
}

export function listEaccRequirements() {
  return apiRequest<unknown[]>('/eacc/requirements');
}

export function listEaccChecklists() {
  return apiRequest<unknown[]>('/eacc/checklists');
}

export function listEaccEvidences() {
  return apiRequest<unknown[]>('/eacc/evidences');
}

export function listEaccAlerts() {
  return apiRequest<unknown[]>('/eacc/alerts');
}

export function listEaccAuditPlans() {
  return apiRequest<unknown[]>('/eacc/audit-plans');
}

export function listEaccAudits(auditType?: string) {
  const q = auditType ? `?auditType=${auditType}` : '';
  return apiRequest<unknown[]>(`/eacc/audits${q}`);
}

export function listEaccFindings() {
  return apiRequest<unknown[]>('/eacc/findings');
}

export function listEaccDocuments(docType?: string) {
  const q = docType ? `?docType=${docType}` : '';
  return apiRequest<unknown[]>(`/eacc/documents${q}`);
}

export function listEaccSustainabilityIndicators(category?: string) {
  const q = category ? `?category=${category}` : '';
  return apiRequest<unknown[]>(`/eacc/sustainability/indicators${q}`);
}

export function listEaccEsgIndicators(pillar?: string) {
  const q = pillar ? `?pillar=${pillar}` : '';
  return apiRequest<unknown[]>(`/eacc/esg/indicators${q}`);
}

export function listEaccEsgObjectives() {
  return apiRequest<unknown[]>('/eacc/esg/objectives');
}

export function listEaccEsgReports() {
  return apiRequest<unknown[]>('/eacc/esg/reports');
}

export function listEaccFootprintConfigs() {
  return apiRequest<unknown[]>('/eacc/footprint/configs');
}

export function listEaccSafetyIncidents() {
  return apiRequest<unknown[]>('/eacc/safety/incidents');
}
