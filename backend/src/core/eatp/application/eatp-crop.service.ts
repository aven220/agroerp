import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { EatpPrismaService } from '@/shared/infrastructure/database/eatp-prisma.service';
import { EatpAuditService } from './eatp-audit.service';
import { generateEatpKey } from '../domain/eatp.engine';

@Injectable()
export class EatpCropService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eatpPrisma: EatpPrismaService,
    private readonly audit: EatpAuditService,
  ) {}

  listStands(organizationId: string, farmUnitId?: string) {
    return this.prisma.cropStand.findMany({
      where: {
        organizationId,
        status: 'active',
        ...(farmUnitId ? { farmUnitId } : {}),
      },
      include: { lot: { select: { lotCode: true, lotName: true } } },
      orderBy: { plantingDate: 'desc' },
      take: 200,
    });
  }

  listAgronomic(organizationId: string, fieldLotId?: string) {
    return this.prisma.lotAgronomicState.findMany({
      where: {
        organizationId,
        ...(fieldLotId ? { fieldLotId } : {}),
        effectiveUntil: null,
      },
      orderBy: { effectiveFrom: 'desc' },
      take: 200,
    });
  }

  listRegistry(organizationId: string) {
    return this.eatpPrisma.eatpCropRegistry.findMany({
      where: { organizationId, status: 'active' },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async upsertRegistry(
    organizationId: string,
    userId: string,
    registryKey: string,
    data: {
      fieldLotId?: string;
      ftipCropStandId?: string;
      cropCode: string;
      varietyCode?: string;
      speciesCode?: string;
      seedLotRef?: string;
      plantingDate?: Date;
      harvestEstDate?: Date;
      phenoStage?: string;
      densityPlantsHa?: number;
      plantingPattern?: string;
    },
  ) {
    const row = await this.eatpPrisma.eatpCropRegistry.upsert({
      where: { organizationId_registryKey: { organizationId, registryKey } },
      create: { organizationId, registryKey, ...data },
      update: data,
    });
    await this.audit.log(organizationId, 'CropRegistry', registryKey, 'crop_updated', userId);
    return row;
  }

  async syncFromFtip(organizationId: string, userId: string) {
    const stands = await this.listStands(organizationId);
    let synced = 0;
    for (const stand of stands) {
      const key = generateEatpKey('CRP', synced + 1);
      await this.upsertRegistry(organizationId, userId, key, {
        ftipCropStandId: stand.id,
        cropCode: stand.speciesCode,
        varietyCode: stand.varietyCodes?.[0],
        speciesCode: stand.speciesCode,
        plantingDate: stand.plantingDate ?? undefined,
        phenoStage: stand.phenologicalStageCode ?? undefined,
        densityPlantsHa: stand.densityPlantsHa ?? undefined,
      });
      synced++;
    }
    return { synced };
  }
}
