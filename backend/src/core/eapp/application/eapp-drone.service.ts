import { Injectable, NotFoundException } from '@nestjs/common';
import { EappPrismaService } from '@/shared/infrastructure/database/eapp-prisma.service';
import { generateEappKey } from '../domain/eapp.engine';
import { EappAuditService } from './eapp-audit.service';

@Injectable()
export class EappDroneService {
  constructor(
    private readonly prisma: EappPrismaService,
    private readonly audit: EappAuditService,
  ) {}

  listAssets(organizationId: string) {
    return this.prisma.eappDroneAsset.findMany({
      where: { organizationId, status: 'active' },
      include: { missions: { take: 3, orderBy: { createdAt: 'desc' } } },
    });
  }

  async registerAsset(
    organizationId: string,
    data: { name: string; vendor?: string; model?: string; metadata?: Record<string, unknown> },
  ) {
    const count = await this.prisma.eappDroneAsset.count({ where: { organizationId } });
    const assetKey = generateEappKey('DRN', count + 1);
    return this.prisma.eappDroneAsset.create({
      data: {
        organizationId,
        assetKey,
        name: data.name,
        vendor: data.vendor ?? 'generic',
        model: data.model,
        metadata: (data.metadata ?? {}) as object,
      },
    });
  }

  listMissions(organizationId: string, fieldLotId?: string) {
    return this.prisma.eappDroneMission.findMany({
      where: { organizationId, ...(fieldLotId ? { fieldLotId } : {}) },
      include: { asset: true, flights: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async createMission(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      fieldLotId?: string;
      farmUnitId?: string;
      assetId?: string;
      plannedAt?: Date;
      objectives?: unknown[];
      metadata?: Record<string, unknown>;
    },
  ) {
    const count = await this.prisma.eappDroneMission.count({ where: { organizationId } });
    const missionKey = generateEappKey('MSN', count + 1);
    return this.prisma.eappDroneMission.create({
      data: {
        organizationId,
        missionKey,
        name: data.name,
        fieldLotId: data.fieldLotId,
        farmUnitId: data.farmUnitId,
        assetId: data.assetId,
        plannedAt: data.plannedAt,
        objectives: (data.objectives ?? []) as object,
        metadata: (data.metadata ?? {}) as object,
        createdBy: userId,
        status: 'scheduled',
      },
    });
  }

  listFlights(organizationId: string, missionId?: string) {
    return this.prisma.eappDroneFlight.findMany({
      where: { organizationId, ...(missionId ? { missionId } : {}) },
      include: { mission: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async registerFlight(
    organizationId: string,
    userId: string,
    data: {
      missionId?: string;
      startedAt?: Date;
      endedAt?: Date;
      photoCount?: number;
      hasOrtomosaic?: boolean;
      hasDem?: boolean;
      hasPointCloud?: boolean;
      metadata?: Record<string, unknown>;
    },
  ) {
    const count = await this.prisma.eappDroneFlight.count({ where: { organizationId } });
    const flightKey = generateEappKey('FLT', count + 1);
    const flight = await this.prisma.eappDroneFlight.create({
      data: {
        organizationId,
        flightKey,
        missionId: data.missionId,
        startedAt: data.startedAt,
        endedAt: data.endedAt,
        status: 'completed',
        photoCount: data.photoCount ?? 0,
        hasOrtomosaic: data.hasOrtomosaic ?? false,
        hasDem: data.hasDem ?? false,
        hasPointCloud: data.hasPointCloud ?? false,
        metadata: (data.metadata ?? {}) as object,
      },
    });
    await this.audit.log(organizationId, 'EappDroneFlight', flightKey, 'flight_registered', userId, {
      missionId: data.missionId,
    });
    return flight;
  }

  async getFlight(organizationId: string, flightKey: string) {
    const row = await this.prisma.eappDroneFlight.findFirst({
      where: { organizationId, flightKey },
      include: { mission: true },
    });
    if (!row) throw new NotFoundException('Vuelo no encontrado');
    return row;
  }
}
