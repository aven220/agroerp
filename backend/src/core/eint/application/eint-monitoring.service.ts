import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EintPrismaService } from '@/shared/infrastructure/database/eint-prisma.service';
import { aggregateEintIndicators, generateEintKey } from '../domain/eint.engine';
import { EintAuditService } from './eint-audit.service';

@Injectable()
export class EintBridgeService {
  constructor(
    private readonly prisma: EintPrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EintAuditService,
  ) {}

  moduleSlots() {
    return [
      'prm', 'ftip', 'eims', 'escm', 'efm', 'hcm', 'eam', 'emfg', 'epscm', 'cpep',
      'eih', 'eip', 'bpms', 'ebre', 'ebiap', 'eaidsp', 'eneac', 'hed', 'hpa',
    ];
  }

  async emitModuleAnalytics(
    organizationId: string,
    moduleRef: string,
    payload: Record<string, unknown>,
    userId?: string,
  ) {
    await this.core.emitUserAction(
      organizationId,
      'EintBridge',
      moduleRef,
      EVENT_TYPES.EINT_MODULE_ANALYTICS,
      { moduleRef, ...payload },
    );
    await this.audit.log(organizationId, 'EintBridge', moduleRef, 'config_changed', userId, { event: 'analytics' });
    return { bridged: true, moduleRef };
  }
}

@Injectable()
export class EintMonitoringService {
  constructor(private readonly prisma: EintPrismaService) {}

  async dashboard(organizationId: string) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [aiCalls, aiCost, queries, reports, etlRuns, notifications, failedJobs] = await Promise.all([
      this.prisma.eintAiConsumption.count({ where: { organizationId, createdAt: { gte: since } } }),
      this.prisma.eintAiConsumption.aggregate({ where: { organizationId, createdAt: { gte: since } }, _sum: { costUsd: true } }),
      this.prisma.eintQueryLog.count({ where: { organizationId, createdAt: { gte: since } } }),
      this.prisma.eintReportRun.count({ where: { organizationId, createdAt: { gte: since } } }),
      this.prisma.eintEtlRun.count({ where: { organizationId, startedAt: { gte: since } } }),
      this.prisma.eintNotificationDelivery.count({ where: { organizationId, createdAt: { gte: since } } }),
      this.prisma.eintEtlRun.count({ where: { organizationId, status: 'failed', startedAt: { gte: since } } }),
    ]);
    const indicators = aggregateEintIndicators({
      aiCalls24h: aiCalls,
      aiCost24h: aiCost._sum.costUsd ?? 0,
      queries24h: queries,
      reports24h: reports,
      etlRuns24h: etlRuns,
      notifications24h: notifications,
      failedJobs24h: failedJobs,
    });
    const seq = await this.prisma.eintIndicatorSnapshot.count({ where: { organizationId } });
    await this.prisma.eintIndicatorSnapshot.create({
      data: { organizationId, snapshotKey: generateEintKey('SNAP', seq + 1), indicators: indicators as object },
    });
    return indicators;
  }

  snapshots(organizationId: string, limit = 24) {
    return this.prisma.eintIndicatorSnapshot.findMany({
      where: { organizationId },
      orderBy: { capturedAt: 'desc' },
      take: limit,
    });
  }
}

@Injectable()
export class EintOfflineService {
  constructor(private readonly prisma: EintPrismaService, private readonly monitoring: EintMonitoringService) {}

  async mobileSync(organizationId: string, userId: string) {
    const [indicators, dashboards, reports, assistants] = await Promise.all([
      this.monitoring.dashboard(organizationId),
      this.prisma.eintDashboardBinding.findMany({ where: { organizationId, status: 'active' }, take: 10 }),
      this.prisma.eintReportRun.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.prisma.eintAssistant.findMany({ where: { organizationId, status: 'active' } }),
    ]);
    return { indicators, dashboards, reports, assistants, syncedAt: new Date().toISOString(), userId };
  }
}
