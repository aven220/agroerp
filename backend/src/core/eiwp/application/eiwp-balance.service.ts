import { Injectable } from '@nestjs/common';
import { EiwpPrismaService } from '@/shared/infrastructure/database/eiwp-prisma.service';
import { computeWaterBalance, generateEiwpKey } from '../domain/eiwp.engine';
import { EiwpAuditService } from './eiwp-audit.service';

@Injectable()
export class EiwpBalanceService {
  constructor(
    private readonly prisma: EiwpPrismaService,
    private readonly audit: EiwpAuditService,
  ) {}

  list(organizationId: string, fieldLotId?: string) {
    return this.prisma.eiwpWaterBalance.findMany({
      where: { organizationId, ...(fieldLotId ? { fieldLotId } : {}) },
      include: { sector: true },
      orderBy: { periodEnd: 'desc' },
      take: 200,
    });
  }

  async compute(
    organizationId: string,
    userId: string | undefined,
    data: {
      fieldLotId?: string;
      sectorId?: string;
      periodStart: Date;
      periodEnd: Date;
      appliedWaterMm?: number;
      rainfallMm?: number;
      etMm?: number;
      cropDemandMm?: number;
      availabilityM3?: number;
    },
  ) {
    const since = data.periodStart;
    const [applied, rainfall, consumptions] = await Promise.all([
      data.appliedWaterMm != null
        ? Promise.resolve(data.appliedWaterMm)
        : this.sumIrrigationMm(organizationId, data.fieldLotId, since, data.periodEnd),
      data.rainfallMm != null
        ? Promise.resolve(data.rainfallMm)
        : this.sumRainfallMm(organizationId, data.fieldLotId, since, data.periodEnd),
      this.prisma.eiwpWaterConsumption.aggregate({
        where: {
          organizationId,
          recordedAt: { gte: since, lte: data.periodEnd },
          ...(data.fieldLotId ? { fieldLotId: data.fieldLotId } : {}),
        },
        _sum: { volumeM3: true },
      }),
    ]);
    const availabilityM3 = data.availabilityM3 ?? Number(consumptions._sum.volumeM3 ?? 0);
    const balance = computeWaterBalance({
      appliedWaterMm: applied,
      rainfallMm: rainfall,
      etMm: data.etMm ?? 4,
      cropDemandMm: data.cropDemandMm ?? 5,
      availabilityM3,
    });
    const count = await this.prisma.eiwpWaterBalance.count({ where: { organizationId } });
    const balanceKey = generateEiwpKey('BAL', count + 1);
    const row = await this.prisma.eiwpWaterBalance.create({
      data: {
        organizationId,
        balanceKey,
        fieldLotId: data.fieldLotId,
        sectorId: data.sectorId,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        appliedWaterMm: balance.appliedWaterMm,
        rainfallMm: balance.rainfallMm,
        etMm: balance.etMm,
        cropDemandMm: balance.cropDemandMm,
        deficitMm: balance.deficitMm,
        excessMm: balance.excessMm,
        availabilityM3: balance.availabilityM3,
        metadata: { status: balance.status, netBalanceMm: balance.netBalanceMm } as object,
      },
    });
    await this.audit.log(organizationId, 'EiwpWaterBalance', balanceKey, 'balance_computed', userId, balance);
    return { ...row, computed: balance };
  }

  private async sumIrrigationMm(organizationId: string, fieldLotId: string | undefined, start: Date, end: Date) {
    const events = await this.prisma.eiwpIrrigationEvent.findMany({
      where: {
        organizationId,
        recordedAt: { gte: start, lte: end },
        ...(fieldLotId ? { schedule: { fieldLotId } } : {}),
      },
    });
    const totalM3 = events.reduce((s, e) => s + (e.volumeM3 ?? 0), 0);
    return totalM3 * 0.1;
  }

  private async sumRainfallMm(organizationId: string, fieldLotId: string | undefined, start: Date, end: Date) {
    const events = await this.prisma.eiwpRainfallEvent.findMany({
      where: {
        organizationId,
        recordedAt: { gte: start, lte: end },
        ...(fieldLotId ? { fieldLotId } : {}),
      },
    });
    return events.reduce((s, e) => s + e.depthMm, 0);
  }
}
