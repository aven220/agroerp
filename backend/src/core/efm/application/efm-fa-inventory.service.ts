import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EfmAuditService } from './efm-audit.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EVENT_TYPES } from '@agroerp/shared';
import { generateFaKey, reconcilePhysicalCount } from '../domain/efm-fixed-assets.engine';

@Injectable()
export class EfmFaInventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EfmAuditService,
    private readonly core: CoreEngineService,
  ) {}

  list(organizationId: string) {
    return this.prisma.efmFaPhysicalInventory.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  getOne(organizationId: string, inventoryKey: string) {
    return this.prisma.efmFaPhysicalInventory.findFirst({
      where: { organizationId, inventoryKey },
      include: { lines: { include: { asset: true } } },
    });
  }

  async create(organizationId: string, userId: string, input: {
    name: string;
    scheduledDate: string;
    locationKey?: string;
    branchKey?: string;
    categoryKey?: string;
  }) {
    const assets = await this.prisma.efmFaAsset.findMany({
      where: {
        organizationId,
        status: { in: ['active', 'maintenance', 'transferred'] },
        ...(input.locationKey ? { locationKey: input.locationKey } : {}),
        ...(input.branchKey ? { branchKey: input.branchKey } : {}),
        ...(input.categoryKey ? { categoryKey: input.categoryKey } : {}),
      },
    });

    if (!assets.length) throw new BadRequestException('No hay activos para inventariar');

    const invSeq = (await this.prisma.efmFaPhysicalInventory.count({ where: { organizationId } })) + 1;
    const inventoryKey = generateFaKey('INV', invSeq);

    const inventory = await this.prisma.efmFaPhysicalInventory.create({
      data: {
        organizationId,
        inventoryKey,
        name: input.name,
        scheduledDate: new Date(input.scheduledDate),
        locationKey: input.locationKey,
        branchKey: input.branchKey,
        totalAssets: assets.length,
        status: 'draft',
        createdBy: userId,
      },
    });

    let lineSeq = (await this.prisma.efmFaPhysicalInventoryLine.count({ where: { organizationId } })) + 1;
    for (const asset of assets) {
      await this.prisma.efmFaPhysicalInventoryLine.create({
        data: {
          organizationId,
          lineKey: generateFaKey('IVL', lineSeq++),
          inventoryKey,
          assetKey: asset.assetKey,
          expectedLocation: asset.locationDescription ?? asset.locationKey,
          status: 'pending',
        },
      });
    }

    await this.audit.log(organizationId, 'EfmFaPhysicalInventory', inventoryKey, 'created', userId, {
      totalAssets: assets.length,
    });
    return this.getOne(organizationId, inventoryKey);
  }

  async start(organizationId: string, inventoryKey: string, userId: string) {
    const inv = await this.prisma.efmFaPhysicalInventory.findFirst({ where: { organizationId, inventoryKey } });
    if (!inv) throw new NotFoundException(`Inventario ${inventoryKey} no encontrado`);

    return this.prisma.efmFaPhysicalInventory.update({
      where: { id: inv.id },
      data: { status: 'in_progress', startedAt: new Date() },
    });
  }

  async scanLine(organizationId: string, inventoryKey: string, userId: string, input: {
    assetKey?: string;
    assetTag?: string;
    actualLocation?: string;
    locationKey?: string;
    observations?: string;
  }) {
    let assetKey = input.assetKey;
    if (!assetKey && input.assetTag) {
      const asset = await this.prisma.efmFaAsset.findFirst({
        where: {
          organizationId,
          OR: [{ assetTag: input.assetTag }, { barcode: input.assetTag }, { qrCode: { contains: input.assetTag } }],
        },
      });
      if (!asset) throw new NotFoundException(`Activo con etiqueta ${input.assetTag} no encontrado`);
      assetKey = asset.assetKey;
    }
    if (!assetKey) throw new BadRequestException('assetKey o assetTag requerido');

    const line = await this.prisma.efmFaPhysicalInventoryLine.findFirst({
      where: { organizationId, inventoryKey, assetKey },
      include: { asset: true },
    });
    if (!line) throw new NotFoundException(`Activo no incluido en inventario ${inventoryKey}`);

    const status = reconcilePhysicalCount(
      { locationKey: line.asset.locationKey, responsibleUserId: line.asset.responsibleUserId },
      { locationKey: input.locationKey, responsibleUserId: userId },
    );

    const updated = await this.prisma.efmFaPhysicalInventoryLine.update({
      where: { id: line.id },
      data: {
        status: status === 'found' ? 'found' : 'mismatch',
        actualLocation: input.actualLocation ?? input.locationKey,
        confirmedBy: userId,
        confirmedAt: new Date(),
        observations: input.observations,
      },
    });

    if (input.locationKey) {
      await this.prisma.efmFaAsset.update({
        where: { organizationId_assetKey: { organizationId, assetKey } },
        data: { locationKey: input.locationKey, locationDescription: input.actualLocation },
      });
    }

    return updated;
  }

  async complete(organizationId: string, inventoryKey: string, userId: string) {
    const inv = await this.prisma.efmFaPhysicalInventory.findFirst({
      where: { organizationId, inventoryKey },
      include: { lines: true },
    });
    if (!inv) throw new NotFoundException(`Inventario ${inventoryKey} no encontrado`);

    const foundCount = inv.lines.filter((l) => l.status === 'found' || l.status === 'confirmed').length;
    const notFoundCount = inv.lines.filter((l) => l.status === 'pending' || l.status === 'not_found').length;
    const mismatchCount = inv.lines.filter((l) => l.status === 'mismatch').length;

    const updated = await this.prisma.efmFaPhysicalInventory.update({
      where: { id: inv.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        foundCount,
        notFoundCount,
        mismatchCount,
      },
      include: { lines: true },
    });

    await this.audit.log(organizationId, 'EfmFaPhysicalInventory', inventoryKey, 'completed', userId, {
      foundCount,
      notFoundCount,
      mismatchCount,
    });
    await this.core.emitUserAction(organizationId, 'EfmFaPhysicalInventory', inventoryKey, EVENT_TYPES.EFM_FA_PHYSICAL_INVENTORY_COMPLETED, {
      foundCount,
      mismatchCount,
    });
    return updated;
  }
}
