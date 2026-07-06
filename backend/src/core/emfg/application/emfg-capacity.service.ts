import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { computeAvailableCapacity, generateEmfgKey } from '../domain/emfg-manufacturing.engine';
import { EmfgAuditService } from './emfg-audit.service';

@Injectable()
export class EmfgCapacityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EmfgAuditService,
  ) {}

  async listCenters(organizationId: string) {
    return this.prisma.emfgProductionCenter.findMany({
      where: { organizationId },
      include: { lines: true, workCenters: { include: { machines: true } } },
      orderBy: { code: 'asc' },
    });
  }

  async upsertCenter(organizationId: string, userId: string, payload: {
    centerKey?: string; code: string; name: string; description?: string;
    installedCapacity?: number; calendarKey?: string;
  }) {
    const seq = await this.prisma.emfgProductionCenter.count({ where: { organizationId } });
    const centerKey = payload.centerKey ?? generateEmfgKey('CTR', seq + 1);
    const row = await this.prisma.emfgProductionCenter.upsert({
      where: { organizationId_centerKey: { organizationId, centerKey } },
      create: {
        organizationId,
        centerKey,
        code: payload.code,
        name: payload.name,
        description: payload.description,
        installedCapacity: payload.installedCapacity ?? 480,
        availableCapacity: payload.installedCapacity ?? 480,
        calendarKey: payload.calendarKey,
        createdBy: userId,
      },
      update: {
        name: payload.name,
        description: payload.description,
        installedCapacity: payload.installedCapacity,
        availableCapacity: payload.installedCapacity,
        calendarKey: payload.calendarKey,
      },
    });
    await this.audit.log(organizationId, 'EmfgProductionCenter', centerKey, 'created', userId);
    return row;
  }

  async upsertLine(organizationId: string, userId: string, payload: {
    lineKey?: string; centerKey: string; code: string; name: string; installedCapacity?: number;
  }) {
    const seq = await this.prisma.emfgProductionLine.count({ where: { organizationId } });
    const lineKey = payload.lineKey ?? generateEmfgKey('LN', seq + 1);
    const row = await this.prisma.emfgProductionLine.upsert({
      where: { organizationId_lineKey: { organizationId, lineKey } },
      create: {
        organizationId,
        lineKey,
        centerKey: payload.centerKey,
        code: payload.code,
        name: payload.name,
        installedCapacity: payload.installedCapacity ?? 240,
        availableCapacity: payload.installedCapacity ?? 240,
      },
      update: {
        name: payload.name,
        installedCapacity: payload.installedCapacity,
        availableCapacity: payload.installedCapacity,
      },
    });
    await this.audit.log(organizationId, 'EmfgProductionLine', lineKey, 'updated', userId);
    return row;
  }

  async upsertWorkCenter(organizationId: string, userId: string, payload: {
    workCenterKey?: string; centerKey: string; code: string; name: string;
    installedCapacity?: number; costRate?: number;
  }) {
    const seq = await this.prisma.emfgWorkCenter.count({ where: { organizationId } });
    const workCenterKey = payload.workCenterKey ?? generateEmfgKey('WC', seq + 1);
    const cap = payload.installedCapacity ?? 160;
    const row = await this.prisma.emfgWorkCenter.upsert({
      where: { organizationId_workCenterKey: { organizationId, workCenterKey } },
      create: {
        organizationId,
        workCenterKey,
        centerKey: payload.centerKey,
        code: payload.code,
        name: payload.name,
        installedCapacity: cap,
        availableCapacity: cap,
        costRate: payload.costRate ?? 0,
      },
      update: {
        name: payload.name,
        installedCapacity: cap,
        availableCapacity: cap,
        costRate: payload.costRate,
      },
    });
    await this.audit.log(organizationId, 'EmfgWorkCenter', workCenterKey, 'updated', userId);
    return row;
  }

  async upsertMachine(organizationId: string, userId: string, payload: {
    machineKey?: string; workCenterKey: string; code: string; name: string; capacityFactor?: number;
  }) {
    const seq = await this.prisma.emfgMachine.count({ where: { organizationId } });
    const machineKey = payload.machineKey ?? generateEmfgKey('MC', seq + 1);
    return this.prisma.emfgMachine.upsert({
      where: { organizationId_machineKey: { organizationId, machineKey } },
      create: {
        organizationId,
        machineKey,
        workCenterKey: payload.workCenterKey,
        code: payload.code,
        name: payload.name,
        capacityFactor: payload.capacityFactor ?? 1,
      },
      update: { name: payload.name, capacityFactor: payload.capacityFactor },
    });
  }

  async refreshAvailableCapacity(organizationId: string, workCenterKey: string) {
    const wc = await this.prisma.emfgWorkCenter.findUnique({
      where: { organizationId_workCenterKey: { organizationId, workCenterKey } },
    });
    if (!wc) throw new NotFoundException('Work center not found');

    const scheduled = await this.prisma.emfgScheduleEntry.aggregate({
      where: { organizationId, workCenterKey },
      _sum: { loadMinutes: true },
    });
    const load = scheduled._sum.loadMinutes ?? 0;
    const available = computeAvailableCapacity(wc.installedCapacity, load);
    return this.prisma.emfgWorkCenter.update({
      where: { organizationId_workCenterKey: { organizationId, workCenterKey } },
      data: { availableCapacity: available },
    });
  }

  async capacitySummary(organizationId: string) {
    const centers = await this.prisma.emfgProductionCenter.findMany({ where: { organizationId, isActive: true } });
    const workCenters = await this.prisma.emfgWorkCenter.findMany({ where: { organizationId, isActive: true } });
    const installed = workCenters.reduce((s, w) => s + w.installedCapacity, 0);
    const available = workCenters.reduce((s, w) => s + w.availableCapacity, 0);
    return {
      centerCount: centers.length,
      workCenterCount: workCenters.length,
      installedCapacity: installed,
      availableCapacity: available,
      utilizationPct: installed > 0 ? Math.round(((installed - available) / installed) * 100) : 0,
      workCenters,
    };
  }
}
