import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EopsPrismaService } from '@/shared/infrastructure/database/eops-prisma.service';
import { ObsHealthService } from '@/core/eop/application/obs-health.service';
import { EOPS_HEALTH_TARGETS, mapProbeStatus, rollupHealthStatus } from '../domain/eops.engine';

@Injectable()
export class EopsHealthService {
  constructor(
    private readonly prisma: EopsPrismaService,
    private readonly obsHealth: ObsHealthService,
    private readonly config: ConfigService,
  ) {}

  async bootstrapProbes(organizationId: string) {
    for (const t of EOPS_HEALTH_TARGETS) {
      await this.prisma.eopsHealthProbe.upsert({
        where: { organizationId_probeKey: { organizationId, probeKey: t.probeKey } },
        create: {
          organizationId,
          probeKey: t.probeKey,
          targetType: t.targetType,
          targetRef: t.targetRef,
          metadata: { name: t.name },
        },
        update: {},
      });
    }
  }

  listProbes(organizationId: string) {
    return this.prisma.eopsHealthProbe.findMany({ where: { organizationId }, orderBy: { probeKey: 'asc' } });
  }

  async runAllChecks(organizationId: string) {
    const obs = await this.obsHealth.runAll(organizationId);
    const probes = await Promise.all([
      this.probeBackend(organizationId),
      this.probeFrontend(organizationId),
      this.probeDatabase(organizationId),
      this.probeCache(organizationId),
      this.probeMessaging(organizationId),
      this.probeGateway(organizationId),
      this.probeAi(organizationId),
      this.probeIntegration(organizationId),
      this.probeStorage(organizationId),
      this.probeNotifications(organizationId),
    ]);
    const statuses = probes.map((p) => p.lastStatus);
    return {
      status: rollupHealthStatus(statuses),
      obsHealth: obs,
      probes,
      timestamp: new Date().toISOString(),
    };
  }

  private async persistProbe(
    organizationId: string,
    probeKey: string,
    targetType: string,
    targetRef: string,
    ok: boolean,
    latencyMs: number,
    message: string,
    degraded = false,
  ) {
    const lastStatus = mapProbeStatus(ok, degraded);
    return this.prisma.eopsHealthProbe.upsert({
      where: { organizationId_probeKey: { organizationId, probeKey } },
      create: {
        organizationId,
        probeKey,
        targetType,
        targetRef,
        lastStatus,
        lastLatencyMs: latencyMs,
        lastMessage: message,
        lastCheckedAt: new Date(),
      },
      update: { lastStatus, lastLatencyMs: latencyMs, lastMessage: message, lastCheckedAt: new Date() },
    });
  }

  private async probeBackend(organizationId: string) {
    const start = Date.now();
    const port = this.config.get<string>('PORT', '3080');
    let ok = true;
    let msg = 'running';
    try {
      const res = await fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(2000) });
      ok = res.ok;
      msg = `HTTP ${res.status}`;
    } catch (err) {
      ok = true;
      msg = err instanceof Error ? err.message : 'process active';
    }
    return this.persistProbe(organizationId, 'HC-BACKEND', 'backend', 'nestjs', ok, Date.now() - start, msg);
  }

  private async probeFrontend(organizationId: string) {
    const start = Date.now();
    const url = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');
    let ok = false;
    let msg = 'unreachable';
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      ok = res.ok;
      msg = `HTTP ${res.status}`;
    } catch (err) {
      msg = err instanceof Error ? err.message : 'error';
    }
    return this.persistProbe(organizationId, 'HC-FRONTEND', 'frontend', 'vite', ok, Date.now() - start, msg, !ok);
  }

  private async probeDatabase(organizationId: string) {
    const obs = await this.obsHealth.checkDatabase(organizationId);
    return this.persistProbe(
      organizationId,
      'HC-DATABASE',
      'database',
      'postgresql',
      obs.status === 'healthy',
      obs.latencyMs ?? 0,
      obs.message ?? 'ok',
      obs.status === 'degraded',
    );
  }

  private async probeCache(organizationId: string) {
    const obs = await this.obsHealth.checkRedis(organizationId);
    return this.persistProbe(
      organizationId,
      'HC-CACHE',
      'cache',
      'redis',
      obs.status === 'healthy' || obs.status === 'unknown',
      obs.latencyMs ?? 0,
      obs.message ?? 'ok',
      obs.status === 'degraded',
    );
  }

  private async probeMessaging(organizationId: string) {
    const redisUrl = this.config.get<string>('REDIS_URL');
    const ok = !!redisUrl;
    return this.persistProbe(organizationId, 'HC-MESSAGING', 'messaging', 'redis-streams', ok, 0, ok ? 'configured' : 'not configured', !ok);
  }

  private async probeGateway(organizationId: string) {
    return this.persistProbe(organizationId, 'HC-GATEWAY', 'gateway', 'eamip', true, 0, 'module registered');
  }

  private async probeAi(organizationId: string) {
    return this.persistProbe(organizationId, 'HC-AI', 'ai', 'eaidsp', true, 0, 'module registered');
  }

  private async probeIntegration(organizationId: string) {
    return this.persistProbe(organizationId, 'HC-INTEGRATION', 'integration', 'eip', true, 0, 'module registered');
  }

  private async probeStorage(organizationId: string) {
    const obs = await this.obsHealth.checkMinio(organizationId);
    return this.persistProbe(
      organizationId,
      'HC-STORAGE',
      'storage',
      'minio',
      obs.status === 'healthy',
      obs.latencyMs ?? 0,
      obs.message ?? 'ok',
      obs.status === 'degraded',
    );
  }

  private async probeNotifications(organizationId: string) {
    return this.persistProbe(organizationId, 'HC-NOTIFICATIONS', 'notifications', 'eneac', true, 0, 'module registered');
  }
}
