import { apiRequest } from './client';

export interface EsdjeCenter {
  dashboard: {
    totalJobs: number;
    activeJobs: number;
    runs24h: number;
    failures24h: number;
    avgDurationMs: number;
    queuedRuns: number;
    runningRuns: number;
    deadLetters: number;
    onlineWorkers: number;
    successRatePct: number;
    topJobs: Array<{ jobKey: string; count: number }>;
    queues: Array<{
      queueKey: string;
      name: string;
      priority: string;
      jobCount: number;
      maxConcurrency: number;
    }>;
  };
  suggestions: unknown[];
}

export interface EsdjeJob {
  id: string;
  jobKey: string;
  name: string;
  description?: string;
  status: string;
  jobType: string;
  handlerType: string;
  cronExpression?: string;
  timezone: string;
  nextRunAt?: string;
  runAt?: string;
  priority: number;
  maxRetries: number;
  retryStrategy: string;
  eventTypes: string[];
  queue?: { queueKey: string; name: string };
}

export interface EsdjeJobRun {
  id: string;
  jobId: string;
  jobKey: string;
  status: string;
  attempt: number;
  durationMs: number;
  error?: string;
  workerNode?: string;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
}

export interface EsdjeQueue {
  id: string;
  queueKey: string;
  name: string;
  moduleKey: string;
  priority: string;
  maxConcurrency: number;
  _count?: { jobs: number };
}

export interface EsdjeWorker {
  id: string;
  workerKey: string;
  nodeId: string;
  hostname?: string;
  status: string;
  capacity: number;
  currentLoad: number;
  modules: string[];
  lastHeartbeat: string;
}

export function getEsdjeCenter() {
  return apiRequest<EsdjeCenter>('/esdje/center');
}

export function listEsdjeJobs(status?: string) {
  const q = status ? `?status=${status}` : '';
  return apiRequest<EsdjeJob[]>(`/esdje/jobs${q}`);
}

export function getEsdjeJob(id: string) {
  return apiRequest<EsdjeJob>(`/esdje/jobs/${id}`);
}

export function createEsdjeJob(data: Record<string, unknown>) {
  return apiRequest<EsdjeJob>('/esdje/jobs', { method: 'POST', body: JSON.stringify(data) });
}

export function updateEsdjeJob(id: string, data: Record<string, unknown>) {
  return apiRequest<EsdjeJob>(`/esdje/jobs/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function pauseEsdjeJob(id: string) {
  return apiRequest<EsdjeJob>(`/esdje/jobs/${id}/pause`, { method: 'POST' });
}

export function resumeEsdjeJob(id: string) {
  return apiRequest<EsdjeJob>(`/esdje/jobs/${id}/resume`, { method: 'POST' });
}

export function runEsdjeJob(id: string) {
  return apiRequest<unknown>(`/esdje/jobs/${id}/run`, { method: 'POST' });
}

export function cancelEsdjeJob(id: string) {
  return apiRequest<EsdjeJob>(`/esdje/jobs/${id}/cancel`, { method: 'POST' });
}

export function listEsdjeRuns(jobId?: string) {
  const q = jobId ? `?jobId=${jobId}` : '';
  return apiRequest<EsdjeJobRun[]>(`/esdje/runs${q}`);
}

export function listEsdjeCalendar() {
  return apiRequest<EsdjeJob[]>('/esdje/calendar');
}

export function listEsdjeQueues() {
  return apiRequest<EsdjeQueue[]>('/esdje/queues');
}

export function createEsdjeQueue(data: Record<string, unknown>) {
  return apiRequest<EsdjeQueue>('/esdje/queues', { method: 'POST', body: JSON.stringify(data) });
}

export function listEsdjeWorkers() {
  return apiRequest<EsdjeWorker[]>('/esdje/workers');
}

export function listEsdjeDeadLetters(all?: boolean) {
  const q = all ? '?all=true' : '';
  return apiRequest<unknown[]>(`/esdje/dead-letters${q}`);
}

export function requeueEsdjeDeadLetter(id: string) {
  return apiRequest<unknown>(`/esdje/dead-letters/${id}/requeue`, { method: 'POST' });
}

export function getEsdjeAiSuggestions() {
  return apiRequest<unknown[]>('/esdje/ai/suggestions');
}
