import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EfmAuditService } from './efm-audit.service';
import { EfmAccountingEngineService } from './efm-accounting-engine.service';
import {
  generateAssetTag,
  generateFaKey,
  generateQrPayload,
} from '../domain/efm-fixed-assets.engine';

@Injectable()
export class EfmFaAssetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EfmAuditService,
    private readonly engine: EfmAccountingEngineService,
  ) {}

  list(organizationId: string, filters?: {
    status?: string; categoryKey?: string; assetClass?: string; locationKey?: string;
  }) {
    return this.prisma.efmFaAsset.findMany({
      where: {
        organizationId,
        ...(filters?.status ? { status: filters.status as never } : {}),
        ...(filters?.categoryKey ? { categoryKey: filters.categoryKey } : {}),
        ...(filters?.assetClass ? { assetClass: filters.assetClass as never } : {}),
        ...(filters?.locationKey ? { locationKey: filters.locationKey } : {}),
      },
      include: { category: true },
      orderBy: [{ acquisitionDate: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });
  }

  async getOne(organizationId: string, assetKey: string) {
    const asset = await this.prisma.efmFaAsset.findFirst({
      where: { organizationId, assetKey },
      include: {
        category: true,
        histories: { orderBy: { createdAt: 'desc' }, take: 50 },
        maintenances: { orderBy: { maintenanceDate: 'desc' }, take: 20 },
        depreciationLines: { orderBy: { createdAt: 'desc' }, take: 24 },
      },
    });
    if (!asset) throw new NotFoundException(`Activo ${assetKey} no encontrado`);
    return asset;
  }

  findByTag(organizationId: string, tag: string) {
    return this.prisma.efmFaAsset.findFirst({
      where: {
        organizationId,
        OR: [{ assetTag: tag }, { barcode: tag }, { qrCode: { contains: tag } }],
      },
      include: { category: true },
    });
  }

  async register(organizationId: string, userId: string, input: {
    assetKey?: string;
    name: string;
    description?: string;
    categoryKey: string;
    assetClass?: string;
    acquisitionDate: string;
    acquisitionCost: number;
    residualValue?: number;
    usefulLifeMonths?: number;
    depreciationMethod?: string;
    unitsOfProduction?: number;
    currencyKey?: string;
    supplierKey?: string;
    sourceDocumentKey?: string;
    sourceModule?: string;
    companyKey?: string;
    branchKey?: string;
    costCenterKey?: string;
    locationKey?: string;
    locationDescription?: string;
    responsibleUserId?: string;
    autoActivate?: boolean;
  }) {
    const category = await this.prisma.efmFaCategory.findFirst({
      where: { organizationId, categoryKey: input.categoryKey, isActive: true },
    });
    if (!category) throw new BadRequestException(`Categoría ${input.categoryKey} no encontrada`);

    const seq = (await this.prisma.efmFaAsset.count({ where: { organizationId } })) + 1;
    const assetKey = input.assetKey ?? generateFaKey('AST', seq);
    const assetTag = generateAssetTag(category.code, seq);
    const acquisitionCost = input.acquisitionCost;
    const residualValue = input.residualValue ?? (acquisitionCost * category.defaultResidualPercent) / 100;
    const usefulLifeMonths = input.usefulLifeMonths ?? category.defaultUsefulLifeMonths;
    const isLand = (input.assetClass ?? category.assetClass) === 'land';

    const asset = await this.prisma.efmFaAsset.create({
      data: {
        organizationId,
        assetKey,
        assetTag,
        barcode: assetTag,
        qrCode: generateQrPayload(organizationId, assetKey, assetTag),
        name: input.name,
        description: input.description,
        categoryKey: input.categoryKey,
        assetClass: (input.assetClass ?? category.assetClass) as never,
        status: 'draft',
        isIntangible: category.isIntangible,
        acquisitionDate: new Date(input.acquisitionDate),
        acquisitionCost,
        residualValue,
        usefulLifeMonths: isLand ? 0 : usefulLifeMonths,
        depreciationMethod: isLand ? 'straight_line' : ((input.depreciationMethod ?? category.defaultDepreciationMethod) as never),
        unitsOfProduction: input.unitsOfProduction,
        accumulatedDepreciation: 0,
        netBookValue: acquisitionCost,
        currencyKey: input.currencyKey ?? 'COP',
        supplierKey: input.supplierKey,
        sourceDocumentKey: input.sourceDocumentKey,
        sourceModule: input.sourceModule,
        companyKey: input.companyKey ?? 'CO-MAIN',
        branchKey: input.branchKey,
        costCenterKey: input.costCenterKey,
        locationKey: input.locationKey,
        locationDescription: input.locationDescription,
        responsibleUserId: input.responsibleUserId,
        assetAccountKey: category.assetAccountKey,
        depreciationAccountKey: category.depreciationAccountKey,
        expenseAccountKey: category.expenseAccountKey,
        createdBy: userId,
      },
    });

    await this.recordHistory(organizationId, assetKey, 'created', userId, `Alta de activo ${assetTag}`, acquisitionCost);
    await this.audit.log(organizationId, 'EfmFaAsset', assetKey, 'registered', userId, { acquisitionCost });
    await this.core.emitUserAction(organizationId, 'EfmFaAsset', assetKey, EVENT_TYPES.EFM_FA_ASSET_REGISTERED, {
      assetTag,
      acquisitionCost,
    });

    if (input.autoActivate !== false) {
      return this.activate(organizationId, assetKey, userId);
    }
    return asset;
  }

  async activate(organizationId: string, assetKey: string, userId: string) {
    const asset = await this.prisma.efmFaAsset.findFirst({ where: { organizationId, assetKey } });
    if (!asset) throw new NotFoundException(`Activo ${assetKey} no encontrado`);
    if (asset.status === 'active') return asset;

    let accountingRef = null as string | null;
    try {
      const entry = await this.engine.generateFromEvent(organizationId, EVENT_TYPES.EFM_FA_ASSET_ACTIVATED, {
        assetKey,
        amount: asset.acquisitionCost,
        assetClass: asset.assetClass,
      }, userId);
      if (entry && typeof entry === 'object' && 'entryKey' in entry) {
        accountingRef = String(entry.entryKey);
      }
    } catch {
      const entry = await this.engine.createEntry(organizationId, userId, {
        sourceModule: 'fixed_assets',
        sourceDocumentType: 'asset_acquisition',
        sourceDocumentKey: assetKey,
        description: `Alta activo fijo ${asset.assetTag}`,
        entryDate: asset.acquisitionDate.toISOString().slice(0, 10),
        lines: [
          { accountKey: asset.assetAccountKey ?? 'ACC-1520', debit: asset.acquisitionCost, credit: 0 },
          { accountKey: 'ACC-2205', debit: 0, credit: asset.acquisitionCost },
        ],
        autoPost: true,
      });
      accountingRef = entry.entryKey;
    }

    const updated = await this.prisma.efmFaAsset.update({
      where: { id: asset.id },
      data: { status: 'active', activatedAt: new Date() },
    });

    await this.recordHistory(organizationId, assetKey, 'activated', userId, 'Activación del activo', asset.acquisitionCost, accountingRef ?? undefined);
    await this.audit.log(organizationId, 'EfmFaAsset', assetKey, 'activated', userId, { accountingRef });
    await this.core.emitUserAction(organizationId, 'EfmFaAsset', assetKey, EVENT_TYPES.EFM_FA_ASSET_ACTIVATED, { accountingRef });
    return updated;
  }

  async updateLocation(organizationId: string, assetKey: string, userId: string, input: {
    locationKey?: string;
    locationDescription?: string;
    branchKey?: string;
    responsibleUserId?: string;
  }) {
    const asset = await this.prisma.efmFaAsset.findFirst({ where: { organizationId, assetKey } });
    if (!asset) throw new NotFoundException(`Activo ${assetKey} no encontrado`);

    const updated = await this.prisma.efmFaAsset.update({
      where: { id: asset.id },
      data: {
        locationKey: input.locationKey ?? asset.locationKey,
        locationDescription: input.locationDescription ?? asset.locationDescription,
        branchKey: input.branchKey ?? asset.branchKey,
        responsibleUserId: input.responsibleUserId ?? asset.responsibleUserId,
      },
    });

    await this.recordHistory(organizationId, assetKey, 'location_updated', userId, 'Actualización de ubicación');
    await this.audit.log(organizationId, 'EfmFaAsset', assetKey, 'location_updated', userId, input as never);
    return updated;
  }

  async addPhoto(organizationId: string, assetKey: string, userId: string, input: {
    fileKey?: string;
    caption?: string;
  }) {
    const asset = await this.prisma.efmFaAsset.findFirst({ where: { organizationId, assetKey } });
    if (!asset) throw new NotFoundException(`Activo ${assetKey} no encontrado`);

    const seq = (await this.prisma.efmFaAssetPhoto.count({ where: { organizationId } })) + 1;
    return this.prisma.efmFaAssetPhoto.create({
      data: {
        organizationId,
        photoKey: generateFaKey('PHT', seq),
        assetKey,
        fileKey: input.fileKey,
        caption: input.caption,
        takenBy: userId,
      },
    });
  }

  async reportIncident(organizationId: string, assetKey: string, userId: string, input: {
    incidentType: string;
    severity?: string;
    description: string;
  }) {
    const asset = await this.prisma.efmFaAsset.findFirst({ where: { organizationId, assetKey } });
    if (!asset) throw new NotFoundException(`Activo ${assetKey} no encontrado`);

    const seq = (await this.prisma.efmFaAssetIncident.count({ where: { organizationId } })) + 1;
    const incident = await this.prisma.efmFaAssetIncident.create({
      data: {
        organizationId,
        incidentKey: generateFaKey('INC', seq),
        assetKey,
        incidentType: input.incidentType,
        severity: input.severity ?? 'medium',
        description: input.description,
        reportedBy: userId,
      },
    });

    await this.recordHistory(organizationId, assetKey, 'incident', userId, input.description);
    await this.audit.log(organizationId, 'EfmFaAssetIncident', incident.incidentKey, 'reported', userId);
    return incident;
  }

  getHistory(organizationId: string, assetKey: string) {
    return this.prisma.efmFaAssetHistory.findMany({
      where: { organizationId, assetKey },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async recordHistory(
    organizationId: string,
    assetKey: string,
    eventType: string,
    userId: string,
    description: string,
    amount?: number,
    documentKey?: string,
  ) {
    const seq = (await this.prisma.efmFaAssetHistory.count({ where: { organizationId } })) + 1;
    await this.prisma.efmFaAssetHistory.create({
      data: {
        organizationId,
        historyKey: generateFaKey('HIS', seq),
        assetKey,
        eventType: eventType as never,
        documentKey,
        description,
        amount,
        userId,
      },
    });
  }
}
