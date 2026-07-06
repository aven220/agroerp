import { Injectable } from '@nestjs/common';
import { EamAssetType } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEamKey } from '../domain/eam-asset.engine';
import { EamAssetService } from './eam-asset.service';
import { EamCatalogService, EamLocationService } from './eam-catalog.service';
import { EamIndicatorsService } from './eam-indicators.service';
import { EamIntegrationService } from './eam-integration.service';

type OfflineOp = {
  type: 'location_update' | 'photo' | 'scan' | 'status';
  payload: Record<string, unknown>;
};

@Injectable()
export class EamOfflineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly asset: EamAssetService,
    private readonly integration: EamIntegrationService,
  ) {}

  async queueBatch(organizationId: string, userId: string, deviceId: string, operations: OfflineOp[]) {
    const seq = await this.prisma.eamOfflineBatch.count({ where: { organizationId } });
    return this.prisma.eamOfflineBatch.create({
      data: {
        organizationId,
        batchKey: generateEamKey('OFF', seq + 1),
        deviceId,
        createdBy: userId,
        payload: operations as object,
        status: 'pending',
      },
    });
  }

  async syncBatch(organizationId: string, userId: string, batchKey: string) {
    const batch = await this.prisma.eamOfflineBatch.findFirst({ where: { organizationId, batchKey } });
    if (!batch) return null;
    const ops = (batch.payload as OfflineOp[]) ?? [];
    try {
      for (const op of ops) await this.applyOp(organizationId, userId, op);
      const updated = await this.prisma.eamOfflineBatch.update({
        where: { id: batch.id },
        data: { status: 'synced', syncedAt: new Date() },
      });
      await this.integration.onOfflineSynced(organizationId, batchKey);
      return updated;
    } catch (e) {
      await this.prisma.eamOfflineBatch.update({
        where: { id: batch.id },
        data: { status: 'failed', errorMessage: e instanceof Error ? e.message : 'sync failed' },
      });
      throw e;
    }
  }

  private async applyOp(organizationId: string, userId: string, op: OfflineOp) {
    const p = op.payload;
    switch (op.type) {
      case 'location_update':
        return this.asset.transfer(organizationId, userId, String(p.assetKey), String(p.toLocationKey), 'relocation');
      case 'photo':
        return this.asset.uploadDocument(organizationId, userId, String(p.assetKey), 'photo', String(p.title ?? 'Foto'), String(p.storageUrl));
      case 'scan':
        return this.asset.scanCode(organizationId, userId, String(p.code), p.scanType === 'barcode' ? 'barcode' : 'qr');
      case 'status':
        return this.asset.transitionStatus(organizationId, userId, String(p.assetKey), p.toStatus as never, p.eventType as never, p.notes ? String(p.notes) : undefined);
      default:
        return null;
    }
  }

  mobileSync(organizationId: string) {
    return Promise.all([
      this.asset.list(organizationId, { status: 'operational' }),
      this.prisma.eamLocation.findMany({ where: { organizationId, isActive: true } }),
    ]).then(([assets, locations]) => ({ assets, locations }));
  }
}

@Injectable()
export class EamEngineService {
  constructor(
    private readonly catalog: EamCatalogService,
    private readonly locations: EamLocationService,
    private readonly asset: EamAssetService,
    private readonly indicators: EamIndicatorsService,
    private readonly offline: EamOfflineService,
    private readonly prisma: PrismaService,
  ) {}

  async center(organizationId: string) {
    const [families, locations, assetCount, indicators] = await Promise.all([
      this.catalog.listFamilies(organizationId),
      this.locations.list(organizationId),
      this.prisma.eamAsset.count({ where: { organizationId } }),
      this.indicators.dashboard(organizationId),
    ]);
    return { families, locations, assetCount, indicators };
  }

  async bootstrap(organizationId: string, userId: string) {
    await this.catalog.seedCatalog(organizationId, userId);
    await this.locations.seedLocations(organizationId, userId);
    const locs = await this.locations.list(organizationId);
    const plantLoc = locs.find((l) => l.locationType === 'plant');

    const families = await this.catalog.listFamilies(organizationId);
    const industrial = families.flatMap((f) => f.subfamilies).find((s) => s.code === 'IND');
    const existing = await this.prisma.eamAsset.count({ where: { organizationId } });
    if (existing === 0) {
      await this.asset.create(organizationId, userId, {
        name: 'Tractor Principal',
        assetType: EamAssetType.industrial,
        familyKey: industrial?.familyKey,
        subfamilyKey: industrial?.subfamilyKey,
        locationKey: plantLoc?.locationKey,
        brand: 'AGRO',
        model: 'T-500',
        acquisitionCost: 250000000,
        usefulLifeMonths: 120,
      });
      await this.asset.create(organizationId, userId, {
        name: 'Servidor ERP',
        assetType: EamAssetType.technology,
        locationKey: locs.find((l) => l.locationType === 'office')?.locationKey,
        brand: 'DELL',
        acquisitionCost: 15000000,
        usefulLifeMonths: 48,
      });
    }

    await this.indicators.compute(organizationId);
    return this.center(organizationId);
  }
}
