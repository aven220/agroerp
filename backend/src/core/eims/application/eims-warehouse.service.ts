import { Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EimsAuditService } from './eims-audit.service';

@Injectable()
export class EimsWarehouseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EimsAuditService,
  ) {}

  list(organizationId: string, all = false) {
    return this.prisma.eimsWarehouse.findMany({
      where: { organizationId, ...(all ? {} : { isActive: true }) },
      include: { locations: { where: { isActive: true }, take: 50 } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(organizationId: string, warehouseKey: string) {
    const row = await this.prisma.eimsWarehouse.findFirst({
      where: { organizationId, warehouseKey },
      include: { locations: { orderBy: { locationKey: 'asc' } } },
    });
    if (!row) throw new NotFoundException(`Bodega ${warehouseKey} no encontrada`);
    return row;
  }

  async upsert(
    organizationId: string,
    userId: string,
    input: {
      warehouseKey: string;
      name: string;
      warehouseType: string;
      address?: string;
      municipality?: string;
      latitude?: number;
      longitude?: number;
      responsibleId?: string;
      responsibleName?: string;
      metadata?: Record<string, unknown>;
      isActive?: boolean;
    },
  ) {
    const row = await this.prisma.eimsWarehouse.upsert({
      where: {
        organizationId_warehouseKey: { organizationId, warehouseKey: input.warehouseKey },
      },
      update: {
        name: input.name,
        warehouseType: input.warehouseType,
        address: input.address,
        municipality: input.municipality,
        latitude: input.latitude,
        longitude: input.longitude,
        responsibleId: input.responsibleId,
        responsibleName: input.responsibleName,
        metadata: (input.metadata ?? {}) as object,
        isActive: input.isActive ?? true,
        updatedBy: userId,
      },
      create: {
        organizationId,
        warehouseKey: input.warehouseKey,
        name: input.name,
        warehouseType: input.warehouseType,
        address: input.address,
        municipality: input.municipality,
        latitude: input.latitude,
        longitude: input.longitude,
        responsibleId: input.responsibleId,
        responsibleName: input.responsibleName,
        metadata: (input.metadata ?? {}) as object,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    await this.audit.log(organizationId, 'Warehouse', input.warehouseKey, 'upsert', userId, {
      warehouseType: input.warehouseType,
      responsibleName: input.responsibleName,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsWarehouse',
      row.id,
      EVENT_TYPES.EIMS_WAREHOUSE_UPDATED,
      { warehouseKey: input.warehouseKey },
    );
    return row;
  }
}
