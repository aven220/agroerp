import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { calculatePolygonAreaHa } from '@/core/ftip/application/geometry.util';
import { LotsService } from './lots.service';
import { LotTwinService } from './lot-twin.service';
import {
  CreateHarvestDto,
  CreateLotCostDto,
  CreateLotDocumentDto,
  CreateManagementZoneDto,
  CreateSensorBindingDto,
  SetLotGeometryDto,
  UpdateAgronomicStateDto,
} from '../presentation/lots.dto';

@Injectable()
export class LotRelationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lots: LotsService,
    private readonly twin: LotTwinService,
  ) {}

  async getAgronomicState(organizationId: string, fieldLotId: string) {
    await this.lots.findOne(organizationId, fieldLotId);
    return this.prisma.lotAgronomicState.findMany({
      where: { fieldLotId, organizationId },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async updateAgronomicState(
    organizationId: string,
    fieldLotId: string,
    userId: string,
    dto: UpdateAgronomicStateDto,
  ) {
    await this.lots.findOne(organizationId, fieldLotId);
    await this.prisma.lotAgronomicState.updateMany({
      where: { fieldLotId, effectiveUntil: null },
      data: { effectiveUntil: new Date() },
    });

    const state = await this.prisma.lotAgronomicState.create({
      data: {
        organizationId,
        fieldLotId,
        ftipCropStandId: dto.ftipCropStandId,
        primaryCropCode: dto.primaryCropCode,
        varietyCodes: dto.varietyCodes ?? [],
        plantingDate: dto.plantingDate ? new Date(dto.plantingDate) : undefined,
        densityPlantsHa: dto.densityPlantsHa,
        expectedYieldKgHa: dto.expectedYieldKgHa,
        phenologicalStageCode: dto.phenologicalStageCode,
        irrigationTypeCode: dto.irrigationTypeCode,
        productionSystemCode: dto.productionSystemCode,
        createdBy: userId,
      },
    });

    await this.twin.refresh(organizationId, fieldLotId);
    return state;
  }

  async getCosts(organizationId: string, fieldLotId: string) {
    await this.lots.findOne(organizationId, fieldLotId);
    return this.prisma.lotCostEntry.findMany({
      where: { fieldLotId, organizationId, deletedAt: null },
      orderBy: { costDate: 'desc' },
    });
  }

  async addCost(
    organizationId: string,
    fieldLotId: string,
    userId: string,
    dto: CreateLotCostDto,
  ) {
    await this.lots.findOne(organizationId, fieldLotId);
    const entry = await this.prisma.lotCostEntry.create({
      data: {
        organizationId,
        fieldLotId,
        campaignCode: dto.campaignCode,
        costCategoryCode: dto.costCategoryCode,
        amount: dto.amount,
        currencyCode: dto.currencyCode ?? 'COP',
        sourceType: 'manual',
        description: dto.description,
        approvalStatus: dto.amount > 5000000 ? 'pending' : 'approved',
        costDate: new Date(dto.costDate),
        createdBy: userId,
      },
    });
    await this.twin.refresh(organizationId, fieldLotId);
    return entry;
  }

  async approveCost(organizationId: string, costId: string, userId: string) {
    const cost = await this.prisma.lotCostEntry.findFirst({
      where: { id: costId, organizationId },
    });
    if (!cost) throw new UnprocessableEntityException('Costo no encontrado');
    const updated = await this.prisma.lotCostEntry.update({
      where: { id: costId },
      data: { approvalStatus: 'approved', approvedBy: userId },
    });
    await this.twin.refresh(organizationId, cost.fieldLotId);
    return updated;
  }

  async getHarvests(organizationId: string, fieldLotId: string) {
    await this.lots.findOne(organizationId, fieldLotId);
    return this.prisma.harvestRecord.findMany({
      where: { fieldLotId, organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addHarvest(
    organizationId: string,
    fieldLotId: string,
    userId: string,
    dto: CreateHarvestDto,
  ) {
    const lot = await this.lots.findOne(organizationId, fieldLotId);
    const yieldKgHa =
      dto.harvestedAreaHa && dto.estimatedKg
        ? dto.estimatedKg / dto.harvestedAreaHa
        : undefined;

    const harvest = await this.prisma.harvestRecord.create({
      data: {
        organizationId,
        fieldLotId,
        campaignCode: dto.campaignCode,
        harvestStartDate: dto.harvestStartDate ? new Date(dto.harvestStartDate) : undefined,
        harvestEndDate: dto.harvestEndDate ? new Date(dto.harvestEndDate) : undefined,
        harvestedAreaHa: dto.harvestedAreaHa,
        estimatedKg: dto.estimatedKg,
        actualKg: dto.actualKg,
        yieldKgHa,
        qualityGradeCode: dto.qualityGradeCode,
        fieldOperationId: dto.fieldOperationId,
        createdBy: userId,
      },
    });

    await this.prisma.fieldLotProfile.update({
      where: { id: fieldLotId },
      data: { lastHarvestAt: new Date() },
    });

    await this.twin.refresh(organizationId, fieldLotId);
    return harvest;
  }

  async closeHarvest(organizationId: string, harvestId: string) {
    const harvest = await this.prisma.harvestRecord.findFirst({
      where: { id: harvestId, organizationId },
    });
    if (!harvest) throw new UnprocessableEntityException('Cosecha no encontrada');
    const updated = await this.prisma.harvestRecord.update({
      where: { id: harvestId },
      data: { status: 'closed', closedAt: new Date() },
    });
    await this.twin.refresh(organizationId, harvest.fieldLotId);
    return updated;
  }

  async getDocuments(organizationId: string, fieldLotId: string) {
    await this.lots.findOne(organizationId, fieldLotId);
    return this.prisma.lotDocument.findMany({
      where: { fieldLotId, organizationId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addDocument(
    organizationId: string,
    fieldLotId: string,
    dto: CreateLotDocumentDto,
  ) {
    await this.lots.findOne(organizationId, fieldLotId);
    return this.prisma.lotDocument.create({
      data: {
        organizationId,
        fieldLotId,
        entityType: dto.entityType ?? 'lot',
        entityId: dto.entityId,
        documentTypeCode: dto.documentTypeCode,
        contentId: dto.contentId,
        title: dto.title,
        mediaType: dto.mediaType,
        gpsGeo: dto.gpsGeo as Prisma.InputJsonValue,
        capturedAt: dto.capturedAt ? new Date(dto.capturedAt) : new Date(),
      },
    });
  }

  async getZones(organizationId: string, fieldLotId: string) {
    await this.lots.findOne(organizationId, fieldLotId);
    return this.prisma.managementZoneOp.findMany({ where: { fieldLotId, organizationId } });
  }

  async addZone(
    organizationId: string,
    fieldLotId: string,
    userId: string,
    dto: CreateManagementZoneDto,
  ) {
    const lot = await this.lots.findOne(organizationId, fieldLotId);
    let areaHa = dto.areaHa;
    if (dto.applicationGeo && !areaHa) {
      areaHa = calculatePolygonAreaHa(dto.applicationGeo as Record<string, unknown>) ?? undefined;
    }
    if (areaHa && lot.totalAreaHa && areaHa > Number(lot.totalAreaHa)) {
      throw new UnprocessableEntityException('Zona excede límite del lote');
    }

    return this.prisma.managementZoneOp.create({
      data: {
        organizationId,
        fieldLotId,
        zoneCode: dto.zoneCode,
        zoneName: dto.zoneName,
        zoneType: dto.zoneType,
        applicationGeo: dto.applicationGeo as Prisma.InputJsonValue,
        areaHa,
        recommendationProfile: (dto.recommendationProfile ?? {}) as Prisma.InputJsonValue,
        createdBy: userId,
      },
    });
  }

  async getSensors(organizationId: string, fieldLotId: string) {
    await this.lots.findOne(organizationId, fieldLotId);
    return this.prisma.lotSensorBinding.findMany({ where: { fieldLotId, organizationId } });
  }

  async addSensor(
    organizationId: string,
    fieldLotId: string,
    userId: string,
    dto: CreateSensorBindingDto,
  ) {
    await this.lots.findOne(organizationId, fieldLotId);
    return this.prisma.lotSensorBinding.create({
      data: {
        organizationId,
        fieldLotId,
        sensorType: dto.sensorType,
        externalDeviceId: dto.externalDeviceId,
        locationGeo: dto.locationGeo as Prisma.InputJsonValue,
        alertThresholds: (dto.alertThresholds ?? {}) as Prisma.InputJsonValue,
        createdBy: userId,
      },
    });
  }

  async getTelemetry(organizationId: string, fieldLotId: string) {
    await this.lots.findOne(organizationId, fieldLotId);
    return this.prisma.lotTelemetryReading.findMany({
      where: { fieldLotId, organizationId },
      orderBy: { capturedAt: 'desc' },
      take: 100,
    });
  }

  async setGeometry(
    organizationId: string,
    fieldLotId: string,
    userId: string,
    dto: SetLotGeometryDto,
  ) {
    const lot = await this.lots.findOne(organizationId, fieldLotId);
    const area = calculatePolygonAreaHa(dto.applicationGeo as Record<string, unknown>);

    await this.prisma.lotGeometryRevision.create({
      data: {
        organizationId,
        fieldLotId,
        entityType: 'FieldLotProfile',
        entityId: fieldLotId,
        fromGeometry: lot.boundaryGeoRef as Prisma.InputJsonValue,
        toGeometry: dto.applicationGeo as Prisma.InputJsonValue,
        fromAreaHa: lot.totalAreaHa,
        toAreaHa: area,
        reasonCode: dto.reasonCode,
        reasonNotes: dto.reasonNotes,
        actorId: userId,
      },
    });

    return this.prisma.fieldLotProfile.update({
      where: { id: fieldLotId },
      data: {
        boundaryGeoRef: dto.applicationGeo as Prisma.InputJsonValue,
        ...(area ? { totalAreaHa: area } : {}),
        updatedBy: userId,
        version: { increment: 1 },
      },
    });
  }

  async getRecommendations(organizationId: string, fieldLotId: string) {
    await this.lots.findOne(organizationId, fieldLotId);
    return this.prisma.lotRecommendation.findMany({
      where: { fieldLotId, organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acceptRecommendation(
    organizationId: string,
    fieldLotId: string,
    recId: string,
    userId: string,
  ) {
    await this.lots.findOne(organizationId, fieldLotId);
    return this.prisma.lotRecommendation.update({
      where: { id: recId },
      data: { status: 'accepted', decidedBy: userId, decidedAt: new Date() },
    });
  }
}
