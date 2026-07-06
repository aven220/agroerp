import { apiRequest } from './client';

export interface WorkflowDefinition {
  id: string;
  workflowKey: string;
  name: string;
  description?: string | null;
  resourceType?: string | null;
  active: boolean;
  metadata?: Record<string, unknown>;
  versions: WorkflowVersion[];
  createdAt: string;
}

export interface WorkflowVersion {
  id: string;
  version: number;
  status: string;
  definition: WorkflowDefinitionSchema;
  changelog?: string | null;
  publishedAt?: string | null;
}

export interface WorkflowStateDefinition {
  key: string;
  name: string;
  type: 'initial' | 'intermediate' | 'final' | 'cancelled';
  slaHours?: number;
  gatewayType?: string;
  subprocessKey?: string;
  forms?: {
    required?: string[];
    optional?: string[];
    requireGps?: boolean;
    requireSignature?: boolean;
  };
  metadata?: Record<string, unknown>;
}

export interface WorkflowTransitionDefinition {
  key: string;
  name: string;
  from: string;
  to: string;
  permissions?: string[];
  participants?: Array<{ type: string; ref?: string }>;
  requirements?: { comment?: boolean; signature?: boolean; gps?: boolean };
  dueInHours?: number;
  priority?: string;
}

export interface WorkflowDefinitionSchema {
  version: number;
  settings?: {
    defaultSlaHours?: number;
    processCategory?: string;
    aiReadiness?: Record<string, boolean>;
  };
  states: WorkflowStateDefinition[];
  transitions: WorkflowTransitionDefinition[];
  rules?: Array<{ key: string; name: string; scope: string; rule: unknown }>;
}

export interface WorkflowInstance {
  id: string;
  workflowKey?: string;
  currentState: string;
  status: string;
  priority?: string;
  startedAt: string;
  dueAt?: string | null;
  completedAt?: string | null;
  context?: Record<string, unknown>;
  workflowDefinition?: { workflowKey: string; name: string };
  workflowVersion?: { version: number };
  assignments?: WorkflowAssignment[];
  history?: WorkflowHistoryEntry[];
}

export interface WorkflowAssignment {
  id: string;
  stateKey: string;
  transitionKey?: string | null;
  status: string;
  userId: string;
  dueAt?: string | null;
  instance?: WorkflowInstance;
}

