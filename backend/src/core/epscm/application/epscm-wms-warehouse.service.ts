import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  EpscmWmsLocationStatus,
  EpscmWmsLocationType,
} from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  canStoreAtLocation,
  computeOccupancyPct,
  generateEpscmWmsKey,
  suggestLocation,
} from '../domain/epscm-wms.engine';
import { EpscmAuditService } from './epscm-audit.service';

@Injectable()
export class EpscmWmsWarehouseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EpscmAuditService,
  ) {}

  async hierarchy(organizationId: string, warehouseKey: string) {
    const warehouse = await this.prisma.epscmWarehouse.findFirst({
      where: { organizationId, warehouseKey, isActive: true },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    const zones = await this.prisma.epscmWmsZone.findMany({
      where: { organizationId, warehouseKey },
      include: {
        aisles: {
          include: {
            racks: {
              include: { levels: { include: { locations: true } } },
            },
          },
        },
      },
    });

    const flatLocations = await this.prisma.epscmWmsLocation.findMany({
      where: { organizationId, warehouseKey },
    });

    return { warehouse, zones, flatLocations };
  }

  async storageMap(organizationId: string, warehouseKey: string) {
    const locations = await this.prisma.epscmWmsLocation.findMany({
      where: { organizationId, warehouseKey, isActive: true },
      include: { stocks: true },
    });
    return locations.map((loc) => ({
      locationKey: loc.locationKey,
      code: loc.code,
      status: loc.status,
      mapX: loc.mapX,
      mapY: loc.mapY,
      mapZ: loc.mapZ,
      occupancyPct: computeOccupancyPct(loc.occupiedQty, loc.capacityQty),
      stockCount: loc.stocks.length,
    }));
  }

  async createZone(organizationId: string, userId: string, warehouseKey: string, code: string, name: string, zoneType = 'storage') {
    const seq = await this.prisma.epscmWmsZone.count({ where: { organizationId } });
    const zone = await this.prisma.epscmWmsZone.create({
      data: {
        organizationId,
        zoneKey: generateEpscmWmsKey('ZONE', seq + 1),
        warehouseKey,
        code,
        name,
        zoneType,
      },
    });
    await this.audit.log(organizationId, 'EpscmWmsZone', zone.zoneKey, 'created', userId);
    return zone;
  }

  async createAisle(organizationId: string, userId: string, zoneKey: string, code: string, name: string) {
    const seq = await this.prisma.epscmWmsAisle.count({ where: { organizationId } });
    const aisle = await this.prisma.epscmWmsAisle.create({
      data: {
        organizationId,
        aisleKey: generateEpscmWmsKey('AISLE', seq + 1),
        zoneKey,
        code,
        name,
      },
    });
    await this.audit.log(organizationId, 'EpscmWmsAisle', aisle.aisleKey, 'created', userId);
    return aisle;
  }

  async createRack(organizationId: string, userId: string, aisleKey: string, code: string, name: string) {
    const seq = await this.prisma.epscmWmsRack.count({ where: { organizationId } });
    const rack = await this.prisma.epscmWmsRack.create({
      data: {
        organizationId,
        rackKey: generateEpscmWmsKey('RACK', seq + 1),
        aisleKey,
        code,
        name,
      },
    });
    await this.audit.log(organizationId, 'EpscmWmsRack', rack.rackKey, 'created', userId);
    return rack;
  }

  async createLevel(organizationId: string, userId: string, rackKey: string, levelNumber: number, code: string) {
    const seq = await this.prisma.epscmWmsLevel.count({ where: { organizationId } });
    const level = await this.prisma.epscmWmsLevel.create({
      data: {
        organizationId,
        levelKey: generateEpscmWmsKey('LVL', seq + 1),
        rackKey,
        levelNumber,
        code,
      },
    });
    await this.audit.log(organizationId, 'EpscmWmsLevel', level.levelKey, 'created', userId);
    return level;
  }

  async createLocation(
    organizationId: string,
    userId: string,
    input: {
      warehouseKey: string;
      levelKey?: string;
      zoneKey?: string;
      code: string;
      locationType?: EpscmWmsLocationType;
      capacityQty?: number;
      mapX?: number;
      mapY?: number;
      mapZ?: number;
    },
  ) {
    const seq = await this.prisma.epscmWmsLocation.count({ where: { organizationId } });
    const location = await this.prisma.epscmWmsLocation.create({
      data: {
        organizationId,
        locationKey: generateEpscmWmsKey('LOC', seq + 1),
        warehouseKey: input.warehouseKey,
        levelKey: input.levelKey,
        zoneKey: input.zoneKey,
        code: input.code,
        locationType: input.locationType ?? 'fixed',
        capacityQty: input.capacityQty ?? 0,
        mapX: input.mapX,
        mapY: input.mapY,
        mapZ: input.mapZ,
      },
    });
    await this.audit.log(organizationId, 'EpscmWmsLocation', location.locationKey, 'created', userId);
    return location;
  }

  async seedHierarchy(organizationId: string, userId: string, warehouseKey: string) {
    const existing = await this.prisma.epscmWmsZone.count({ where: { organizationId, warehouseKey } });
    if (existing > 0) return this.hierarchy(organizationId, warehouseKey);

    const zone = await this.createZone(organizationId, userId, warehouseKey, 'Z-A', 'Zona A', 'storage');
    const aisle = await this.createAisle(organizationId, userId, zone.zoneKey, 'A-01', 'Pasillo 01');
    const rack = await this.createRack(organizationId, userId, aisle.aisleKey, 'R-01', 'Estantería 01');
    const level = await this.createLevel(organizationId, userId, rack.rackKey, 1, 'N-01');
    await this.createLocation(organizationId, userId, {
      warehouseKey,
      levelKey: level.levelKey,
      zoneKey: zone.zoneKey,
      code: 'A-01-01-01',
      locationType: 'fixed',
      capacityQty: 1000,
      mapX: 1,
      mapY: 1,
      mapZ: 1,
    });
    await this.createLocation(organizationId, userId, {
      warehouseKey,
      zoneKey: zone.zoneKey,
      code: 'DYN-01',
      locationType: 'dynamic',
      capacityQty: 5000,
      mapX: 2,
      mapY: 1,
    });
    return this.hierarchy(organizationId, warehouseKey);
  }
}

@Injectable()
export class EpscmWmsLocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EpscmAuditService,
  ) {}

  list(organizationId: string, warehouseKey?: string, status?: EpscmWmsLocationStatus) {
    return this.prisma.epscmWmsLocation.findMany({
      where: {
        organizationId,
        ...(warehouseKey ? { warehouseKey } : {}),
        ...(status ? { status } : {}),
      },
      include: { stocks: true },
      orderBy: { code: 'asc' },
    });
  }

  async get(organizationId: string, locationKey: string) {
    const loc = await this.prisma.epscmWmsLocation.findFirst({
      where: { organizationId, locationKey },
      include: { stocks: true },
    });
    if (!loc) throw new NotFoundException('Location not found');
    return loc;
  }

  async suggest(organizationId: string, warehouseKey: string, itemKey: string, qty: number) {
    const locations = await this.prisma.epscmWmsLocation.findMany({
      where: { organizationId, warehouseKey, isActive: true, status: 'available' },
    });
    const suggested = suggestLocation(
      locations.map((l) => ({
        locationKey: l.locationKey,
        code: l.code,
        capacityQty: l.capacityQty,
        occupiedQty: l.occupiedQty,
        mapX: l.mapX,
        mapY: l.mapY,
      })),
      qty,
    );
    return { itemKey, qty, suggested };
  }

  async block(organizationId: string, userId: string, locationKey: string, reason?: string) {
    const loc = await this.get(organizationId, locationKey);
    const updated = await this.prisma.epscmWmsLocation.update({
      where: { id: loc.id },
      data: { status: 'blocked', metadata: { ...(loc.metadata as object), blockReason: reason } as object },
    });
    await this.audit.log(organizationId, 'EpscmWmsLocation', locationKey, 'wms_location_blocked', userId, { reason });
    return updated;
  }

  async unblock(organizationId: string, userId: string, locationKey: string) {
    const loc = await this.get(organizationId, locationKey);
    const updated = await this.prisma.epscmWmsLocation.update({
      where: { id: loc.id },
      data: { status: loc.occupiedQty > 0 ? 'occupied' : 'available' },
    });
    await this.audit.log(organizationId, 'EpscmWmsLocation', locationKey, 'updated', userId);
    return updated;
  }

  async relocate(
    organizationId: string,
    userId: string,
    fromLocationKey: string,
    toLocationKey: string,
    itemKey: string,
    qty: number,
    lotKey?: string,
  ) {
    const [from, to] = await Promise.all([
      this.get(organizationId, fromLocationKey),
      this.get(organizationId, toLocationKey),
    ]);
    if (to.status === 'blocked') throw new BadRequestException('Target location blocked');
    if (!canStoreAtLocation(to.occupiedQty, to.capacityQty, qty)) {
      throw new BadRequestException('Insufficient capacity at target');
    }

    const stock = await this.prisma.epscmWmsLocationStock.findFirst({
      where: { organizationId, locationKey: fromLocationKey, itemKey, lotKey: lotKey ?? null },
    });
    if (!stock || stock.quantity < qty) throw new BadRequestException('Insufficient stock at source');

    await this.prisma.$transaction(async (tx) => {
      await tx.epscmWmsLocationStock.update({
        where: { id: stock.id },
        data: { quantity: { decrement: qty } },
      });
      const dest = await tx.epscmWmsLocationStock.findFirst({
        where: { organizationId, locationKey: toLocationKey, itemKey, lotKey: lotKey ?? null },
      });
      if (dest) {
        await tx.epscmWmsLocationStock.update({
          where: { id: dest.id },
          data: { quantity: { increment: qty } },
        });
      } else {
        const seq = await tx.epscmWmsLocationStock.count({ where: { organizationId } });
        await tx.epscmWmsLocationStock.create({
          data: {
            organizationId,
            stockKey: generateEpscmWmsKey('STK', seq + 1),
            locationKey: toLocationKey,
            itemKey,
            quantity: qty,
            lotKey,
          },
        });
      }
      await tx.epscmWmsLocation.update({
        where: { id: from.id },
        data: { occupiedQty: { decrement: qty }, status: from.occupiedQty - qty <= 0 ? 'available' : 'occupied' },
      });
      await tx.epscmWmsLocation.update({
        where: { id: to.id },
        data: { occupiedQty: { increment: qty }, status: 'occupied' },
      });
    });

    await this.audit.log(organizationId, 'EpscmWmsLocation', toLocationKey, 'wms_transferred', userId, {
      fromLocationKey, itemKey, qty, lotKey,
    });
    return this.get(organizationId, toLocationKey);
  }

  async consolidate(
    organizationId: string,
    userId: string,
    targetLocationKey: string,
    sourceLocationKeys: string[],
  ) {
    for (const src of sourceLocationKeys) {
      const stocks = await this.prisma.epscmWmsLocationStock.findMany({
        where: { organizationId, locationKey: src, quantity: { gt: 0 } },
      });
      for (const s of stocks) {
        await this.relocate(organizationId, userId, src, targetLocationKey, s.itemKey, s.quantity, s.lotKey ?? undefined);
      }
    }
    return this.get(organizationId, targetLocationKey);
  }

  occupancyReport(organizationId: string, warehouseKey?: string) {
    return this.prisma.epscmWmsLocation.findMany({
      where: { organizationId, ...(warehouseKey ? { warehouseKey } : {}) },
      select: {
        locationKey: true,
        code: true,
        warehouseKey: true,
        capacityQty: true,
        occupiedQty: true,
        status: true,
      },
    }).then((rows) =>
      rows.map((r) => ({
        ...r,
        occupancyPct: computeOccupancyPct(r.occupiedQty, r.capacityQty),
      })),
    );
  }
}
