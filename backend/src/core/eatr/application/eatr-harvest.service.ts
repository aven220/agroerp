import { Injectable, NotFoundException } from '@nestjs/common';
import { EatrPrismaService } from '@/shared/infrastructure/database/eatr-prisma.service';
import { computeHarvestYield, generateEatrKey } from '../domain/eatr.engine';
import { EatrAuditService } from './eatr-audit.service';
import { EatrTraceService } from './eatr-trace.service';

@Injectable()
export class EatrHarvestService {
  constructor(
    private readonly prisma: EatrPrismaService,
    private readonly audit: EatrAuditService,
    private readonly trace: EatrTraceService,
  ) {}

  listSchedules(organizationId: string, fieldLotId?: string) {
    return this.prisma.eatrHarvestSchedule.findMany({
      where: { organizationId, ...(fieldLotId ? { fieldLotId } : {}) },
      include: { records: true },
      orderBy: { plannedDate: 'desc' },
    });
  }

  async schedule(
    organizationId: string,
    userId: string,
    data: { fieldLotId?: string; plannedDate: Date; crewName?: string; machinery?: string },
  ) {
    const count = await this.prisma.eatrHarvestSchedule.count({ where: { organizationId } });
    const scheduleKey = generateEatrKey('HSC', count + 1);
    return this.prisma.eatrHarvestSchedule.create({
      data: {
        organizationId, scheduleKey, fieldLotId: data.fieldLotId,
        plannedDate: data.plannedDate, crewName: data.crewName, machinery: data.machinery,
      },
    });
  }

  async recordHarvest(
    organizationId: string,
    userId: string,
    data: {
      scheduleKey?: string; fieldLotId?: string; productionLotId?: string;
      producedKg: number; lossKg?: number; wasteKg?: number; areaHa?: number;
    },
  ) {
    const yieldData = computeHarvestYield(data.producedKg, data.lossKg ?? 0, data.wasteKg ?? 0, data.areaHa);
    const count = await this.prisma.eatrHarvestLot.count({ where: { organizationId } });
    const harvestLotKey = generateEatrKey('HRV', count + 1);
    const harvestLot = await this.prisma.eatrHarvestLot.create({
      data: {
        organizationId, harvestLotKey, productionLotId: data.productionLotId,
        fieldLotId: data.fieldLotId, harvestedKg: yieldData.netKg,
        lossKg: data.lossKg, wasteKg: data.wasteKg, yieldPct: yieldData.yieldPct,
      },
    });
    const recCount = await this.prisma.eatrHarvestRecord.count({ where: { organizationId } });
    const recordKey = generateEatrKey('HRC', recCount + 1);
    let scheduleId: string | undefined;
    if (data.scheduleKey) {
      const sch = await this.prisma.eatrHarvestSchedule.findFirst({ where: { organizationId, scheduleKey: data.scheduleKey } });
      scheduleId = sch?.id;
    }
    await this.prisma.eatrHarvestRecord.create({
      data: {
        organizationId, recordKey, scheduleId, harvestLotId: harvestLot.id,
        producedKg: data.producedKg, lossKg: data.lossKg, wasteKg: data.wasteKg,
        yieldPct: yieldData.yieldPct, recordedBy: userId,
      },
    });
    await this.trace.recordEvent(organizationId, userId, {
      eventType: 'harvest', fieldLotId: data.fieldLotId, productionLotId: data.productionLotId,
      payload: { harvestLotKey, ...yieldData },
    });
    await this.audit.log(organizationId, 'EatrHarvestLot', harvestLotKey, 'harvest_recorded', userId, yieldData);
    return { harvestLot, yield: yieldData };
  }

  listWeighings(organizationId: string) {
    return this.prisma.eatrWeighing.findMany({
      where: { organizationId },
      include: { harvestLot: true },
      orderBy: { recordedAt: 'desc' },
      take: 200,
    });
  }

  async recordWeighing(
    organizationId: string,
    userId: string,
    data: { harvestLotKey?: string; grossKg: number; tareKg?: number },
  ) {
    let harvestLotId: string | undefined;
    if (data.harvestLotKey) {
      const lot = await this.prisma.eatrHarvestLot.findFirst({ where: { organizationId, harvestLotKey: data.harvestLotKey } });
      if (!lot) throw new NotFoundException('Lote de cosecha no encontrado');
      harvestLotId = lot.id;
    }
    const netKg = data.grossKg - (data.tareKg ?? 0);
    const count = await this.prisma.eatrWeighing.count({ where: { organizationId } });
    const weighingKey = generateEatrKey('WGH', count + 1);
    return this.prisma.eatrWeighing.create({
      data: { organizationId, weighingKey, harvestLotId, grossKg: data.grossKg, tareKg: data.tareKg, netKg, recordedBy: userId },
    });
  }
}
