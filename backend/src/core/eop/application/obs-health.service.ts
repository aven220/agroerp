import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { latencyToHealth, rollupHealth } from '../domain/health.engine';

@Injectable()
export class ObsHealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly core: CoreEngineService,
  ) {}

  async runAll(organizationId?: string) {
    const results = await Promise.all([
      this.checkDatabase(organizationId),
      this.checkRedis(organizationId),
      this.checkMinio(organizationId),
      this.checkApiLiveness(organizationId),
      this.checkApiReadiness(organizationId),
      this.checkStartup(organizationId),
    ]);
    return {
      status: rollupHealth(results.map((r) => r.status as 'healthy')),
      checks: results,
      timestamp: new Date().toISOString(),
    };
  }

  async checkDatabase(organizationId?: string) {
    const start = Date.now();
    let status: 'healthy' | 'unhealthy' = 'healthy';
    let message = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      status = 'unhealthy';
      message = err instanceof Error ? err.message : 'db error';
    }
    const latencyMs = Date.now() - start;
    return this.persist(organizationId, 'database', 'Database', 'dependency', 'database', status, latencyMs, message);
  }

  async checkRedis(organizationId?: string) {
    const start = Date.now();
    const redisUrl = this.config.get<string>('REDIS_URL');
    let status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown' = 'unknown';
    let message = 'not configured';
    if (redisUrl) {
      try {
        const Redis = (await import('ioredis')).default;
        const client = new Redis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 2000, lazyConnect: true });
        await client.connect();
        const pong = await client.ping();
        await client.quit();
        status = pong === 'PONG' ? 'healthy' : 'degraded';
        message = pong;
      } catch (err) {
        status = 'unhealthy';
        message = err instanceof Error ? err.message : 'redis error';
      }
    }
    return this.persist(organizationId, 'redis', 'Redis', 'dependency', 'redis', status, Date.now() - start, message);
  }

  async checkMinio(organizationId?: string) {
    const start = Date.now();
    const endpoint = this.config.get<string>('S3_ENDPOINT', 'http://localhost:9000');
    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    let message = 'ok';
    try {
      const res = await fetch(`${endpoint}/minio/health/live`, { signal: AbortSignal.timeout(2000) });
      status = res.ok ? 'healthy' : 'degraded';
      message = `HTTP ${res.status}`;
    } catch (err) {
      status = 'unhealthy';
      message = err instanceof Error ? err.message : 'minio error';
    }
    return this.persist(organizationId, 'minio', 'MinIO', 'dependency', 'minio', status, Date.now() - start, message);
  }

  async checkApiLiveness(organizationId?: string) {
    return this.persist(organizationId, 'api-liveness', 'API Liveness', 'liveness', 'backend', 'healthy', 0, 'process alive');
  }

  async checkApiReadiness(organizationId?: string) {
    const db = await this.checkDatabase(organizationId);
    const status = db.status === 'healthy' ? 'healthy' : 'unhealthy';
    return this.persist(organizationId, 'api-readiness', 'API Readiness', 'readiness', 'backend', status, db.latencyMs, db.message ?? undefined);
  }

  async checkStartup(organizationId?: string) {
    return this.persist(organizationId, 'api-startup', 'API Startup', 'startup', 'backend', 'healthy', 0, 'started');
  }

  private async persist(
    organizationId: string | undefined,
    checkKey: string,
    name: string,
    checkType: string,
    component: string,
    status: string,
    latencyMs: number | null | undefined,
    message?: string,
  ) {
    const healthStatus = status === 'healthy' || status === 'degraded' || status === 'unhealthy' || status === 'unknown'
      ? status
      : latencyToHealth(latencyMs);

    const row = await this.prisma.eopHealthCheck.create({
      data: {
        organizationId,
        checkKey,
        name,
        checkType,
        component: component as 'backend',
        status: healthStatus as 'healthy',
        latencyMs: latencyMs ?? undefined,
        message,
      },
    });

    if (organizationId && (healthStatus === 'degraded' || healthStatus === 'unhealthy')) {
      await this.core.emitUserAction(
        organizationId,
        'HealthCheck',
        row.id,
        EVENT_TYPES.OBSERVABILITY_HEALTH_DEGRADED,
        { checkKey, status: healthStatus },
      );
    }
    return row;
  }

  latest(organizationId?: string) {
    return this.prisma.eopHealthCheck.findMany({
      where: organizationId ? { organizationId } : {},
      orderBy: { checkedAt: 'desc' },
      take: 50,
    });
  }
}
