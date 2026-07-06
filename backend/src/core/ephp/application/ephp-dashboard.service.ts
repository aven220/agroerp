import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EphpPrismaService } from '@/shared/infrastructure/database/ephp-prisma.service';
import { EPHP_COMPLIANCE_TYPES, EPHP_MODULE_SLOTS, aggregateEphpIndicators } from '../domain/ephp.engine';
import { EphpAlertService } from './ephp-alert.service';
import { EphpApplicationService, EphpTreatmentService } from './ephp-treatment.service';
import { EphpMonitoringService } from './ephp-monitoring.service';

@Injectable()
export class EphpBridgeService {
  constructor(private readonly core: CoreEngineService) {}

  moduleSlots() {
    return EPHP_MODULE_SLOTS.map((moduleRef) => ({ moduleRef, status: 'integrated', bridge: 'ephp' }));
  }

  async emitModuleEvent(organizationId: string, moduleRef: string, payload: Record<string, unknown>, userId?: string) {
    await this.core.emitUserAction(organizationId, 'EphpModule', moduleRef, EVENT_TYPES.EPHP_MODULE_EVENT, { moduleRef, ...payload });
    return { bridged: true, moduleRef, userId };
  }

  complianceTypes() { return EPHP_COMPLIANCE_TYPES; }
}

@Injectable()
export class EphpDashboardService {
  constructor(
    private readonly prisma: EphpPrismaService,
    private readonly mainPrisma: PrismaService,
    private readonly alerts: EphpAlertService,
  ) {}

  async dashboard(organizationId: string) {
    const since30d = new Date(Date.now() - 30 * 86400000);
    const [pestCatalog, diseaseCatalog, activeMonitorings30d, scheduledTreatments, activeAlerts, complianceFrameworks] =
      await Promise.all([
        this.prisma.ephpPestCatalog.count({ where: { organizationId, status: 'active' } }),
        this.prisma.ephpDiseaseCatalog.count({ where: { organizationId, status: 'active' } }),
        this.prisma.ephpFieldMonitoring.count({ where: { organizationId, monitoredAt: { gte: since30d } } }),
        this.prisma.ephpTreatment.count({ where: { organizationId, status: { in: ['scheduled', 'in_progress'] } } }),
        this.prisma.ephpAlert.count({ where: { organizationId, isActive: true } }),
        this.prisma.ephpComplianceFramework.count({ where: { organizationId, status: 'active' } }),
      ]);
    const indicators = aggregateEphpIndicators({
      pestCatalog, diseaseCatalog, activeMonitorings30d, scheduledTreatments, activeAlerts, complianceFrameworks,
    });
    return {
      indicators,
      activeLots: await this.mainPrisma.fieldLotProfile.count({ where: { organizationId, deletedAt: null, status: 'active' } }),
      timestamp: new Date().toISOString(),
    };
  }
}

@Injectable()
export class EphpOfflineService {
  constructor(
    private readonly prisma: EphpPrismaService,
    private readonly dashboard: EphpDashboardService,
    private readonly monitoring: EphpMonitoringService,
    private readonly applications: EphpApplicationService,
    private readonly treatments: EphpTreatmentService,
    private readonly alerts: EphpAlertService,
  ) {}

  async mobileSync(organizationId: string, userId: string) {
    const dash = await this.dashboard.dashboard(organizationId);
    const [monitorings, applications, alerts] = await Promise.all([
      this.monitoring.list(organizationId),
      this.applications.list(organizationId),
      this.alerts.listActive(organizationId),
    ]);
    return {
      authorized: true,
      dashboard: dash,
      monitorings: monitorings.slice(0, 30),
      applications: applications.slice(0, 20),
      alerts,
      syncedAt: new Date().toISOString(),
      userId,
    };
  }

  queueBatch(organizationId: string, userId: string, batchKey: string, payload: Record<string, unknown>) {
    return this.prisma.ephpOfflineBatch.upsert({
      where: { organizationId_batchKey: { organizationId, batchKey } },
      create: { organizationId, userId, batchKey, payload: payload as object },
      update: { payload: payload as object, status: 'pending' },
    });
  }

  async syncBatch(organizationId: string, userId: string, batchKey: string) {
    const batch = await this.prisma.ephpOfflineBatch.findFirst({ where: { organizationId, batchKey, userId } });
    if (!batch) return { synced: false };
    const payload = batch.payload as Record<string, unknown>;
    const results: unknown[] = [];
    for (const row of (payload.monitorings as Array<Record<string, unknown>>) ?? []) {
      results.push(await this.monitoring.record(organizationId, userId, row as never));
    }
    for (const row of (payload.applications as Array<Record<string, unknown>>) ?? []) {
      results.push(await this.applications.record(organizationId, userId, row as never));
    }
    for (const row of (payload.treatments as Array<Record<string, unknown>>) ?? []) {
      results.push(await this.treatments.schedule(organizationId, userId, row as never));
    }
    await this.prisma.ephpOfflineBatch.update({ where: { id: batch.id }, data: { status: 'completed', syncedAt: new Date() } });
    return { synced: true, count: results.length };
  }
}
