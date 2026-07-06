import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { ObsMetricsService } from './obs-metrics.service';
import { ObsHealthService } from './obs-health.service';
import { ObsAiService } from './obs-ai.service';
import { ObsServiceMapService } from './obs-service-map.service';

@Injectable()
export class ObsCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: ObsMetricsService,
    private readonly health: ObsHealthService,
    private readonly ai: ObsAiService,
    private readonly serviceMap: ObsServiceMapService,
  ) {}

  async dashboard(organizationId: string) {
    const since24h = new Date(Date.now() - 24 * 3_600_000);

    const [
      logs24h,
      errors24h,
      openAlerts,
      openIncidents,
      traces24h,
      metricsDash,
      healthSnapshot,
      aiSummary,
      graph,
      mobileEvents,
    ] = await Promise.all([
      this.prisma.eopLogEntry.count({ where: { organizationId, recordedAt: { gte: since24h } } }),
      this.prisma.eopErrorEvent.count({ where: { organizationId, lastSeenAt: { gte: since24h } } }),
      this.prisma.eopAlert.count({ where: { organizationId, status: { in: ['open', 'acknowledged'] } } }),
      this.prisma.eopIncident.count({ where: { organizationId, status: { in: ['open', 'investigating', 'mitigated'] } } }),
      this.prisma.eopTraceSpan.count({ where: { organizationId, startedAt: { gte: since24h } } }),
      this.metrics.dashboard(organizationId),
      this.health.runAll(organizationId),
      this.ai.summary(organizationId),
      this.serviceMap.graph(organizationId),
      this.prisma.eopMobileTelemetry.count({ where: { organizationId, recordedAt: { gte: since24h } } }),
    ]);

    return {
      logs24h,
      errors24h,
      openAlerts,
      openIncidents,
      traces24h,
      mobileEvents,
      health: healthSnapshot.status,
      metrics: metricsDash,
      ai: aiSummary,
      serviceMap: { nodes: graph.nodes.length, edges: graph.edges.length },
    };
  }
}
