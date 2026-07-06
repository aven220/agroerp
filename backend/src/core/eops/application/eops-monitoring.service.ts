import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EneacInboxService } from '@/core/eneac/application/eneac-inbox.service';
import { EopsPrismaService } from '@/shared/infrastructure/database/eops-prisma.service';
import { EOPS_MODULE_SLOTS, aggregateEopsIndicators } from '../domain/eops.engine';
import { EopsAdminService } from './eops-admin.service';
import { EopsHealthService } from './eops-health.service';
import { EopsLicenseService } from './eops-license.service';
import { EopsObservabilityService } from './eops-observability.service';
import { EopsSecurityService } from './eops-security.service';

@Injectable()
export class EopsBridgeService {
  constructor(private readonly core: CoreEngineService) {}

  moduleSlots() {
    return EOPS_MODULE_SLOTS.map((moduleRef) => ({ moduleRef, status: 'integrated', bridge: 'eops' }));
  }

  async emitModuleEvent(organizationId: string, moduleRef: string, payload: Record<string, unknown>, userId?: string) {
    await this.core.emitUserAction(
      organizationId,
      'EopsModule',
      moduleRef,
      EVENT_TYPES.EOPS_MODULE_EVENT,
      { moduleRef, ...payload },
    );
    return { bridged: true, moduleRef, userId };
  }
}

@Injectable()
export class EopsMonitoringService {
  constructor(
    private readonly prisma: EopsPrismaService,
    private readonly health: EopsHealthService,
    private readonly observability: EopsObservabilityService,
    private readonly license: EopsLicenseService,
    private readonly security: EopsSecurityService,
    private readonly admin: EopsAdminService,
  ) {}

  async dashboard(organizationId: string) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [checks, licenseUsage, alerts, maintenance, failedBackups, queueSamples] = await Promise.all([
      this.health.runAllChecks(organizationId),
      this.license.usageDashboard(organizationId),
      this.security.listAlerts(organizationId, false),
      this.admin.isMaintenanceActive(organizationId),
      this.prisma.eopsBackupRun.count({ where: { organizationId, status: 'failed', startedAt: { gte: since } } }),
      this.prisma.eopsQueueMonitor.findMany({ where: { organizationId, sampledAt: { gte: since } }, orderBy: { sampledAt: 'desc' }, take: 1 }),
    ]);
    const healthScore = checks.status === 'healthy' ? 95 : checks.status === 'degraded' ? 70 : 40;
    const queueLagMs = queueSamples[0]?.lagMs ?? 0;
    const indicators = aggregateEopsIndicators({
      healthScore,
      openIncidents: 0,
      failedBackups24h: failedBackups,
      securityAlerts: alerts.length,
      queueLagMs,
      licenseDaysLeft: licenseUsage.licenseDaysLeft,
    });
    return {
      indicators,
      health: checks,
      maintenanceActive: !!maintenance,
      license: licenseUsage,
      securityAlerts: alerts.slice(0, 5),
      timestamp: new Date().toISOString(),
    };
  }
}

@Injectable()
export class EopsOfflineService {
  constructor(
    private readonly prisma: EopsPrismaService,
    private readonly monitoring: EopsMonitoringService,
    private readonly inbox: EneacInboxService,
  ) {}

  async mobileSync(organizationId: string, userId: string) {
    const [dashboard, alerts, inbox] = await Promise.all([
      this.monitoring.dashboard(organizationId),
      this.prisma.eopsSecurityAlert.findMany({
        where: { organizationId, resolved: false, severity: { in: ['critical', 'high'] } },
        take: 10,
      }),
      this.inbox.findInbox(organizationId, userId),
    ]);
    return {
      authorized: true,
      dashboard,
      criticalAlerts: alerts,
      adminNotifications: inbox,
      syncedAt: new Date().toISOString(),
    };
  }

  queueBatch(organizationId: string, userId: string, batchKey: string, payload: Record<string, unknown>) {
    return this.prisma.eopsOfflineBatch.upsert({
      where: { organizationId_batchKey: { organizationId, batchKey } },
      create: { organizationId, userId, batchKey, payload: payload as object },
      update: { payload: payload as object, status: 'pending' },
    });
  }
}
