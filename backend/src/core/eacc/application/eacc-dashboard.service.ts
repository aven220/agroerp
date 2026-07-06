import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EaccPrismaService } from '@/shared/infrastructure/database/eacc-prisma.service';
import { EACC_MODULE_SLOTS, aggregateEaccIndicators } from '../domain/eacc.engine';
import { EaccCertificationService } from './eacc-certification.service';
import { EaccComplianceService } from './eacc-compliance.service';
import { EaccInspectionService } from './eacc-inspection.service';

@Injectable()
export class EaccBridgeService {
  constructor(private readonly core: CoreEngineService) {}

  moduleSlots() {
    return EACC_MODULE_SLOTS.map((moduleRef) => ({ moduleRef, status: 'integrated', bridge: 'eacc' }));
  }

  async emitModuleEvent(organizationId: string, moduleRef: string, payload: Record<string, unknown>, userId?: string) {
    await this.core.emitUserAction(organizationId, 'EaccModule', moduleRef, EVENT_TYPES.EACC_MODULE_EVENT, { moduleRef, ...payload });
    return { bridged: true, moduleRef, userId };
  }
}

@Injectable()
export class EaccDashboardService {
  constructor(
    private readonly prisma: EaccPrismaService,
    private readonly mainPrisma: PrismaService,
  ) {}

  async dashboard(organizationId: string) {
    const since30d = new Date(Date.now() - 30 * 86400000);
    const in30d = new Date(Date.now() + 30 * 86400000);
    const [
      activeCertifications, expiringCertifications, openFindings, openCorrectiveActions,
      compliantReqs, totalReqs, sustainabilityRecords30d, esgObjectives, activeAlerts,
    ] = await Promise.all([
      this.prisma.eaccCertification.count({ where: { organizationId, status: 'active' } }),
      this.prisma.eaccCertification.count({ where: { organizationId, status: 'active', expiresAt: { lte: in30d, gte: new Date() } } }),
      this.prisma.eaccFinding.count({ where: { organizationId, status: 'active' } }),
      this.prisma.eaccCorrectiveAction.count({ where: { organizationId, status: { in: ['pending', 'in_progress', 'scheduled'] } } }),
      this.prisma.eaccRequirement.count({ where: { organizationId, isCompliant: true } }),
      this.prisma.eaccRequirement.count({ where: { organizationId, status: 'active' } }),
      this.prisma.eaccSustainabilityRecord.count({ where: { organizationId, recordedAt: { gte: since30d } } }),
      this.prisma.eaccEsgObjective.count({ where: { organizationId, status: { in: ['in_progress', 'scheduled'] } } }),
      this.prisma.eaccAlert.count({ where: { organizationId, isActive: true } }),
    ]);
    const complianceRate = totalReqs > 0 ? Math.round((compliantReqs / totalReqs) * 100) : 100;
    const indicators = aggregateEaccIndicators({
      activeCertifications, expiringCertifications, openFindings, openCorrectiveActions,
      complianceRate, sustainabilityRecords30d, esgObjectives, activeAlerts,
    });
    return {
      indicators,
      compliance: { rate: complianceRate, compliant: compliantReqs, total: totalReqs },
      activeLots: await this.mainPrisma.fieldLotProfile.count({ where: { organizationId, deletedAt: null, status: 'active' } }),
      timestamp: new Date().toISOString(),
    };
  }
}

@Injectable()
export class EaccOfflineService {
  constructor(
    private readonly prisma: EaccPrismaService,
    private readonly dashboard: EaccDashboardService,
    private readonly certification: EaccCertificationService,
    private readonly compliance: EaccComplianceService,
    private readonly inspection: EaccInspectionService,
  ) {}

  async mobileSync(organizationId: string, userId: string) {
    const [dash, checklists, audits, alerts] = await Promise.all([
      this.dashboard.dashboard(organizationId),
      this.compliance.listChecklists(organizationId),
      this.inspection.listAudits(organizationId),
      this.compliance.listAlerts(organizationId),
    ]);
    return {
      authorized: true,
      dashboard: dash,
      checklists: checklists.slice(0, 20),
      audits: audits.slice(0, 20),
      alerts: alerts.slice(0, 20),
      syncedAt: new Date().toISOString(),
      userId,
    };
  }

  queueBatch(organizationId: string, userId: string, batchKey: string, payload: Record<string, unknown>) {
    return this.prisma.eaccOfflineBatch.upsert({
      where: { organizationId_batchKey: { organizationId, batchKey } },
      create: { organizationId, userId, batchKey, payload: payload as object },
      update: { payload: payload as object, status: 'pending' },
    });
  }

  async syncBatch(organizationId: string, userId: string, batchKey: string) {
    const batch = await this.prisma.eaccOfflineBatch.findFirst({ where: { organizationId, batchKey, userId } });
    if (!batch) return { synced: false };
    const payload = batch.payload as Record<string, unknown>;
    const results: unknown[] = [];
    for (const row of (payload.checklistItems as Array<Record<string, unknown>>) ?? []) {
      results.push(await this.compliance.completeChecklistItem(organizationId, userId, row.itemKey as string, row as never));
    }
    for (const row of (payload.evidences as Array<Record<string, unknown>>) ?? []) {
      results.push(await this.compliance.uploadEvidence(organizationId, userId, row as never));
    }
    for (const row of (payload.audits as Array<Record<string, unknown>>) ?? []) {
      results.push(await this.inspection.recordAudit(organizationId, userId, row as never));
    }
    for (const row of (payload.findings as Array<Record<string, unknown>>) ?? []) {
      results.push(await this.inspection.recordFinding(organizationId, userId, row as never));
    }
    await this.prisma.eaccOfflineBatch.update({ where: { id: batch.id }, data: { status: 'completed', syncedAt: new Date() } });
    return { synced: true, count: results.length };
  }
}
