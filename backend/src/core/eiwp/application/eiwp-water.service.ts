import { Injectable, NotFoundException } from '@nestjs/common';
import { EiwpPrismaService } from '@/shared/infrastructure/database/eiwp-prisma.service';
import { EIWP_NETWORK_TYPES, EIWP_WATER_SOURCE_TYPES, generateEiwpKey } from '../domain/eiwp.engine';
import { EiwpAuditService } from './eiwp-audit.service';

@Injectable()
export class EiwpWaterService {
  constructor(
    private readonly prisma: EiwpPrismaService,
    private readonly audit: EiwpAuditService,
  ) {}

  sourceTypes() {
    return EIWP_WATER_SOURCE_TYPES;
  }

  networkTypes() {
    return EIWP_NETWORK_TYPES;
  }

  listSources(organizationId: string) {
    return this.prisma.eiwpWaterSource.findMany({
      where: { organizationId, status: 'active' },
      include: { consumptions: { take: 5, orderBy: { recordedAt: 'desc' } } },
      orderBy: { name: 'asc' },
    });
  }

  async registerSource(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      sourceType: string;
      capacityM3?: number;
      currentLevelM3?: number;
      farmUnitId?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const count = await this.prisma.eiwpWaterSource.count({ where: { organizationId } });
    const sourceKey = generateEiwpKey('SRC', count + 1);
    const row = await this.prisma.eiwpWaterSource.create({
      data: {
        organizationId,
        sourceKey,
        name: data.name,
        sourceType: data.sourceType,
        capacityM3: data.capacityM3,
        currentLevelM3: data.currentLevelM3 ?? data.capacityM3,
        farmUnitId: data.farmUnitId,
        metadata: (data.metadata ?? {}) as object,
      },
    });
    await this.audit.log(organizationId, 'EiwpWaterSource', sourceKey, 'consumption_logged', userId, { action: 'created' });
    return row;
  }

  listNetworks(organizationId: string) {
    return this.prisma.eiwpDistributionNetwork.findMany({
      where: { organizationId, status: 'active' },
      include: { sectors: true },
      orderBy: { name: 'asc' },
    });
  }

  async registerNetwork(
    organizationId: string,
    data: { name: string; networkType: string; sourceId?: string; metadata?: Record<string, unknown> },
  ) {
    const count = await this.prisma.eiwpDistributionNetwork.count({ where: { organizationId } });
    const networkKey = generateEiwpKey('NET', count + 1);
    return this.prisma.eiwpDistributionNetwork.create({
      data: {
        organizationId,
        networkKey,
        name: data.name,
        networkType: data.networkType,
        sourceId: data.sourceId,
        metadata: (data.metadata ?? {}) as object,
      },
    });
  }

  listSectors(organizationId: string, fieldLotId?: string) {
    return this.prisma.eiwpIrrigationSector.findMany({
      where: { organizationId, status: 'active', ...(fieldLotId ? { fieldLotId } : {}) },
      include: { network: true },
      orderBy: { name: 'asc' },
    });
  }

  async registerSector(
    organizationId: string,
    data: {
      name: string;
      fieldLotId?: string;
      networkId?: string;
      areaHa?: number;
      method?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const count = await this.prisma.eiwpIrrigationSector.count({ where: { organizationId } });
    const sectorKey = generateEiwpKey('SEC', count + 1);
    return this.prisma.eiwpIrrigationSector.create({
      data: {
        organizationId,
        sectorKey,
        name: data.name,
        fieldLotId: data.fieldLotId,
        networkId: data.networkId,
        areaHa: data.areaHa,
        method: data.method ?? 'drip',
        metadata: (data.metadata ?? {}) as object,
      },
    });
  }

  listConsumption(organizationId: string, since?: Date) {
    return this.prisma.eiwpWaterConsumption.findMany({
      where: { organizationId, ...(since ? { recordedAt: { gte: since } } : {}) },
      include: { source: true },
      orderBy: { recordedAt: 'desc' },
      take: 500,
    });
  }

  async logConsumption(
    organizationId: string,
    userId: string,
    data: {
      sourceId?: string;
      fieldLotId?: string;
      sectorId?: string;
      volumeM3: number;
      sourceType?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const count = await this.prisma.eiwpWaterConsumption.count({ where: { organizationId } });
    const consumptionKey = generateEiwpKey('CON', count + 1);
    const row = await this.prisma.eiwpWaterConsumption.create({
      data: {
        organizationId,
        consumptionKey,
        sourceId: data.sourceId,
        fieldLotId: data.fieldLotId,
        sectorId: data.sectorId,
        volumeM3: data.volumeM3,
        sourceType: data.sourceType ?? 'irrigation',
        metadata: (data.metadata ?? {}) as object,
      },
    });
    if (data.sourceId) {
      const source = await this.prisma.eiwpWaterSource.findFirst({ where: { id: data.sourceId, organizationId } });
      if (source?.currentLevelM3 != null) {
        await this.prisma.eiwpWaterSource.update({
          where: { id: source.id },
          data: { currentLevelM3: Math.max(0, source.currentLevelM3 - data.volumeM3) },
        });
      }
    }
    await this.audit.log(organizationId, 'EiwpWaterConsumption', consumptionKey, 'consumption_logged', userId, {
      volumeM3: data.volumeM3,
    });
    return row;
  }

  async getSource(organizationId: string, sourceKey: string) {
    const row = await this.prisma.eiwpWaterSource.findFirst({ where: { organizationId, sourceKey } });
    if (!row) throw new NotFoundException('Fuente de agua no encontrada');
    return row;
  }
}
