import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import { FarmsService } from './farms.service';
import { FarmTwinService } from './farm-twin.service';
import {
  CreateCropStandDto,
  CreateInfrastructureDto,
  CreateLotDto,
  CreateNaturalResourceDto,
  CreateParcelDto,
  CreateRiskDto,
  CreateTerritoryDocumentDto,
  LinkProducerDto,
} from '../presentation/farms.dto';

@Injectable()
export class FarmRelationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly farms: FarmsService,
    private readonly twin: FarmTwinService,
  ) {}

  async linkProducer(
    organizationId: string,
    farmUnitId: string,
    userId: string,
    dto: LinkProducerDto,
    ctx?: RequestContext,
  ) {
    await this.farms.findOne(organizationId, farmUnitId);
    const link = await this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.producerTerritoryLink.updateMany({
          where: { farmUnitId, organizationId, isPrimary: true },
          data: { isPrimary: false },
        });
      }
      const existing = await tx.producerTerritoryLink.findUnique({
        where: { farmUnitId_producerId: { farmUnitId, producerId: dto.producerId } },
      });
      if (existing && !existing.unlinkedAt) {
        throw new ConflictException('Producer already linked');
      }
      return existing
        ? tx.producerTerritoryLink.update({
            where: { id: existing.id },
            data: {
              unlinkedAt: null,
              relationshipType: dto.relationshipType ?? 'owner',
              isPrimary: dto.isPrimary ?? false,
              linkedAt: new Date(),
            },
          })
        : tx.producerTerritoryLink.create({
            data: {
              organizationId,
              farmUnitId,
              producerId: dto.producerId,
              relationshipType: dto.relationshipType ?? 'owner',
              isPrimary: dto.isPrimary ?? false,
              createdBy: userId,
            },
          });
    });
    await this.twin.refresh(organizationId, farmUnitId, ctx);
    return link;
  }

  async unlinkProducer(
    organizationId: string,
    farmUnitId: string,
    linkId: string,
    ctx?: RequestContext,
  ) {
    const link = await this.prisma.producerTerritoryLink.findFirst({
      where: { id: linkId, farmUnitId, organizationId, unlinkedAt: null },
    });
    if (!link) throw new NotFoundException('Link not found');
    const updated = await this.prisma.producerTerritoryLink.update({
      where: { id: linkId },
      data: { unlinkedAt: new Date() },
    });
    await this.twin.refresh(organizationId, farmUnitId, ctx);
    return updated;
  }

  async addParcel(organizationId: string, farmUnitId: string, userId: string, dto: CreateParcelDto) {
    await this.farms.findOne(organizationId, farmUnitId);
    return this.prisma.farmParcel.create({
      data: {
        organizationId,
        farmUnitId,
        parcelCode: dto.parcelCode,
        parcelName: dto.parcelName,
        boundaryGeo: dto.boundaryGeo as Prisma.InputJsonValue,
        areaHa: dto.areaHa,
        createdBy: userId,
      },
    });
  }

  async getParcels(organizationId: string, farmUnitId: string) {
    await this.farms.findOne(organizationId, farmUnitId);
    return this.prisma.farmParcel.findMany({
      where: { farmUnitId, organizationId, deletedAt: null },
    });
  }

  async addLot(organizationId: string, farmUnitId: string, userId: string, dto: CreateLotDto) {
    await this.farms.findOne(organizationId, farmUnitId);
    return this.prisma.farmLot.create({
      data: {
        organizationId,
        farmUnitId,
        parcelId: dto.parcelId,
        lotCode: dto.lotCode,
        lotName: dto.lotName,
        boundaryGeo: dto.boundaryGeo as Prisma.InputJsonValue,
        areaHa: dto.areaHa,
        createdBy: userId,
      },
    });
  }

  async getLots(organizationId: string, farmUnitId: string) {
    await this.farms.findOne(organizationId, farmUnitId);
    return this.prisma.farmLot.findMany({
      where: { farmUnitId, organizationId, deletedAt: null },
      include: { cropStands: true },
    });
  }

  async updateLot(
    organizationId: string,
    lotId: string,
    userId: string,
    dto: Partial<CreateLotDto>,
  ) {
    const lot = await this.prisma.farmLot.findFirst({
      where: { id: lotId, organizationId, deletedAt: null },
    });
    if (!lot) throw new NotFoundException('Lot not found');
    return this.prisma.farmLot.update({
      where: { id: lotId },
      data: {
        ...(dto.lotName !== undefined ? { lotName: dto.lotName } : {}),
        ...(dto.boundaryGeo !== undefined ? { boundaryGeo: dto.boundaryGeo as Prisma.InputJsonValue } : {}),
        ...(dto.areaHa !== undefined ? { areaHa: dto.areaHa } : {}),
        version: { increment: 1 },
      },
    });
  }

  async addCropStand(
    organizationId: string,
    farmUnitId: string,
    userId: string,
    dto: CreateCropStandDto,
  ) {
    await this.farms.findOne(organizationId, farmUnitId);
    return this.prisma.cropStand.create({
      data: {
        organizationId,
        farmUnitId,
        lotUnitId: dto.lotUnitId,
        speciesCode: dto.speciesCode,
        varietyCodes: dto.varietyCodes ?? [],
        plantingDate: dto.plantingDate ? new Date(dto.plantingDate) : undefined,
        densityPlantsHa: dto.densityPlantsHa,
        estimatedYieldKgHa: dto.estimatedYieldKgHa,
        createdBy: userId,
      },
    });
  }

  async addDocument(
    organizationId: string,
    farmUnitId: string,
    userId: string,
    dto: CreateTerritoryDocumentDto,
  ) {
    await this.farms.findOne(organizationId, farmUnitId);
    return this.prisma.territoryDocument.create({
      data: {
        organizationId,
        farmUnitId,
        entityType: 'farm_unit',
        entityId: farmUnitId,
        documentTypeCode: dto.documentTypeCode,
        contentId: dto.contentId,
        title: dto.title,
        description: dto.description,
        mediaType: dto.mediaType,
        gpsGeo: dto.gpsGeo as Prisma.InputJsonValue,
        capturedBy: userId,
        capturedAt: new Date(),
      },
    });
  }

  async getDocuments(organizationId: string, farmUnitId: string) {
    await this.farms.findOne(organizationId, farmUnitId);
    return this.prisma.territoryDocument.findMany({
      where: { farmUnitId, organizationId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addNaturalResource(
    organizationId: string,
    farmUnitId: string,
    userId: string,
    dto: CreateNaturalResourceDto,
  ) {
    await this.farms.findOne(organizationId, farmUnitId);
    return this.prisma.naturalResourceFeature.create({
      data: {
        organizationId,
        farmUnitId,
        resourceType: dto.resourceType,
        name: dto.name,
        geometryGeo: dto.geometryGeo as Prisma.InputJsonValue,
        createdBy: userId,
      },
    });
  }

  async getNaturalResources(organizationId: string, farmUnitId: string) {
    await this.farms.findOne(organizationId, farmUnitId);
    return this.prisma.naturalResourceFeature.findMany({ where: { farmUnitId, organizationId } });
  }

  async addInfrastructure(
    organizationId: string,
    farmUnitId: string,
    userId: string,
    dto: CreateInfrastructureDto,
  ) {
    await this.farms.findOne(organizationId, farmUnitId);
    return this.prisma.infrastructureFeature.create({
      data: {
        organizationId,
        farmUnitId,
        infraType: dto.infraType,
        name: dto.name,
        geometryGeo: dto.geometryGeo as Prisma.InputJsonValue,
        capacityKgDay: dto.capacityKgDay,
        createdBy: userId,
      },
    });
  }

  async getInfrastructure(organizationId: string, farmUnitId: string) {
    await this.farms.findOne(organizationId, farmUnitId);
    return this.prisma.infrastructureFeature.findMany({ where: { farmUnitId, organizationId } });
  }

  async addRisk(
    organizationId: string,
    farmUnitId: string,
    userId: string,
    dto: CreateRiskDto,
  ) {
    await this.farms.findOne(organizationId, farmUnitId);
    const risk = await this.prisma.territoryRiskAssessment.create({
      data: {
        organizationId,
        farmUnitId,
        riskTypeCode: dto.riskTypeCode,
        riskLevel: dto.riskLevel,
        score: dto.score ?? 0,
        geometryGeo: dto.geometryGeo as Prisma.InputJsonValue,
        notes: dto.notes,
        assessedBy: userId,
      },
    });
    await this.twin.refresh(organizationId, farmUnitId);
    return risk;
  }

  async getRisks(organizationId: string, farmUnitId: string) {
    await this.farms.findOne(organizationId, farmUnitId);
    return this.prisma.territoryRiskAssessment.findMany({
      where: { farmUnitId, organizationId },
      orderBy: { assessedAt: 'desc' },
    });
  }
}
