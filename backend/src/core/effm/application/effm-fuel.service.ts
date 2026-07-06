import { Injectable } from '@nestjs/common';
import { EffmPrismaService } from '@/shared/infrastructure/database/effm-prisma.service';
import { computeFuelEfficiency, generateEffmKey } from '../domain/effm.engine';
import { EffmAuditService } from './effm-audit.service';

@Injectable()
export class EffmFuelService {
  constructor(
    private readonly prisma: EffmPrismaService,
    private readonly audit: EffmAuditService,
  ) {}

  list(organizationId: string, machineId?: string) {
    return this.prisma.effmFuelRecord.findMany({
      where: { organizationId, ...(machineId ? { machineId } : {}) },
      orderBy: { recordedAt: 'desc' },
    });
  }

  async recordFuel(
    organizationId: string,
    userId: string,
    data: { machineId: string; liters: number; cost?: number; sessionId?: string; cropCode?: string; laborTaskRef?: string; hoursWorked?: number; areaHa?: number },
  ) {
    const eff = computeFuelEfficiency(data.liters, data.hoursWorked, data.areaHa);
    const count = await this.prisma.effmFuelRecord.count({ where: { organizationId } });
    const fuelKey = generateEffmKey('FUL', count + 1);
    const row = await this.prisma.effmFuelRecord.create({
      data: {
        organizationId, fuelKey, machineId: data.machineId, sessionId: data.sessionId,
        liters: data.liters, cost: data.cost, cropCode: data.cropCode, laborTaskRef: data.laborTaskRef,
        efficiencyLph: eff.efficiencyLph, litersPerHa: eff.litersPerHa, recordedBy: userId,
      },
    });
    await this.audit.log(organizationId, 'EffmFuelRecord', fuelKey, 'fuel_recorded', userId);
    return row;
  }
}
