import { EopHealthStatus } from '@agroerp/shared';

export function rollupHealth(statuses: EopHealthStatus[]): EopHealthStatus {
  if (!statuses.length) return 'unknown';
  if (statuses.some((s) => s === 'unhealthy')) return 'unhealthy';
  if (statuses.some((s) => s === 'degraded')) return 'degraded';
  if (statuses.every((s) => s === 'healthy')) return 'healthy';
  return 'unknown';
}

export function latencyToHealth(latencyMs: number | null | undefined, warnMs = 500, criticalMs = 2000): EopHealthStatus {
  if (latencyMs == null) return 'unknown';
  if (latencyMs >= criticalMs) return 'unhealthy';
  if (latencyMs >= warnMs) return 'degraded';
  return 'healthy';
}
