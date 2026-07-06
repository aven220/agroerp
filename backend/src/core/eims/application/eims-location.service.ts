import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EimsAuditService } from './eims-audit.service';
import { generateLocationKey } from '../domain/eims.catalogs';

@Injectable()
export class EimsLocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EimsAuditService,
  ) {}

  list(organizationId: string, warehouseKey?: string) {
    return this.prisma.eimsLocation.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(warehouseKey ? { warehouse: { warehouseKey } } : {}),
      },
      include: { warehouse: { select: { warehouseKey: true, name: true } }, parent: true },
      orderBy: { locationKey: 'asc' },
      take: 500,
    });
  }

  async findOne(organizationId: string, locationKey: string) {
    const row = await this.prisma.eimsLocation.findFirst({
      where: { organizationId, locationKey },
      include: { warehouse: true, children: true, parent: true },
    });
    if (!row) throw new NotFoundException(`Ubicación ${locationKey} no encontrada`);
    return row;
  }

  async upsert(
    organizationId: string,
    userId: string,
    input: {
      warehouseKey: string;
      locationKey?: string;
      name: string;
      locationType: string;
      parentKey?: string;
      aisle?: string;
      shelf?: string;
      level?: string;
      position?: string;
      metadata?: Record<string, unknown>;
      isActive?: boolean;
    },
  ) {
    const warehouse = await this.prisma.eimsWarehouse.findFirst({
      where: { organizationId, warehouseKey: input.warehouseKey },
    });
    if (!warehouse) throw new BadRequestException(`Bodega ${input.warehouseKey} no encontrada`);

    const locationKey =
      input.locationKey ??
      generateLocationKey({
        warehouseKey: input.warehouseKey,
        aisle: input.aisle,
        shelf: input.shelf,
        level: input.level,
        position: input.position,
      });

    let parentId: string | undefined;
    if (input.parentKey) {
      const parent = await this.prisma.eimsLocation.findFirst({
        where: { organizationId, locationKey: input.parentKey },
      });
      if (!parent) throw new BadRequestException(`Ubicación padre ${input.parentKey} no encontrada`);
      parentId = parent.id;
    }

    const qrCode = `EIMS-LOC:${locationKey}`;
    const barcode = locationKey.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 20);

    const row = await this.prisma.eimsLocation.upsert({
      where: { organizationId_locationKey: { organizationId, locationKey } },
      update: {
        name: input.name,
        locationType: input.locationType,
        parentId,
        aisle: input.aisle,
        shelf: input.shelf,
        level: input.level,
        position: input.position,
        qrCode,
        barcode,
        metadata: (input.metadata ?? {}) as object,
        isActive: input.isActive ?? true,
        updatedBy: userId,
      },
      create: {
        organizationId,
        warehouseId: warehouse.id,
        locationKey,
        name: input.name,
        locationType: input.locationType,
        parentId,
        aisle: input.aisle,
        shelf: input.shelf,
        level: input.level,
        position: input.position,
        qrCode,
        barcode,
        metadata: (input.metadata ?? {}) as object,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    await this.audit.log(organizationId, 'Location', locationKey, 'upsert', userId, {
      warehouseKey: input.warehouseKey,
      locationType: input.locationType,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsLocation',
      row.id,
      EVENT_TYPES.EIMS_LOCATION_UPDATED,
      { locationKey, warehouseKey: input.warehouseKey },
    );
    return row;
  }
}
