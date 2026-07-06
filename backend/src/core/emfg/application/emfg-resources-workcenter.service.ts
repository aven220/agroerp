import { Injectable } from '@nestjs/common';
import { EmfgResourceAvailabilityStatus } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import { EmfgAuditService } from './emfg-audit.service';
import { EmfgCapacityService } from './emfg-capacity.service';

@Injectable()
export class EmfgResourcesWorkcenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
    private readonly capacity: EmfgCapacityService,
  ) {}

  list(organizationId: string) {
    return this.capacity.listCenters(organizationId);
  }

  listLocations(organizationId: string) {
    return this.prisma.emfgResourceLocation.findMany({ where: { organizationId }, orderBy: { code: 'asc' } });
  }

  async createLocation(organizationId: string, userId: string, payload: { code: string; name: string; zone?: string; address?: string }) {
    const seq = await this.prisma.emfgResourceLocation.count({ where: { organizationId } });
    const locationKey = generateEmfgKey('LOC', seq + 1);
    const row = await this.prisma.emfgResourceLocation.create({
      data: { organizationId, locationKey, ...payload },
    });
    await this.audit.log(organizationId, 'EmfgResourceLocation', locationKey, 'created', userId);
    return row;
  }

  listCells(organizationId: string, centerKey?: string) {
    return this.prisma.emfgManufacturingCell.findMany({
      where: { organizationId, ...(centerKey ? { centerKey } : {}), isActive: true },
      include: { location: true },
    });
  }

  async createCell(organizationId: string, userId: string, payload: {
    centerKey: string; lineKey?: string; locationKey?: string; code: string; name: string; installedCapacity?: number;
  }) {
    const seq = await this.prisma.emfgManufacturingCell.count({ where: { organizationId } });
    const cellKey = generateEmfgKey('CELL', seq + 1);
    const cap = payload.installedCapacity ?? 160;
    const row = await this.prisma.emfgManufacturingCell.create({
      data: {
        organizationId,
        cellKey,
        centerKey: payload.centerKey,
        lineKey: payload.lineKey,
        locationKey: payload.locationKey,
        code: payload.code,
        name: payload.name,
        installedCapacity: cap,
        availableCapacity: cap,
      },
    });
    await this.audit.log(organizationId, 'EmfgManufacturingCell', cellKey, 'created', userId);
    return row;
  }

  async setOperationalStatus(
    organizationId: string,
    userId: string,
    cellKey: string,
    status: EmfgResourceAvailabilityStatus,
    reason?: string,
  ) {
    const cell = await this.prisma.emfgManufacturingCell.findUnique({
      where: { organizationId_cellKey: { organizationId, cellKey } },
    });
    if (!cell) return null;

    await this.prisma.emfgManufacturingCell.update({
      where: { organizationId_cellKey: { organizationId, cellKey } },
      data: { operationalStatus: status },
    });

    const seq = await this.prisma.emfgResourceAvailabilityLog.count({ where: { organizationId } });
    await this.prisma.emfgResourceAvailabilityLog.create({
      data: {
        organizationId,
        logKey: generateEmfgKey('AV', seq + 1),
        workCenterKey: cell.centerKey,
        status,
        previousStatus: cell.operationalStatus,
        reason,
        userId,
        metadata: { cellKey },
      },
    });

    await this.audit.log(organizationId, 'EmfgManufacturingCell', cellKey, 'availability_changed', userId, { status });
    return { cellKey, status };
  }

  listSchedules(organizationId: string, entityType: string, entityKey: string) {
    return this.prisma.emfgResourceOperatingSchedule.findMany({
      where: { organizationId, entityType, entityKey },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async upsertSchedule(organizationId: string, userId: string, payload: {
    entityType: string; entityKey: string; shiftName: string; dayOfWeek: number;
    startTime: string; endTime: string; capacityMinutes?: number;
  }) {
    const seq = await this.prisma.emfgResourceOperatingSchedule.count({ where: { organizationId } });
    const scheduleKey = generateEmfgKey('SCH', seq + 1);
    const row = await this.prisma.emfgResourceOperatingSchedule.create({
      data: { organizationId, scheduleKey, ...payload, capacityMinutes: payload.capacityMinutes ?? 480 },
    });
    await this.audit.log(organizationId, 'EmfgResourceOperatingSchedule', scheduleKey, 'created', userId);
    return row;
  }
}