export interface WorkflowHistoryEntry {
  id: string;
  eventType: string;
  fromState?: string | null;
  toState?: string | null;
  transitionKey?: string | null;
  actorId?: string | null;
  comment?: string | null;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowDashboard {
  summary: {
    activeProcesses: number;
    suspendedProcesses: number;
    overdueProcesses: number;
    completedLast30Days: number;
    averageCompletionHours: number;
  };
  bottlenecks: Array<{ state: string; count: number }>;
  workloadByUser: Array<{ userId: string; pendingAssignments: number }>;
  sla: { overdue: number; onTrack: number };
}

export function listWorkflowDefinitions() {
  return apiRequest<WorkflowDefinition[]>('/workflows/definitions');
}

export function getWorkflowBootstrap() {
  return apiRequest<{ definitions: WorkflowDefinition[]; categories: string[] }>(
    '/workflows/definitions/bootstrap',
  );
}

export function getWorkflowDefinition(id: string) {
  return apiRequest<WorkflowDefinition>(`/workflows/definitions/${id}`);
}

export function createWorkflowDefinition(data: {
  workflowKey: string;
  name: string;
  description?: string;
  resourceType?: string;
  definition: WorkflowDefinitionSchema;
}) {
  return apiRequest<WorkflowDefinition>('/workflows/definitions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function createWorkflowVersion(definitionId: string, data: {
  definition?: WorkflowDefinitionSchema;
  changelog?: string;
}) {
  return apiRequest<WorkflowVersion>(`/workflows/definitions/${definitionId}/versions`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateWorkflowVersion(versionId: string, data: {
  definition?: WorkflowDefinitionSchema;
  changelog?: string;
}) {
  return apiRequest<WorkflowVersion>(`/workflows/definitions/versions/${versionId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function publishWorkflowVersion(versionId: string) {
  return apiRequest<WorkflowVersion>(`/workflows/definitions/versions/${versionId}/publish`, {
    method: 'POST',
  });
}

export function cloneWorkflowDefinition(id: string, workflowKey: string, name?: string) {
  return apiRequest<WorkflowDefinition>(`/workflows/definitions/${id}/clone`, {
    method: 'POST',
    body: JSON.stringify({ workflowKey, name }),
  });
}

export function deactivateWorkflowDefinition(id: string) {
  return apiRequest<WorkflowDefinition>(`/workflows/definitions/${id}/deactivate`, {
    method: 'POST',
  });
}

export function exportWorkflowDefinition(id: string) {
  return apiRequest<{ format: string; definition: Record<string, unknown> }>(
    `/workflows/definitions/${id}/export`,
  );
}

export function importWorkflowDefinition(content: string, options?: {
  workflowKey?: string;
  publish?: boolean;
}) {
  return apiRequest<{ definitionId: string; imported: boolean }>('/workflows/definitions/import', {
    method: 'POST',
    body: JSON.stringify({ content, ...options }),
  });
}

export function listWorkflowInstances(params?: {
  status?: string;
  workflowKey?: string;
  assigneeId?: string;
}) {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.workflowKey) q.set('workflowKey', params.workflowKey);
  if (params?.assigneeId) q.set('assigneeId', params.assigneeId);
  const qs = q.toString();
  return apiRequest<WorkflowInstance[]>(`/workflows/instances${qs ? `?${qs}` : ''}`);
}

export function getWorkflowInstance(id: string) {
  return apiRequest<WorkflowInstance>(`/workflows/instances/${id}`);
}

export function getWorkflowHistory(id: string) {
  return apiRequest<WorkflowHistoryEntry[]>(`/workflows/instances/${id}/history`);
}

export function getWorkflowInbox() {
  return apiRequest<WorkflowAssignment[]>('/workflows/instances/inbox');
}

export function getWorkflowDashboard() {
  return apiRequest<WorkflowDashboard>('/workflows/instances/metrics');
}

export function startWorkflowInstance(data: {
  workflowKey?: string;
  versionId?: string;
  resourceId?: string;
  resourceType?: string;
  context?: Record<string, unknown>;
  priority?: string;
}) {
  return apiRequest<WorkflowInstance>('/workflows/instances', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function executeWorkflowTransition(instanceId: string, data: {
  transitionKey: string;
  comment?: string;
  variables?: Record<string, unknown>;
  gpsLocation?: Record<string, unknown>;
}) {
  return apiRequest<WorkflowInstance>(`/workflows/instances/${instanceId}/transitions`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function suspendWorkflowInstance(id: string) {
  return apiRequest<WorkflowInstance>(`/workflows/instances/${id}/suspend`, { method: 'POST' });
}

export function resumeWorkflowInstance(id: string) {
  return apiRequest<WorkflowInstance>(`/workflows/instances/${id}/resume`, { method: 'POST' });
}

export function cancelWorkflowInstance(id: string, reason: string) {
  return apiRequest<WorkflowInstance>(`/workflows/instances/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function reassignWorkflowTask(assignmentId: string, userId: string) {
  return apiRequest<WorkflowAssignment>(
    `/workflows/instances/assignments/${assignmentId}/reassign`,
    { method: 'POST', body: JSON.stringify({ userId }) },
  );
}

export const PROCESS_CATEGORIES = [
  'compras',
  'contratos',
  'pagos',
  'inventario',
  'calidad',
  'visitas_tecnicas',
  'formularios',
  'aprobaciones',
  'logistica',
  'mantenimiento',
  'finanzas',
  'auditoria',
  'recursos_humanos',
] as const;

export const STATE_TYPE_LABELS: Record<string, string> = {
  initial: 'Inicial',
  intermediate: 'Intermedio',
  final: 'Final',
  cancelled: 'Cancelado',
};

export function createEmptyWorkflowSchema(category?: string): WorkflowDefinitionSchema {
  return {
    version: 1,
    settings: {
      defaultSlaHours: 48,
      processCategory: category ?? 'aprobaciones',
      aiReadiness: {
        bottleneckDetection: true,
        routeRecommendation: true,
        durationPrediction: true,
      },
    },
    states: [
      { key: 'draft', name: 'Borrador', type: 'initial' },
      { key: 'in_progress', name: 'En progreso', type: 'intermediate', slaHours: 24 },
      { key: 'completed', name: 'Completado', type: 'final' },
      { key: 'cancelled', name: 'Cancelado', type: 'cancelled' },
    ],
    transitions: [
      { key: 'start', name: 'Iniciar', from: 'draft', to: 'in_progress', permissions: ['workflow:execute'] },
      { key: 'complete', name: 'Completar', from: 'in_progress', to: 'completed', permissions: ['workflow:approve'] },
      { key: 'cancel', name: 'Cancelar', from: '*', to: 'cancelled', permissions: ['workflow:cancel'] },
    ],
  };
}
