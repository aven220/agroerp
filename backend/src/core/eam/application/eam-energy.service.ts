import { Injectable } from '@nestjs/common';
import { EamEnergyType } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { aggregateEnergyReadings, generateEamReliabilityKey } from '../domain/eam-reliability.engine';
import { EamAuditService } from './eam-audit.service';
import { EamReliabilityIntegrationService } from './eam-reliability-integration.service';

@Injectable()
export class EamEnergyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EamAuditService,
    private readonly integration: EamReliabilityIntegrationService,
  ) {}

  listReadings(organizationId: string, assetKey?: string, energyType?: EamEnergyType) {
    return this.prisma.eamEnergyReading.findMany({
      where: {
        organizationId,
        ...(assetKey ? { assetKey } : {}),
        ...(energyType ? { energyType } : {}),
      },
      orderBy: { periodStart: 'desc' },
    });
  }

  async recordReading(
    organizationId: string,
    userId: string,
    energyType: EamEnergyType,
    quantity: number,
    periodStart: Date,
    periodEnd: Date,
    unitCost: number,
    assetKey?: string,
    locationKey?: string,
    unit?: string,
  ) {
    const totalCost = Math.round(quantity * unitCost * 100) / 100;
    const seq = await this.prisma.eamEnergyReading.count({ where: { organizationId } });
    const reading = await this.prisma.eamEnergyReading.create({
      data: {
        organizationId,
        readingKey: generateEamReliabilityKey('ENR', seq + 1),
        assetKey,
        locationKey,
        energyType,
        quantity,
        unit: unit ?? (energyType === 'electricity' ? 'kWh' : energyType === 'water' ? 'm³' : 'L'),
        unitCost,
        totalCost,
        periodStart,
        periodEnd,
      },
    });
    await this.audit.log(organizationId, 'EamEnergyReading', reading.readingKey, 'energy_recorded', userId, { energyType, quantity });
    await this.integration.onEnergyRecorded(organizationId, reading.readingKey);
    return reading;
  }

  async computeSnapshot(organizationId: string, userId: string) {
    const readings = await this.prisma.eamEnergyReading.findMany({ where: { organizationId } });
    const aggregated = aggregateEnergyReadings(
      readings.map((r) => ({
        energyType: r.energyType,
        quantity: r.quantity,
        totalCost: r.totalCost,
        assetKey: r.assetKey ?? undefined,
        locationKey: r.locationKey ?? undefined,
      })),
    );
    const snapshot = await this.prisma.eamEnergySnapshot.upsert({
      where: { organizationId_snapshotKey: { organizationId, snapshotKey: 'energy-summary' } },
      create: { organizationId, snapshotKey: 'energy-summary', indicators: aggregated as object },
      update: { indicators: aggregated as object, computedAt: new Date() },
    });
    await this.audit.log(organizationId, 'EamEnergySnapshot', 'energy-summary', 'updated', userId, {});
    return snapshot;
  }

  dashboard(organizationId: string) {
    return Promise.all([
      this.listReadings(organizationId),
      this.prisma.eamEnergySnapshot.findFirst({ where: { organizationId, snapshotKey: 'energy-summary' } }),
    ]).then(([readings, snapshot]) => ({ readings, indicators: snapshot?.indicators ?? {} }));
  }
}
