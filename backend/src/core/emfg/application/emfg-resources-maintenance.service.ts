import { Injectable } from '@nestjs/common';
import { EmfgDowntimeType } from '@prisma/client';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import { computeElapsedMinutes } from '../domain/emfg-mes.engine';
import { EmfgAuditService } from './emfg-audit.service';
import { EmfgResourcesIntegrationService } from './emfg-resources-integration.service';

@Injectable()
export class EmfgResourcesMaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
    private readonly core: CoreEngineService,
    private readonly integration: EmfgResourcesIntegrationService,
  ) {}

  listPlans(organizationId: string, equipmentKey?: string) {
    return this.prisma.emfgResourceMaintenancePlan.findMany({
      where: { organizationId, isActive: true, ...(equipmentKey ? { equipmentKey } : {}) },
      orderBy: { nextDueAt: 'asc' },
    });
  }

  async createPlan(organizationId: string, userId: string, payload: {
    equipmentKey: string; intervalDays?: number; description?: string; nextDueAt?: string;
  }) {
    const seq = await this.prisma.emfgResourceMaintenancePlan.count({ where: { organizationId } });
    const planKey = generateEmfgKey('MP', seq + 1);
    const nextDue = payload.nextDueAt ? new Date(payload.nextDueAt) : new Date(Date.now() + (payload.intervalDays ?? 30) * 86_400_000);

    const row = await this.prisma.emfgResourceMaintenancePlan.create({
      data: {
        organizationId,
        planKey,
        equipmentKey: payload.equipmentKey,
        maintenanceType: 'preventive',
        intervalDays: payload.intervalDays ?? 30,
        nextDueAt: nextDue,
        description: payload.description,
      },
    });
    await this.audit.log(organizationId, 'EmfgResourceMaintenancePlan', planKey, 'created', userId);
    return row;
  }

  listLogs(organizationId: string, equipmentKey?: string) {
    return this.prisma.emfgResourceMaintenanceLog.findMany({
      where: { organizationId, ...(equipmentKey ? { equipmentKey } : {}) },
      orderBy: { startedAt: 'desc' },
      take: 200,
    });
  }

  async recordMaintenance(organizationId: string, userId: string, payload: {
    equipmentKey: string; maintenanceType: 'preventive' | 'corrective'; planKey?: string;
    startedAt?: string; endedAt?: string; technicalNotes?: string;
  }) {
    const start = payload.startedAt ? new Date(payload.startedAt) : new Date();
    const end = payload.endedAt ? new Date(payload.endedAt) : new Date();
    const downtimeMinutes = computeElapsedMinutes(start, end);

    const seq = await this.prisma.emfgResourceMaintenanceLog.count({ where: { organizationId } });
    const logKey = generateEmfgKey('ML', seq + 1);

    const [log] = await this.prisma.$transaction([
      this.prisma.emfgResourceMaintenanceLog.create({
        data: {
          organizationId,
          logKey,
          equipmentKey: payload.equipmentKey,
          maintenanceType: payload.maintenanceType,
          planKey: payload.planKey,
          startedAt: start,
          endedAt: end,
          downtimeMinutes,
          technicalNotes: payload.technicalNotes,
          performedBy: userId,
        },
      }),
      this.prisma.emfgEquipmentProfile.update({
        where: { organizationId_equipmentKey: { organizationId, equipmentKey: payload.equipmentKey } },
        data: { availabilityStatus: 'available', operatingHours: { increment: downtimeMinutes / 60 } },
      }),
    ]);

    await this.audit.log(organizationId, 'EmfgResourceMaintenanceLog', logKey, 'maintenance', userId, payload);
    await this.core.emitUserAction(organizationId, 'EmfgResourceMaintenanceLog', logKey, EVENT_TYPES.EMFG_RES_MAINTENANCE_RECORDED, {
      equipmentKey: payload.equipmentKey,
      maintenanceType: payload.maintenanceType,
      eamReady: true,
    });
    await this.integration.onMaintenanceRecorded(organizationId, payload.equipmentKey, log);
    return log;
  }

  listDowntimes(organizationId: string) {
    return this.prisma.emfgResourceDowntime.findMany({
      where: { organizationId },
      orderBy: { startAt: 'desc' },
      take: 200,
    });
  }

  async recordDowntime(organizationId: string, userId: string, payload: {
    equipmentKey?: string; workCenterKey?: string; downtimeType: EmfgDowntimeType;
    startAt?: string; endAt?: string; reason?: string;
  }) {
    const seq = await this.prisma.emfgResourceDowntime.count({ where: { organizationId } });
    const downtimeKey = generateEmfgKey('DT', seq + 1);

    const row = await this.prisma.emfgResourceDowntime.create({
      data: {
        organizationId,
        downtimeKey,
        equipmentKey: payload.equipmentKey,
        workCenterKey: payload.workCenterKey,
        downtimeType: payload.downtimeType,
        startAt: payload.startAt ? new Date(payload.startAt) : new Date(),
        endAt: payload.endAt ? new Date(payload.endAt) : undefined,
        reason: payload.reason,
        createdBy: userId,
      },
    });

    if (payload.equipmentKey) {
      await this.prisma.emfgEquipmentProfile.update({
        where: { organizationId_equipmentKey: { organizationId, equipmentKey: payload.equipmentKey } },
        data: { availabilityStatus: payload.downtimeType === 'planned' ? 'maintenance' : 'out_of_service' },
      });
    }

    await this.audit.log(organizationId, 'EmfgResourceDowntime', downtimeKey, 'downtime', userId, payload);
    await this.core.emitUserAction(organizationId, 'EmfgResourceDowntime', downtimeKey, EVENT_TYPES.EMFG_RES_DOWNTIME_RECORDED, payload);
    return row;
  }
}
