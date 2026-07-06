import { apiRequest } from './client';

export interface EpopDashboard {
  responseTimeAvg: number;
  slowQueries24h: number;
  indexRecommendations: number;
  benchmarks: number;
  maintenanceJobs: number;
  memoryMb: number;
  cpuLoad: number;
  metrics: {
    summary: Record<string, { avg: number; max: number; count: number }>;
    byModule: Array<{ moduleKey: string; avgLatency: number; count: number }>;
    sampleCount: number;
  };
  bundles: {
    totalBytes: number;
    totalGzip: number;
    bundles: number;
    cdnReady: boolean;
    codeSplitting: boolean;
  };
  mobile: {
    avgStartupMs: number;
    avgMemoryMb: number;
    avgFps: number;
    avgSyncMs: number;
    offlineFirst: boolean;
  };
  features: Record<string, boolean>;
}

export interface EpopPaginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function getEpopCenter() {
  return apiRequest<EpopDashboard>('/epop/center');
}

export function listEpopSlowQueries(page = 1, pageSize = 25) {
  return apiRequest<EpopPaginated<Record<string, unknown>>>(`/epop/slow-queries?page=${page}&pageSize=${pageSize}`);
}

export function listEpopMetrics(page = 1, pageSize = 25) {
  return apiRequest<EpopPaginated<Record<string, unknown>>>(`/epop/metrics?page=${page}&pageSize=${pageSize}`);
}

export function listEpopIndexes() {
  return apiRequest<unknown[]>('/epop/indexes');
}

export function analyzeEpopIndexes() {
  return apiRequest<unknown>('/epop/indexes/analyze', { method: 'POST' });
}

export function applyEpopIndex(recommendationKey: string) {
  return apiRequest<unknown>(`/epop/indexes/${recommendationKey}/apply`, { method: 'POST' });
}

export function listEpopBenchmarks() {
  return apiRequest<unknown[]>('/epop/benchmarks');
}

export function runEpopBenchmark(name: string, scenario: string) {
  return apiRequest<unknown>('/epop/benchmarks', {
    method: 'POST',
    body: JSON.stringify({ name, scenario }),
  });
}

export function getEpopBundleSummary() {
  return apiRequest<EpopDashboard['bundles']>('/epop/bundles/summary');
}

export function getEpopMobileSummary() {
  return apiRequest<EpopDashboard['mobile']>('/epop/mobile');
}

export function getEpopCacheStats() {
  return apiRequest<unknown[]>('/epop/cache/stats/summary');
}

export function listEpopMaintenance() {
  return apiRequest<unknown[]>('/epop/maintenance');
}

export function runEpopMaintenance(jobKey: string) {
  return apiRequest<unknown>(`/epop/maintenance/${jobKey}/run`, { method: 'POST' });
}

export function setEpopCache(cacheKey: string, value: Record<string, unknown>, ttlSeconds = 300) {
  return apiRequest<unknown>('/epop/cache', {
    method: 'POST',
    body: JSON.stringify({ cacheKey, value, ttlSeconds, layer: 'client' }),
  });
}
