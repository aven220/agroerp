import { EopsHealthStatus, EopsRunStatus } from '@agroerp/prisma-eops-client';

export function generateEopsKey(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

export const EOPS_HEALTH_TARGETS = [
  { probeKey: 'HC-BACKEND', targetType: 'backend', targetRef: 'nestjs', name: 'Backend API' },
  { probeKey: 'HC-FRONTEND', targetType: 'frontend', targetRef: 'vite', name: 'Frontend' },
  { probeKey: 'HC-DATABASE', targetType: 'database', targetRef: 'postgresql', name: 'Base de datos' },
  { probeKey: 'HC-CACHE', targetType: 'cache', targetRef: 'redis', name: 'Cache' },
  { probeKey: 'HC-MESSAGING', targetType: 'messaging', targetRef: 'redis-streams', name: 'Mensajería' },
  { probeKey: 'HC-GATEWAY', targetType: 'gateway', targetRef: 'eamip', name: 'API Gateway' },
  { probeKey: 'HC-AI', targetType: 'ai', targetRef: 'eaidsp', name: 'Servicios IA' },
  { probeKey: 'HC-INTEGRATION', targetType: 'integration', targetRef: 'eip', name: 'Integraciones' },
  { probeKey: 'HC-STORAGE', targetType: 'storage', targetRef: 'minio', name: 'Almacenamiento' },
  { probeKey: 'HC-NOTIFICATIONS', targetType: 'notifications', targetRef: 'eneac', name: 'Notificaciones' },
] as const;

export const EOPS_HA_STRATEGIES = [
  { strategy: 'horizontal', name: 'Escalamiento horizontal', capabilities: ['load_balancer', 'replication', 'auto_recovery'] },
  { strategy: 'vertical', name: 'Escalamiento vertical', capabilities: ['resource_scaling'] },
  { strategy: 'failover', name: 'Failover activo-pasivo', capabilities: ['failover', 'cluster'] },
  { strategy: 'multi_region', name: 'Multi-región', capabilities: ['replication', 'failover', 'cluster'] },
];

export const EOPS_LICENSE_PLANS = [
  { planKey: 'PLAN-STARTER', name: 'Starter', seats: 10, features: ['core', 'observability'], limits: { users: 10, storage_gb: 50 } },
  { planKey: 'PLAN-BUSINESS', name: 'Business', seats: 100, features: ['core', 'observability', 'bi', 'integrations'], limits: { users: 100, storage_gb: 500 } },
  { planKey: 'PLAN-ENTERPRISE', name: 'Enterprise', seats: 1000, features: ['all'], limits: { users: 10000, storage_gb: 5000 } },
];

export const EOPS_MODULE_SLOTS = [
  'identity', 'eop', 'epop', 'eip', 'eint', 'eaidsp', 'ebiap', 'eneac', 'bpms', 'esdje', 'eiamp',
  'cpep', 'eims', 'escm', 'efm', 'hcm', 'emfg', 'epscm', 'eam',
];

export function aggregateEopsIndicators(data: {
  healthScore: number;
  openIncidents: number;
  failedBackups24h: number;
  securityAlerts: number;
  queueLagMs: number;
  licenseDaysLeft: number;
}) {
  const opsScore = Math.max(
    0,
    Math.min(
      100,
      data.healthScore
        - data.openIncidents * 5
        - data.failedBackups24h * 10
        - data.securityAlerts * 3
        - Math.min(30, Math.floor(data.queueLagMs / 1000)),
    ),
  );
  return {
    healthScore: data.healthScore,
    opsScore,
    openIncidents: data.openIncidents,
    securityAlerts: data.securityAlerts,
    queueLagMs: data.queueLagMs,
    licenseDaysLeft: data.licenseDaysLeft,
    productionReady: opsScore >= 70 && data.licenseDaysLeft > 0,
  };
}

export function rollupHealthStatus(statuses: EopsHealthStatus[]): EopsHealthStatus {
  if (statuses.some((s) => s === 'unhealthy')) return 'unhealthy';
  if (statuses.some((s) => s === 'degraded')) return 'degraded';
  if (statuses.every((s) => s === 'healthy')) return 'healthy';
  return 'unknown';
}

export function mapProbeStatus(ok: boolean, degraded?: boolean): EopsHealthStatus {
  if (!ok) return 'unhealthy';
  if (degraded) return 'degraded';
  return 'healthy';
}

export function computeChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (hash << 5) - hash + data.charCodeAt(i);
    hash |= 0;
  }
  return `chk-${Math.abs(hash).toString(16)}`;
}

export function daysUntil(date: Date | null | undefined): number {
  if (!date) return 999;
  const diff = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function validateSecurityConfig(config: Record<string, unknown>): string[] {
  const issues: string[] = [];
  if (config.jwtSecret === 'change-me' || config.jwtSecret === 'change-me-in-production-use-long-random-string') {
    issues.push('JWT_SECRET uses default value');
  }
  if (config.allowHttp === true) issues.push('HTTP allowed in production');
  if (config.mfaRequired === false && config.environment === 'production') {
    issues.push('MFA not required in production');
  }
  return issues;
}

export function mapRunStatus(success: boolean): EopsRunStatus {
  return success ? 'completed' : 'failed';
}
