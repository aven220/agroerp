import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EmfgResourceAvailabilityStatus, EmfgResourceEquipmentType } from '@prisma/client';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import { canTransitionAvailability } from '../domain/emfg-resources.engine';
import { EmfgAuditService } from './emfg-audit.service';
import { EmfgResourcesIntegrationService } from './emfg-resources-integration.service';

@Injectable()
export class EmfgResourcesEquipmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
    private readonly core: CoreEngineService,
    private readonly integration: EmfgResourcesIntegrationService,
  ) {}

  list(organizationId: string, equipmentType?: EmfgResourceEquipmentType) {
    return this.prisma.emfgEquipmentProfile.findMany({
      where: { organizationId, ...(equipmentType ? { equipmentType } : {}) },
      orderBy: { code: 'asc' },
    });
  }

  get(organizationId: string, equipmentKey: string) {
    return this.prisma.emfgEquipmentProfile.findUnique({
      where: { organizationId_equipmentKey: { organizationId, equipmentKey } },
    });
  }

  async create(organizationId: string, userId: string, payload: {
    equipmentType: EmfgResourceEquipmentType; machineKey?: string; workCenterKey?: string;
    code: string; name: string; serialNumber?: string; manufacturer?: string; model?: string;
    yearBuilt?: number; responsibleKey?: string;
  }) {
    const seq = await this.prisma.emfgEquipmentProfile.count({ where: { organizationId } });
    const equipmentKey = generateEmfgKey('EQ', seq + 1);

    const row = await this.prisma.emfgEquipmentProfile.create({
      data: { organizationId, equipmentKey, ...payload },
    });

    await this.audit.log(organizationId, 'EmfgEquipmentProfile', equipmentKey, 'created', userId, payload);
    await this.core.emitUserAction(organizationId, 'EmfgEquipmentProfile', equipmentKey, EVENT_TYPES.EMFG_RES_EQUIPMENT_CREATED, payload);
    return row;
  }

  async update(organizationId: string, userId: string, equipmentKey: string, payload: Partial<{
    name: string; serialNumber: string; manufacturer: string; model: string;
    yearBuilt: number; operatingHours: number; responsibleKey: string;
  }>) {
    const row = await this.prisma.emfgEquipmentProfile.update({
      where: { organizationId_equipmentKey: { organizationId, equipmentKey } },
      data: payload,
    });
    await this.audit.log(organizationId, 'EmfgEquipmentProfile', equipmentKey, 'updated', userId, payload);
    return row;
  }

  async setAvailability(
    organizationId: string,
    userId: string,
    equipmentKey: string,
    status: EmfgResourceAvailabilityStatus,
    reason?: string,
  ) {
    const eq = await this.get(organizationId, equipmentKey);
    if (!eq) throw new NotFoundException('equipment_not_found');
    if (!canTransitionAvailability(eq.availabilityStatus, status)) {
      throw new BadRequestException('invalid_availability_transition');
    }

    await this.prisma.emfgEquipmentProfile.update({
      where: { organizationId_equipmentKey: { organizationId, equipmentKey } },
      data: { availabilityStatus: status },
    });

    const seq = await this.prisma.emfgResourceAvailabilityLog.count({ where: { organizationId } });
    await this.prisma.emfgResourceAvailabilityLog.create({
      data: {
        organizationId,
        logKey: generateEmfgKey('AV', seq + 1),
        equipmentKey,
        machineKey: eq.machineKey,
        workCenterKey: eq.workCenterKey,
        status,
        previousStatus: eq.availabilityStatus,
        reason,
        userId,
      },
    });

    await this.audit.log(organizationId, 'EmfgEquipmentProfile', equipmentKey, 'availability_changed', userId, { status });
    await this.integration.onAvailabilityChanged(organizationId, equipmentKey, status, eq);
    return { equipmentKey, status };
  }

  async syncFromMachines(organizationId: string, userId: string) {
    const machines = await this.prisma.emfgMachine.findMany({
      where: { organizationId },
      include: { workCenter: true },
    });
    const results = [];
    for (const m of machines) {
      const existing = await this.prisma.emfgEquipmentProfile.findFirst({
        where: { organizationId, machineKey: m.machineKey },
      });
      if (existing) { results.push(existing); continue; }

      const statusMap: Record<string, EmfgResourceAvailabilityStatus> = {
        active: 'available',
        maintenance: 'maintenance',
        inactive: 'out_of_service',
      };

      const row = await this.create(organizationId, userId, {
        equipmentType: 'machine',
        machineKey: m.machineKey,
        workCenterKey: m.workCenterKey,
        code: m.code,
        name: m.name,
      });
      await this.setAvailability(organizationId, userId, row.equipmentKey, statusMap[m.status] ?? 'available', 'sync_from_machine');
      results.push(row);
    }
    return results;
  }
}
