import { Injectable, NotFoundException } from '@nestjs/common';
import { EappPrismaService } from '@/shared/infrastructure/database/eapp-prisma.service';
import { generateEappKey, polygonAreaHaApprox } from '../domain/eapp.engine';
import { EappAuditService } from './eapp-audit.service';

@Injectable()
export class EappGeoService {
  constructor(
    private readonly prisma: EappPrismaService,
    private readonly audit: EappAuditService,
  ) {}

  listPois(organizationId: string, fieldLotId?: string) {
    return this.prisma.eappPoi.findMany({
      where: { organizationId, status: 'active', ...(fieldLotId ? { fieldLotId } : {}) },
      orderBy: { name: 'asc' },
    });
  }

  async createPoi(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      poiType: string;
      latitude: number;
      longitude: number;
      altitudeM?: number;
      fieldLotId?: string;
      farmUnitId?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const count = await this.prisma.eappPoi.count({ where: { organizationId } });
    const poiKey = generateEappKey('POI', count + 1);
    const poi = await this.prisma.eappPoi.create({
      data: {
        organizationId,
        poiKey,
        name: data.name,
        poiType: data.poiType,
        latitude: data.latitude,
        longitude: data.longitude,
        altitudeM: data.altitudeM,
        fieldLotId: data.fieldLotId,
        farmUnitId: data.farmUnitId,
        metadata: (data.metadata ?? {}) as object,
      },
    });
    await this.audit.log(organizationId, 'EappPoi', poiKey, 'poi_created', userId, { name: data.name });
    return poi;
  }

  listInfrastructure(organizationId: string, infraType?: string) {
    return this.prisma.eappGeoInfrastructure.findMany({
      where: {
        organizationId,
        status: 'active',
        ...(infraType ? { infraType } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async createInfrastructure(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      infraType: string;
      geometry: Record<string, unknown>;
      fieldLotId?: string;
      farmUnitId?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const count = await this.prisma.eappGeoInfrastructure.count({ where: { organizationId } });
    const infraKey = generateEappKey('INF', count + 1);
    const row = await this.prisma.eappGeoInfrastructure.create({
      data: {
        organizationId,
        infraKey,
        name: data.name,
        infraType: data.infraType,
        geometry: data.geometry as object,
        fieldLotId: data.fieldLotId,
        farmUnitId: data.farmUnitId,
        metadata: (data.metadata ?? {}) as object,
      },
    });
    await this.audit.log(organizationId, 'EappGeoInfrastructure', infraKey, 'map_edited', userId, { infraType: data.infraType });
    return row;
  }

  listSubdivisions(organizationId: string, parentLotId?: string) {
    return this.prisma.eappLotSubdivision.findMany({
      where: { organizationId, status: 'active', ...(parentLotId ? { parentLotId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSubdivision(
    organizationId: string,
    userId: string,
    data: {
      parentLotId: string;
      childLotCode: string;
      name: string;
      geometry: Record<string, unknown>;
      coords?: Array<[number, number]>;
    },
  ) {
    const count = await this.prisma.eappLotSubdivision.count({ where: { organizationId } });
    const subdivisionKey = generateEappKey('SUB', count + 1);
    const areaHa = data.coords?.length ? polygonAreaHaApprox(data.coords) : undefined;
    const row = await this.prisma.eappLotSubdivision.create({
      data: {
        organizationId,
        subdivisionKey,
        parentLotId: data.parentLotId,
        childLotCode: data.childLotCode,
        name: data.name,
        geometry: data.geometry as object,
        areaHa,
        createdBy: userId,
      },
    });
    await this.audit.log(organizationId, 'EappLotSubdivision', subdivisionKey, 'subdivision_created', userId, {
      parentLotId: data.parentLotId,
    });
    return row;
  }

  async getSubdivision(organizationId: string, subdivisionKey: string) {
    const row = await this.prisma.eappLotSubdivision.findFirst({
      where: { organizationId, subdivisionKey },
    });
    if (!row) throw new NotFoundException('Subdivisión no encontrada');
    return row;
  }
}
