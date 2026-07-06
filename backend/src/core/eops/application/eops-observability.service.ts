import { Injectable } from '@nestjs/common';
import { ObsHealthService } from '@/core/eop/application/obs-health.service';
import { ObsMetricsService } from '@/core/eop/application/obs-metrics.service';
import { ObsLoggingService } from '@/core/eop/application/obs-logging.service';
import { ObsErrorsService } from '@/core/eop/application/obs-errors.service';
import { EopsPrismaService } from '@/shared/infrastructure/database/eops-prisma.service';

@Injectable()
export class EopsObservabilityService {
  constructor(
    private readonly prisma: EopsPrismaService,
    private readonly health: ObsHealthService,
    private readonly metrics: ObsMetricsService,
    private readonly logging: ObsLoggingService,
    private readonly errors: ObsErrorsService,
  ) {}

  async dashboard(organizationId: string) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [health, recentErrors, queueSamples] = await Promise.all([
      this.health.runAll(organizationId),
      this.errors.list(organizationId, 20),
      this.prisma.eopsQueueMonitor.findMany({
        where: { organizationId, sampledAt: { gte: since } },
        orderBy: { sampledAt: 'desc' },
        take: 50,
      }),
    ]);
    return {
      health,
      errors24h: recentErrors.length,
      recentErrors: recentErrors.slice(0, 10),
      queues: queueSamples,
      capabilities: ['logs', 'metrics', 'traces', 'alerts', 'incidents', 'service_map', 'synthetic', 'rum'],
      bridge: 'eop',
    };
  }

  async ingestQueueSample(organizationId: string, queueKey: string, depth: number, consumers: number, lagMs: number) {
    return this.prisma.eopsQueueMonitor.create({
      data: { organizationId, queueKey, depth, consumers, throughput: 0, lagMs },
    });
  }
}
