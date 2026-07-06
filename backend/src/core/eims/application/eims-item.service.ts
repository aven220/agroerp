import { Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EimsAuditService } from './eims-audit.service';
import { EimsParameterService } from './eims-parameter.service';
import { generateItemCodes } from '../domain/eims.catalogs';

@Injectable()
export class EimsItemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EimsAuditService,
    private readonly parameters: EimsParameterService,
  ) {}

  list(organizationId: string, filters?: { itemTypeKey?: string; categoryKey?: string; q?: string }) {
    return this.prisma.eimsItem.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(filters?.itemTypeKey ? { itemTypeKey: filters.itemTypeKey } : {}),
        ...(filters?.categoryKey ? { categoryKey: filters.categoryKey } : {}),
        ...(filters?.q
          ? {
              OR: [
                { name: { contains: filters.q, mode: 'insensitive' } },
                { itemKey: { contains: filters.q, mode: 'insensitive' } },
                { barcode: { contains: filters.q, mode: 'insensitive' } },
                { internalCode: { contains: filters.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { photos: true, defaultLocation: true },
      orderBy: { name: 'asc' },
      take: 300,
    });
  }

  async findOne(organizationId: string, itemKey: string) {
    const row = await this.prisma.eimsItem.findFirst({
      where: { organizationId, itemKey },
      include: { photos: true, defaultLocation: { include: { warehouse: true } } },
    });
    if (!row) throw new NotFoundException(`Artículo ${itemKey} no encontrado`);
    return row;
  }

  async findByCode(organizationId: string, code: string) {
    const row = await this.prisma.eimsItem.findFirst({
      where: {
        organizationId,
        OR: [{ qrCode: code }, { barcode: code }, { itemKey: code }, { internalCode: code }],
      },
      include: { photos: true, defaultLocation: true },
    });
    if (!row) throw new NotFoundException(`Artículo no encontrado para ${code}`);
    return row;
  }

  async upsert(
    organizationId: string,
    userId: string,
    input: {
      itemKey: string;
      internalCode?: string;
      name: string;
      description?: string;
      itemTypeKey: string;
      categoryKey?: string;
      subcategoryKey?: string;
      brandKey?: string;
      presentationKey?: string;
      uomKey: string;
      statusKey?: string;
      weight?: number;
      volume?: number;
      length?: number;
      width?: number;
      height?: number;
      shelfLifeDays?: number;
      trackLot?: boolean;
      trackSerial?: boolean;
      trackExpiry?: boolean;
      allowNegative?: boolean;
      defaultLocationKey?: string;
      valuationMethod?: string;
      minStock?: number;
      maxStock?: number;
      metadata?: Record<string, unknown>;
      isActive?: boolean;
    },
  ) {
    const defaults = await this.loadControlDefaults(organizationId);
    const codes = generateItemCodes(input.itemKey);
    let defaultLocationId: string | undefined;
    if (input.defaultLocationKey) {
      const loc = await this.prisma.eimsLocation.findFirst({
        where: { organizationId, locationKey: input.defaultLocationKey },
      });
      defaultLocationId = loc?.id;
    }

    const row = await this.prisma.eimsItem.upsert({
      where: { organizationId_itemKey: { organizationId, itemKey: input.itemKey } },
      update: {
        internalCode: input.internalCode,
        name: input.name,
        description: input.description,
        itemTypeKey: input.itemTypeKey,
        categoryKey: input.categoryKey,
        subcategoryKey: input.subcategoryKey,
        brandKey: input.brandKey,
        presentationKey: input.presentationKey,
        uomKey: input.uomKey,
        statusKey: input.statusKey ?? 'active',
        weight: input.weight,
        volume: input.volume,
        length: input.length,
        width: input.width,
        height: input.height,
        shelfLifeDays: input.shelfLifeDays,
        trackLot: input.trackLot ?? defaults.trackLot,
        trackSerial: input.trackSerial ?? defaults.trackSerial,
        trackExpiry: input.trackExpiry ?? defaults.trackExpiry,
        allowNegative: input.allowNegative ?? defaults.allowNegative,
        defaultLocationId,
        valuationMethod: input.valuationMethod ?? defaults.valuationMethod,
        minStock: input.minStock,
        maxStock: input.maxStock,
        metadata: (input.metadata ?? {}) as object,
        isActive: input.isActive ?? true,
        qrCode: codes.qrCode,
        barcode: codes.barcode,
        updatedBy: userId,
      },
      create: {
        organizationId,
        itemKey: input.itemKey,
        internalCode: input.internalCode,
        name: input.name,
        description: input.description,
        itemTypeKey: input.itemTypeKey,
        categoryKey: input.categoryKey,
        subcategoryKey: input.subcategoryKey,
        brandKey: input.brandKey,
        presentationKey: input.presentationKey,
        uomKey: input.uomKey,
        statusKey: input.statusKey ?? 'active',
        weight: input.weight,
        volume: input.volume,
        length: input.length,
        width: input.width,
        height: input.height,
        shelfLifeDays: input.shelfLifeDays,
        trackLot: input.trackLot ?? defaults.trackLot,
        trackSerial: input.trackSerial ?? defaults.trackSerial,
        trackExpiry: input.trackExpiry ?? defaults.trackExpiry,
        allowNegative: input.allowNegative ?? defaults.allowNegative,
        defaultLocationId,
        valuationMethod: input.valuationMethod ?? defaults.valuationMethod,
        minStock: input.minStock,
        maxStock: input.maxStock,
        metadata: (input.metadata ?? {}) as object,
        qrCode: codes.qrCode,
        barcode: codes.barcode,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    await this.audit.log(organizationId, 'Item', input.itemKey, 'upsert', userId, {
      itemTypeKey: input.itemTypeKey,
      trackLot: row.trackLot,
      valuationMethod: row.valuationMethod,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsItem',
      row.id,
      EVENT_TYPES.EIMS_ITEM_UPDATED,
      { itemKey: input.itemKey },
    );
    return row;
  }

  async addPhoto(
    organizationId: string,
    userId: string,
    itemKey: string,
    input: { photoKey: string; storageUrl?: string; caption?: string; isPrimary?: boolean },
  ) {
    const item = await this.findOne(organizationId, itemKey);
    if (input.isPrimary) {
      await this.prisma.eimsItemPhoto.updateMany({
        where: { itemId: item.id },
        data: { isPrimary: false },
      });
    }
    const photo = await this.prisma.eimsItemPhoto.upsert({
      where: { itemId_photoKey: { itemId: item.id, photoKey: input.photoKey } },
      update: {
        storageUrl: input.storageUrl,
        caption: input.caption,
        isPrimary: input.isPrimary ?? false,
      },
      create: {
        organizationId,
        itemId: item.id,
        photoKey: input.photoKey,
        storageUrl: input.storageUrl,
        caption: input.caption,
        isPrimary: input.isPrimary ?? false,
      },
    });
    await this.audit.log(organizationId, 'Item', itemKey, 'photo_added', userId, input);
    return photo;
  }

  private async loadControlDefaults(organizationId: string) {
    const [lot, serial, expiry, negative, valuation] = await Promise.all([
      this.parameters.resolve(organizationId, 'lot_control_default'),
      this.parameters.resolve(organizationId, 'serial_control_default'),
      this.parameters.resolve(organizationId, 'expiry_control_default'),
      this.parameters.resolve(organizationId, 'allow_negative_stock'),
      this.parameters.resolve(organizationId, 'valuation_method'),
    ]);
    return {
      trackLot: Boolean((lot?.value as { enabled?: boolean })?.enabled ?? true),
      trackSerial: Boolean((serial?.value as { enabled?: boolean })?.enabled ?? false),
      trackExpiry: Boolean((expiry?.value as { enabled?: boolean })?.enabled ?? false),
      allowNegative: Boolean((negative?.value as { enabled?: boolean })?.enabled ?? false),
      valuationMethod: String((valuation?.value as { method?: string })?.method ?? 'average'),
    };
  }
}
