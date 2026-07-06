import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { FieldLotStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import { CreateFieldLotDto, UpdateFieldLotDto } from '../presentation/lots.dto';
import { LotTwinService } from './lot-twin.service';

export interface FieldLotListFilters {
  status?: FieldLotStatus;
  farmUnitId?: string;
  ftipLotUnitId?: string;
  producerId?: string;
  municipalityCode?: string;
  primaryCropCode?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class LotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly twin: LotTwinService,
  ) {}

  private readonly includeRelations = {
    ftipLot: { select: { id: true, lotCode: true, lotName: true, areaHa: true, boundaryGeo: true } },
    farmUnit: {
      select: {
        id: true,
        farmCode: true,
        farmName: true,
        municipalityCode: true,
        status: true,
        centroidLatitude: true,
        centroidLongitude: true,
      },
    },
    responsibleProducer: {
      select: { id: true, legalName: true, producerNumber: true },
    },
    agronomicStates: { orderBy: { effectiveFrom: 'desc' as const }, take: 1 },
    digitalTwin: true,
    operations: { where: { deletedAt: null }, orderBy: { operationDate: 'desc' as const }, take: 5 },
    documents: { where: { deletedAt: null }, take: 10 },
    lifecycleEvents: { orderBy: { occurredAt: 'desc' as const }, take: 5 },
  };

  async findAll(organizationId: string, filters: FieldLotListFilters = {}) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.FieldLotProfileWhereInput = {
      organizationId,
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.farmUnitId ? { farmUnitId: filters.farmUnitId } : {}),
      ...(filters.ftipLotUnitId ? { ftipLotUnitId: filters.ftipLotUnitId } : {}),
      ...(filters.producerId ? { responsibleProducerId: filters.producerId } : {}),
      ...(filters.primaryCropCode
        ? { agronomicStates: { some: { primaryCropCode: filters.primaryCropCode, effectiveUntil: null } } }
        : {}),
      ...(filters.municipalityCode
        ? { farmUnit: { municipalityCode: filters.municipalityCode } }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { lotName: { contains: filters.search, mode: 'insensitive' } },
              { lotCode: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.fieldLotProfile.findMany({
        where,
        orderBy: { [filters.sortBy ?? 'createdAt']: filters.sortOrder ?? 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          lotCode: true,
          lotName: true,
          status: true,
          lotTypeCode: true,
          totalAreaHa: true,
          plantedAreaHa: true,
          farmUnitId: true,
          ftipLotUnitId: true,
          centroidLatitude: true,
          centroidLongitude: true,
          lastOperationAt: true,
          version: true,
          createdAt: true,
          farmUnit: { select: { farmCode: true, farmName: true, municipalityCode: true } },
          responsibleProducer: { select: { id: true, legalName: true } },
          digitalTwin: {
            select: {
              productionYtdKg: true,
              avgYieldKgHa: true,
              qualityAvgScore: true,
              riskFlags: true,
            },
          },
        },
      }),
      this.prisma.fieldLotProfile.count({ where }),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(organizationId: string, id: string) {
    const lot = await this.prisma.fieldLotProfile.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: this.includeRelations,
    });
    if (!lot) throw new NotFoundException('Field lot not found');
    return lot;
  }

  async create(
    organizationId: string,
    userId: string,
    dto: CreateFieldLotDto,
    ctx?: RequestContext,
  ) {
    if (dto.externalId) {
      const existing = await this.prisma.fieldLotProfile.findFirst({
        where: { organizationId, externalId: dto.externalId },
      });
      if (existing) return existing;
    }

    const ftipLot = await this.prisma.farmLot.findFirst({
      where: { id: dto.ftipLotUnitId, organizationId, deletedAt: null },
      include: {
        farmUnit: true,
        cropStands: { where: { status: 'active' }, take: 1 },
      },
    });
    if (!ftipLot) throw new UnprocessableEntityException('Lote FTIP no encontrado');
    if (ftipLot.farmUnit.status !== 'active') {
      throw new UnprocessableEntityException('La finca debe estar activa');
    }

    const existingProfile = await this.prisma.fieldLotProfile.findFirst({
      where: { organizationId, ftipLotUnitId: dto.ftipLotUnitId, deletedAt: null },
    });
    if (existingProfile) {
      throw new ConflictException('Ya existe perfil FMDT para este lote FTIP');
    }

    const lotCode = dto.lotCode ?? ftipLot.lotCode;
    const totalAreaHa = dto.totalAreaHa ?? Number(ftipLot.areaHa ?? ftipLot.farmUnit.totalAreaHa ?? 0);
    const plantedAreaHa = dto.plantedAreaHa ?? totalAreaHa;

    const lot = await this.prisma.fieldLotProfile.create({
      data: {
        organizationId,
        ftipLotUnitId: dto.ftipLotUnitId,
        farmUnitId: ftipLot.farmUnitId,
        parcelId: ftipLot.parcelId,
        lotCode,
        lotName: dto.lotName ?? ftipLot.lotName ?? `Lote ${lotCode}`,
        lotTypeCode: dto.lotTypeCode ?? 'productive',
        totalAreaHa,
        cultivableAreaHa: dto.cultivableAreaHa ?? totalAreaHa,
        plantedAreaHa,
        unproductiveAreaHa: dto.unproductiveAreaHa,
        centroidLatitude: ftipLot.farmUnit.centroidLatitude,
        centroidLongitude: ftipLot.farmUnit.centroidLongitude,
        boundaryGeoRef: ftipLot.boundaryGeo as Prisma.InputJsonValue,
        altitudeM: dto.altitudeM,
        slopePct: dto.slopePct,
        soilTypeCode: dto.soilTypeCode,
        landUseCode: dto.landUseCode,
        assignedTechnicianId: dto.assignedTechnicianId,
        responsibleProducerId: dto.responsibleProducerId,
        observations: dto.observations,
        tags: dto.tags ?? [],
        externalId: dto.externalId,
        status: 'draft',
        createdBy: userId,
        updatedBy: userId,
        aiReadiness: {
          harvestForecast: 'ready',
          anomalyDetection: 'ready',
          agronomicRecommendations: 'ready',
          phytosanitaryRisk: 'ready',
          climateModels: 'ready',
          satelliteImagery: 'ready',
          droneImagery: 'ready',
          iotSensors: 'ready',
        },
      },
    });

    const cropStand = ftipLot.cropStands[0];
    if (cropStand || dto.primaryCropCode) {
      await this.prisma.lotAgronomicState.create({
        data: {
          organizationId,
          fieldLotId: lot.id,
          ftipCropStandId: cropStand?.id,
          primaryCropCode: dto.primaryCropCode ?? cropStand?.speciesCode ?? 'coffee',
          varietyCodes: dto.varietyCodes ?? cropStand?.varietyCodes ?? [],
          plantingDate: cropStand?.plantingDate,
          densityPlantsHa: cropStand?.densityPlantsHa,
          expectedYieldKgHa: cropStand?.estimatedYieldKgHa
            ? Number(cropStand.estimatedYieldKgHa)
            : dto.expectedYieldKgHa,
          phenologicalStageCode: cropStand?.phenologicalStageCode,
          productionSystemCode: dto.productionSystemCode,
          createdBy: userId,
        },
      });
    }

    await this.prisma.fieldLotLifecycleEvent.create({
      data: {
        organizationId,
        fieldLotId: lot.id,
        fromStatus: null,
        toStatus: 'draft',
        actorId: userId,
        reasonNotes: 'Alta inicial FMDT',
      },
    });

    await this.twin.refresh(organizationId, lot.id, ctx);
    await this.core.emitFieldLotRegistered(
      organizationId,
      lot.id,
      { lotCode: lot.lotCode, ftipLotUnitId: lot.ftipLotUnitId },
      { ctx: { ...ctx, userId, organizationId }, newValues: lot as unknown as Record<string, unknown> },
    );

    return lot;
  }

  async update(
    organizationId: string,
    id: string,
    userId: string,
    dto: UpdateFieldLotDto,
    ctx?: RequestContext,
  ) {
    const existing = await this.findOne(organizationId, id);
    if (dto.version !== undefined && dto.version !== existing.version) {
      throw new ConflictException('Version conflict');
    }

    const updated = await this.prisma.fieldLotProfile.update({
      where: { id },
      data: {
        ...(dto.lotName !== undefined ? { lotName: dto.lotName } : {}),
        ...(dto.lotTypeCode !== undefined ? { lotTypeCode: dto.lotTypeCode } : {}),
        ...(dto.cultivableAreaHa !== undefined ? { cultivableAreaHa: dto.cultivableAreaHa } : {}),
        ...(dto.plantedAreaHa !== undefined ? { plantedAreaHa: dto.plantedAreaHa } : {}),
        ...(dto.unproductiveAreaHa !== undefined ? { unproductiveAreaHa: dto.unproductiveAreaHa } : {}),
        ...(dto.soilTypeCode !== undefined ? { soilTypeCode: dto.soilTypeCode } : {}),
        ...(dto.landUseCode !== undefined ? { landUseCode: dto.landUseCode } : {}),
        ...(dto.assignedTechnicianId !== undefined ? { assignedTechnicianId: dto.assignedTechnicianId } : {}),
        ...(dto.responsibleProducerId !== undefined ? { responsibleProducerId: dto.responsibleProducerId } : {}),
        ...(dto.observations !== undefined ? { observations: dto.observations } : {}),
        ...(dto.metadata !== undefined ? { metadata: dto.metadata as Prisma.InputJsonValue } : {}),
        updatedBy: userId,
        version: { increment: 1 },
      },
    });

    await this.twin.refresh(organizationId, id);
    await this.core.emitFieldLotUpdated(
      organizationId,
      id,
      { lotCode: updated.lotCode },
      {
        ctx: { ...ctx, userId, organizationId },
        oldValues: existing as unknown as Record<string, unknown>,
        newValues: updated as unknown as Record<string, unknown>,
      },
    );

    return updated;
  }

  async remove(organizationId: string, id: string, userId: string, ctx?: RequestContext) {
    const existing = await this.findOne(organizationId, id);
    const archived = await this.prisma.fieldLotProfile.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'inactive',
        updatedBy: userId,
        version: { increment: 1 },
      },
    });

    await this.prisma.fieldLotLifecycleEvent.create({
      data: {
        organizationId,
        fieldLotId: id,
        fromStatus: existing.status,
        toStatus: 'inactive',
        actorId: userId,
        reasonNotes: 'Archivado',
      },
    });

    await this.core.emitFieldLotDeleted(
      organizationId,
      id,
      { lotCode: existing.lotCode },
      { ctx: { ...ctx, userId, organizationId }, oldValues: existing as unknown as Record<string, unknown> },
    );

    return archived;
  }

  async getTimeline(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    const [lifecycle, audit, events, operations, harvests, revisions] = await Promise.all([
      this.prisma.fieldLotLifecycleEvent.findMany({
        where: { fieldLotId: id },
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.auditLog.findMany({
        where: { entityType: 'FieldLotProfile', entityId: id, organizationId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.event.findMany({
        where: { aggregateType: 'FieldLotProfile', aggregateId: id, organizationId },
        orderBy: { occurredAt: 'desc' },
        take: 50,
      }),
      this.prisma.fieldOperation.findMany({
        where: { fieldLotId: id, deletedAt: null },
        orderBy: { operationDate: 'desc' },
        take: 30,
      }),
      this.prisma.harvestRecord.findMany({
        where: { fieldLotId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.lotGeometryRevision.findMany({
        where: { fieldLotId: id },
        orderBy: { occurredAt: 'desc' },
        take: 20,
      }),
    ]);

    const timeline = [
      ...lifecycle.map((e) => ({
        type: 'lifecycle',
        id: e.id,
        occurredAt: e.occurredAt.toISOString(),
        title: `Estado: ${e.fromStatus ?? '—'} → ${e.toStatus}`,
        detail: e.reasonNotes ?? undefined,
      })),
      ...operations.map((o) => ({
        type: 'operation',
        id: o.id,
        occurredAt: o.operationDate.toISOString(),
        title: `Labor: ${o.operationTypeCode}`,
        detail: o.notes ?? undefined,
      })),
      ...harvests.map((h) => ({
        type: 'harvest',
        id: h.id,
        occurredAt: (h.harvestEndDate ?? h.createdAt).toISOString(),
        title: `Cosecha ${h.campaignCode}`,
        detail: h.actualKg ? `${h.actualKg} kg` : undefined,
      })),
      ...revisions.map((r) => ({
        type: 'geometry',
        id: r.id,
        occurredAt: r.occurredAt.toISOString(),
        title: 'Revisión geometría',
        detail: r.reasonNotes ?? undefined,
      })),
      ...audit.map((a) => ({
        type: 'audit',
        id: a.id,
        occurredAt: a.createdAt.toISOString(),
        title: a.action,
        detail: a.entityType,
      })),
      ...events.map((e) => ({
        type: 'event',
        id: e.id,
        occurredAt: e.occurredAt.toISOString(),
        title: e.eventType,
        detail: undefined,
      })),
    ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    return { items: timeline };
  }

  async getDashboard(organizationId: string) {
    const [total, active, byStatus, byCrop, avgYield] = await Promise.all([
      this.prisma.fieldLotProfile.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.fieldLotProfile.count({
        where: { organizationId, deletedAt: null, status: 'active' },
      }),
      this.prisma.fieldLotProfile.groupBy({
        by: ['status'],
        where: { organizationId, deletedAt: null },
        _count: true,
      }),
      this.prisma.lotAgronomicState.groupBy({
        by: ['primaryCropCode'],
        where: { organizationId, effectiveUntil: null },
        _count: true,
      }),
      this.prisma.lotDigitalTwin.aggregate({
        where: { organizationId },
        _avg: { avgYieldKgHa: true, qualityAvgScore: true, costPerHa: true },
        _sum: { productionYtdKg: true, totalCostYtd: true },
      }),
    ]);

    const georef = await this.prisma.fieldLotProfile.count({
      where: {
        organizationId,
        deletedAt: null,
        centroidLatitude: { not: null },
      },
    });

    return {
      kpis: {
        total,
        active,
        georeferenced: georef,
        georefRatePct: total > 0 ? Math.round((georef / total) * 100) : 0,
        avgYieldKgHa: Number(avgYield._avg.avgYieldKgHa ?? 0),
        avgQualityScore: Number(avgYield._avg.qualityAvgScore ?? 0),
        totalProductionYtdKg: Number(avgYield._sum.productionYtdKg ?? 0),
        totalCostYtd: Number(avgYield._sum.totalCostYtd ?? 0),
        avgCostPerHa: Number(avgYield._avg.costPerHa ?? 0),
        activeRisks: await this.prisma.fieldLotProfile.count({
          where: {
            organizationId,
            deletedAt: null,
            digitalTwin: { riskFlags: { isEmpty: false } },
          },
        }),
      },
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
      byCrop: byCrop.map((c) => ({ cropCode: c.primaryCropCode, count: c._count })),
    };
  }

  async getMapData(organizationId: string, filters: { status?: FieldLotStatus } = {}) {
    const items = await this.prisma.fieldLotProfile.findMany({
      where: {
        organizationId,
        deletedAt: null,
        centroidLatitude: { not: null },
        ...(filters.status ? { status: filters.status } : {}),
      },
      select: {
        id: true,
        lotCode: true,
        lotName: true,
        status: true,
        totalAreaHa: true,
        centroidLatitude: true,
        centroidLongitude: true,
        farmUnit: { select: { farmName: true, municipalityCode: true } },
      },
      take: 500,
    });

    return {
      items: items.map((i) => ({
        id: i.id,
        lotCode: i.lotCode,
        lotName: i.lotName,
        status: i.status,
        latitude: Number(i.centroidLatitude),
        longitude: Number(i.centroidLongitude),
        totalAreaHa: i.totalAreaHa,
        farmName: i.farmUnit.farmName,
        municipalityCode: i.farmUnit.municipalityCode,
      })),
    };
  }

  async exportCsv(organizationId: string) {
    const lots = await this.prisma.fieldLotProfile.findMany({
      where: { organizationId, deletedAt: null },
      include: {
        farmUnit: { select: { farmCode: true, farmName: true, municipalityCode: true } },
        responsibleProducer: { select: { legalName: true } },
        agronomicStates: { where: { effectiveUntil: null }, take: 1 },
      },
      orderBy: { lotCode: 'asc' },
    });

    const header =
      'lotCode,lotName,status,farmCode,farmName,municipality,areaHa,crop,producer\n';
    const rows = lots
      .map((l) => {
        const crop = l.agronomicStates[0]?.primaryCropCode ?? '';
        const producer = l.responsibleProducer?.legalName ?? '';
        return [
          l.lotCode,
          `"${l.lotName.replace(/"/g, '""')}"`,
          l.status,
          l.farmUnit.farmCode,
          `"${l.farmUnit.farmName.replace(/"/g, '""')}"`,
          l.farmUnit.municipalityCode ?? '',
          l.totalAreaHa ?? '',
          crop,
          `"${producer.replace(/"/g, '""')}"`,
        ].join(',');
      })
      .join('\n');

    return { csv: header + rows, count: lots.length };
  }

  async getEligibleFtipLots(organizationId: string, farmUnitId?: string) {
    const linked = await this.prisma.fieldLotProfile.findMany({
      where: { organizationId, deletedAt: null },
      select: { ftipLotUnitId: true },
    });
    const linkedIds = linked.map((l) => l.ftipLotUnitId);

    return this.prisma.farmLot.findMany({
      where: {
        organizationId,
        deletedAt: null,
        id: { notIn: linkedIds },
        ...(farmUnitId ? { farmUnitId } : {}),
        farmUnit: { status: 'active', deletedAt: null },
      },
      include: {
        farmUnit: { select: { farmCode: true, farmName: true } },
        cropStands: { where: { status: 'active' }, take: 1 },
      },
      take: 200,
    });
  }
}
