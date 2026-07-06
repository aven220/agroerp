import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { ObsHealthService } from './obs-health.service';
import { ObsAlertsService } from './obs-alerts.service';
import { ObsSyntheticService } from './obs-synthetic.service';
import { ObsServiceMapService } from './obs-service-map.service';
import { ObsMetricsService } from './obs-metrics.service';

@Injectable()
export class ObsSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(ObsSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly health: ObsHealthService,
    private readonly alerts: ObsAlertsService,
    private readonly synthetic: ObsSyntheticService,
    private readonly serviceMap: ObsServiceMapService,
    private readonly metrics: ObsMetricsService,
  ) {}

  async onModuleInit() {
    await this.seedServiceMap();
    const timer = setInterval(() => this.tick().catch(() => undefined), 60_000);
    timer.unref?.();
    this.logger.log('EOP scheduler started (60s health/alerts/synthetic)');
  }

  private async seedServiceMap() {
    const nodes = [
      { nodeKey: 'frontend-web', name: 'Frontend Web', component: 'frontend' },
      { nodeKey: 'api-gateway', name: 'API Gateway', component: 'api_gateway' },
      { nodeKey: 'backend-core', name: 'Backend Core', component: 'backend' },
      { nodeKey: 'postgres', name: 'PostgreSQL', component: 'database' },
      { nodeKey: 'redis', name: 'Redis', component: 'redis' },
      { nodeKey: 'minio', name: 'MinIO', component: 'minio' },
      { nodeKey: 'android-app', name: 'Android App', component: 'android' },
      { nodeKey: 'scheduler', name: 'Scheduler ESDJE', component: 'scheduler' },
      { nodeKey: 'iot-platform', name: 'IoT Platform', component: 'iot' },
      { nodeKey: 'ai-platform', name: 'AI Platform', component: 'ai' },
      { nodeKey: 'integration-hub', name: 'Integration Hub', component: 'integration' },
      { nodeKey: 'gis', name: 'GIS Platform', component: 'gis' },
    ];
    for (const n of nodes) {
      await this.serviceMap.upsertNode({ ...n, status: 'healthy', version: '0.1.0' });
    }
    const deps = [
      ['frontend-web', 'api-gateway'],
      ['android-app', 'api-gateway'],
      ['api-gateway', 'backend-core'],
      ['backend-core', 'postgres'],
      ['backend-core', 'redis'],
      ['backend-core', 'minio'],
      ['backend-core', 'scheduler'],
      ['backend-core', 'iot-platform'],
      ['backend-core', 'ai-platform'],
      ['backend-core', 'integration-hub'],
      ['backend-core', 'gis'],
    ];
    for (const [source, target] of deps) {
      await this.serviceMap.addDependency({ sourceNodeKey: source, targetNodeKey: target, latencyMsAvg: 10 });
    }
  }

  private async tick() {
    const orgs = await this.prisma.organization.findMany({
      where: { deletedAt: null },
      select: { id: true },
      take: 20,
    });

    const mem = process.memoryUsage();
    for (const org of orgs) {
      await this.health.runAll(org.id);
      await this.alerts.evaluateRules(org.id);
      await this.synthetic.runAll(org.id);
      await this.metrics.ingestBatch(org.id, [
        { metricKey: 'process.rss', kind: 'ram', value: mem.rss / 1024 / 1024, unit: 'MB', serviceName: 'backend-core' },
        { metricKey: 'process.heap', kind: 'ram', value: mem.heapUsed / 1024 / 1024, unit: 'MB', serviceName: 'backend-core' },
        { metricKey: 'process.uptime', kind: 'custom', value: process.uptime(), unit: 's', serviceName: 'backend-core' },
      ]);
    }
  }
}
