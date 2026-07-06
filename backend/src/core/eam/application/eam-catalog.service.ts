import { Injectable } from '@nestjs/common';
import { EamLocationType } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEamKey, buildLocationTree } from '../domain/eam-asset.engine';
import { EamAuditService } from './eam-audit.service';

@Injectable()
export class EamCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EamAuditService,
  ) {}

  listFamilies(organizationId: string) {
    return this.prisma.eamFamily.findMany({
      where: { organizationId, isActive: true },
      include: { subfamilies: { where: { isActive: true } } },
    });
  }

  listClassifications(organizationId: string) {
    return this.prisma.eamClassification.findMany({ where: { organizationId, isActive: true } });
  }

  async createFamily(organizationId: string, userId: string, code: string, name: string, description?: string) {
    const seq = await this.prisma.eamFamily.count({ where: { organizationId } });
    const row = await this.prisma.eamFamily.create({
      data: { organizationId, familyKey: generateEamKey('FAM', seq + 1), code, name, description },
    });
    await this.audit.log(organizationId, 'EamFamily', row.familyKey, 'created', userId);
    return row;
  }

  async createSubfamily(organizationId: string, userId: string, familyKey: string, code: string, name: string) {
    const seq = await this.prisma.eamSubfamily.count({ where: { organizationId } });
    const row = await this.prisma.eamSubfamily.create({
      data: { organizationId, subfamilyKey: generateEamKey('SUB', seq + 1), familyKey, code, name },
    });
    await this.audit.log(organizationId, 'EamSubfamily', row.subfamilyKey, 'created', userId);
    return row;
  }

  async createClassification(organizationId: string, userId: string, code: string, name: string, category?: string) {
    const seq = await this.prisma.eamClassification.count({ where: { organizationId } });
    const row = await this.prisma.eamClassification.create({
      data: { organizationId, classificationKey: generateEamKey('CLS', seq + 1), code, name, category },
    });
    await this.audit.log(organizationId, 'EamClassification', row.classificationKey, 'created', userId);
    return row;
  }

  async seedCatalog(organizationId: string, userId: string) {
    const existing = await this.prisma.eamFamily.count({ where: { organizationId } });
    if (existing > 0) return { families: await this.listFamilies(organizationId), classifications: await this.listClassifications(organizationId) };

    const productive = await this.createFamily(organizationId, userId, 'PROD', 'Activos Productivos', 'Maquinaria y equipos productivos');
    await this.createSubfamily(organizationId, userId, productive.familyKey, 'IND', 'Equipos Industriales');
    await this.createSubfamily(organizationId, userId, productive.familyKey, 'VEH', 'Vehículos');
    await this.createFamily(organizationId, userId, 'TECH', 'Activos Tecnológicos', 'TI y comunicaciones');
    await this.createFamily(organizationId, userId, 'INFRA', 'Infraestructura', 'Plantas y edificaciones');
    await this.createClassification(organizationId, userId, 'CRIT', 'Crítico', 'operational');
    await this.createClassification(organizationId, userId, 'STD', 'Estándar', 'operational');
    return { families: await this.listFamilies(organizationId), classifications: await this.listClassifications(organizationId) };
  }
}

@Injectable()
export class EamLocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EamAuditService,
  ) {}

  list(organizationId: string) {
    return this.prisma.eamLocation.findMany({ where: { organizationId, isActive: true } });
  }

  map(organizationId: string) {
    return this.list(organizationId).then((locations) => buildLocationTree(locations));
  }

  async create(
    organizationId: string,
    userId: string,
    code: string,
    name: string,
    locationType: EamLocationType,
    parentKey?: string,
    latitude?: number,
    longitude?: number,
  ) {
    const seq = await this.prisma.eamLocation.count({ where: { organizationId } });
    const row = await this.prisma.eamLocation.create({
      data: {
        organizationId,
        locationKey: generateEamKey('LOC', seq + 1),
        code,
        name,
        locationType,
        parentKey,
        latitude,
        longitude,
      },
    });
    await this.audit.log(organizationId, 'EamLocation', row.locationKey, 'created', userId);
    return row;
  }

  async seedLocations(organizationId: string, userId: string) {
    const existing = await this.prisma.eamLocation.count({ where: { organizationId } });
    if (existing > 0) return this.map(organizationId);

    const plant = await this.create(organizationId, userId, 'PLT-01', 'Planta Principal', 'plant');
    await this.create(organizationId, userId, 'WH-01', 'Bodega Central', 'warehouse', plant.locationKey);
    await this.create(organizationId, userId, 'FLD-01', 'Campo Norte', 'field', plant.locationKey);
    await this.create(organizationId, userId, 'LOT-01', 'Lote Agrícola A', 'farm_plot', plant.locationKey);
    await this.create(organizationId, userId, 'OFC-01', 'Oficinas Administrativas', 'office');
    await this.create(organizationId, userId, 'DC-01', 'Centro de Distribución', 'distribution_center');
    return this.map(organizationId);
  }
}
