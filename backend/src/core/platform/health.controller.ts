import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { Public } from '@/shared/presentation/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check agregado' })
  async check() {
    const services = await this.probeAll();
    const values = Object.values(services);
    const status = values.every((s) => s === 'ok')
      ? 'healthy'
      : values.some((s) => s === 'ok')
        ? 'degraded'
        : 'unhealthy';

    return {
      status,
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      services,
    };
  }

  @Public()
  @Get('live')
  @ApiOperation({ summary: 'Liveness' })
  live() {
    return { status: 'ok', probe: 'liveness', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness' })
  async ready() {
    const services = await this.probeAll();
    const ready = services.database === 'ok';
    return {
      status: ready ? 'ok' : 'error',
      probe: 'readiness',
      services,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('startup')
  @ApiOperation({ summary: 'Startup' })
  startup() {
    return { status: 'ok', probe: 'startup', uptimeSec: process.uptime(), timestamp: new Date().toISOString() };
  }

  private async probeAll() {
    const services: Record<string, string> = {
      api: 'ok',
      database: 'error',
      redis: 'unknown',
      minio: 'unknown',
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      services.database = 'ok';
    } catch {
      services.database = 'error';
    }

    const redisUrl = this.config.get<string>('REDIS_URL');
    if (redisUrl) {
      try {
        const Redis = (await import('ioredis')).default;
        const client = new Redis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 1500, lazyConnect: true });
        await client.connect();
        await client.ping();
        await client.quit();
        services.redis = 'ok';
      } catch {
        services.redis = 'error';
      }
    }

    const endpoint = this.config.get<string>('S3_ENDPOINT', 'http://localhost:9000');
    try {
      const res = await fetch(`${endpoint}/minio/health/live`, { signal: AbortSignal.timeout(1500) });
      services.minio = res.ok ? 'ok' : 'error';
    } catch {
      services.minio = 'error';
    }

    return services;
  }
}
