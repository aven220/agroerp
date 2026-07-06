import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { BiKpiService } from './bi-kpi.service';
import { BiAggregationService } from './bi-aggregation.service';

@Injectable()
export class BiRealtimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kpiService: BiKpiService,
    private readonly aggregation: BiAggregationService,
  ) {}

  async getSnapshot(organizationId: string) {
    const hourAgo = new Date(Date.now() - 3600000);
    const [kpis, eventsLastHour, activeWorkflows, pendingSubmissions, executive] =
      await Promise.all([
        this.kpiService.getRealtime(organizationId),
        this.prisma.event.count({
          where: { organizationId, occurredAt: { gte: hourAgo } },
        }),
        this.prisma.workflowInstance.count({
          where: { organizationId, status: 'active' },
        }),
        this.prisma.formSubmission.count({
          where: { organizationId, syncStatus: 'pending', deletedAt: null },
        }),
        this.aggregation.getExecutiveSummary(organizationId),
      ]);

    return {
      timestamp: new Date().toISOString(),
      kpis,
      indicators: {
        eventsLastHour,
        activeWorkflows,
        pendingSubmissions,
        unreadNotifications: (executive.kpis as Record<string, number>).unreadNotifications ?? 0,
      },
      aiReadiness: executive.aiReadiness,
    };
  }
}
