import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FarmUnitStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import { calculatePolygonAreaHa, centroidFromPolygon } from './geometry.util';
import { CreateFarmDto, UpdateFarmDto } from '../presentation/farms.dto';
import { FarmTwinService } from './farm-twin.service';

export interface FarmListFilters {
  status?: FarmUnitStatus;
  municipalityCode?: string;
  veredaCode?: string;
  producerId?: string;
  farmTypeCode?: string;
  hasValidPolygon?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class FarmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly twin: FarmTwinService,
  ) {}

  private readonly includeRelations = {
    producerLinks: {
      where: { unlinkedAt: null },
      include: { producer: { select: { id: true, legalName: true, producerNumber: true } } },
    },
    lots: {
      where: { deletedAt: null },
      include: {
        cropStands: true,
        fieldLotProfile: { select: { id: true } },
      },
    },
    parcels: { where: { deletedAt: null } },
    certifications: true,
    documents: { where: { deletedAt: null } },
    digitalTwin: true,
    lifecycleEvents: { orderBy: { occurredAt: 'desc' as const }, take: 5 },
  };

  async findAll(organizationId: string, filters: FarmListFilters = {}) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 25, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.FarmUnitWhereInput = {
      organizationId,
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.municipalityCode ? { municipalityCode: filters.municipalityCode } : {}),
      ...(filters.veredaCode ? { veredaCode: filters.veredaCode } : {}),
      ...(filters.farmTypeCode ? { farmTypeCode: filters.farmTypeCode } : {}),
      ...(filters.hasValidPolygon ? { boundaryGeo: { not: Prisma.DbNull } } : {}),
      ...(filters.producerId
        ? { producerLinks: { some: { producerId: filters.producerId, unlinkedAt: null } } }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { farmName: { contains: filters.search, mode: 'insensitive' } },
              { farmCode: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.farmUnit.findMany({
        where,
        orderBy: { [filters.sortBy ?? 'createdAt']: filters.sortOrder ?? 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          farmCode: true,
          farmName: true,
          farmTypeCode: true,
          municipalityCode: true,
          veredaCode: true,
          totalAreaHa: true,
          agriculturalAreaHa: true,
          status: true,
          geometryConfidence: true,
          lastVisitAt: true,
          centroidLatitude: true,
          centroidLongitude: true,
          version: true,
          createdAt: true,
          producerLinks: {
            where: { unlinkedAt: null, isPrimary: true },
            take: 1,
            include: { producer: { select: { id: true, legalName: true } } },
          },
        },
      }),
      this.prisma.farmUnit.count({ where }),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(organizationId: string, id: string) {
    const farm = await this.prisma.farmUnit.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: this.includeRelations,
    });
    if (!farm) throw new NotFoundException('Farm not found');
    return farm;
  }

  async create(
    organizationId: string,
    userId: string,
    dto: CreateFarmDto,
    ctx?: RequestContext,
  ) {
    if (dto.externalId) {
      const existing = await this.prisma.farmUnit.findFirst({
        where: { organizationId, externalId: dto.externalId },
      });
      if (existing) return existing;
    }

    const farmCode = dto.farmCode ?? (await this.generateFarmCode(organizationId));
    let totalAreaHa = dto.totalAreaHa;
    let centroidLat = dto.centroidLatitude;
    let centroidLng = dto.centroidLongitude;

    if (dto.boundaryGeo) {
      const calcArea = calculatePolygonAreaHa(dto.boundaryGeo);
      if (calcArea != null) totalAreaHa = calcArea;
      const centroid = centroidFromPolygon(dto.boundaryGeo);
      if (centroid) {
        centroidLat = centroid.lat;
        centroidLng = centroid.lng;
      }
    }

    const farm = await this.prisma.$transaction(async (tx) => {
      const created = await tx.farmUnit.create({
        data: {
          organizationId,
          farmCode,
          farmName: dto.farmName,
          farmTypeCode: dto.farmTypeCode,
          productionSystemCode: dto.productionSystemCode,
          departmentCode: dto.departmentCode,
          municipalityCode: dto.municipalityCode,
          veredaCode: dto.veredaCode,
          streetAddress: dto.streetAddress,
          centroidLatitude: centroidLat,
          centroidLongitude: centroidLng,
          boundaryGeo: dto.boundaryGeo as Prisma.InputJsonValue,
          totalAreaHa,
          agriculturalAreaHa: dto.agriculturalAreaHa ?? totalAreaHa,
          tenureTypeCode: dto.tenureTypeCode,
          observations: dto.observations,
          tags: dto.tags ?? [],
          externalId: dto.externalId,
          status: 'draft',
          createdBy: userId,
          updatedBy: userId,
          aiReadiness: {
            productionForecast: 'ready',
            riskDetection: 'ready',
            agronomicRecommendations: 'ready',
            alerts: 'ready',
          },
        },
      });

      if (dto.producerId) {
        await tx.producerTerritoryLink.create({
          data: {
            organizationId,
            farmUnitId: created.id,
            producerId: dto.producerId,
            relationshipType: 'owner',
            isPrimary: true,
            createdBy: userId,
          },
        });
      }

      await tx.farmLifecycleEvent.create({
        data: {
          organizationId,
          farmUnitId: created.id,
          fromStatus: null,
          toStatus: 'draft',
          actorId: userId,
          reasonNotes: 'Alta inicial',
        },
      });

      return created;
    });

    await this.twin.refresh(organizationId, farm.id);
    await this.core.emitFarmCreated(
      organizationId,
      farm.id,
      { farmCode: farm.farmCode },
      { ctx: { ...ctx, userId, organizationId }, newValues: farm as unknown as Record<string, unknown> },
    );

    return farm;
  }

  async update(
    organizationId: string,
    id: string,
    userId: string,
    dto: UpdateFarmDto,
    ctx?: RequestContext,
  ) {
    const existing = await this.findOne(organizationId, id);
    if (dto.version !== undefined && dto.version !== existing.version) {
      throw new ConflictException('Version conflict');
    }

    const updated = await this.prisma.farmUnit.update({
      where: { id },
      data: {
        ...(dto.farmName !== undefined ? { farmName: dto.farmName } : {}),
        ...(dto.farmTypeCode !== undefined ? { farmTypeCode: dto.farmTypeCode } : {}),
        ...(dto.productionSystemCode !== undefined ? { productionSystemCode: dto.productionSystemCode } : {}),
        ...(dto.municipalityCode !== undefined ? { municipalityCode: dto.municipalityCode } : {}),
        ...(dto.veredaCode !== undefined ? { veredaCode: dto.veredaCode } : {}),
        ...(dto.streetAddress !== undefined ? { streetAddress: dto.streetAddress } : {}),
        ...(dto.totalAreaHa !== undefined ? { totalAreaHa: dto.totalAreaHa } : {}),
        ...(dto.agriculturalAreaHa !== undefined ? { agriculturalAreaHa: dto.agriculturalAreaHa } : {}),
        ...(dto.forestAreaHa !== undefined ? { forestAreaHa: dto.forestAreaHa } : {}),
        ...(dto.tenureTypeCode !== undefined ? { tenureTypeCode: dto.tenureTypeCode } : {}),
        ...(dto.observations !== undefined ? { observations: dto.observations } : {}),
        ...(dto.metadata !== undefined ? { metadata: dto.metadata as Prisma.InputJsonValue } : {}),
        updatedBy: userId,
        version: { increment: 1 },
      },
    });

    await this.twin.refresh(organizationId, id);
    await this.core.emitFarmUpdated(
      organizationId,
      id,
      { farmCode: updated.farmCode },
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
    const archived = await this.prisma.farmUnit.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'inactive',
        updatedBy: userId,
        version: { increment: 1 },
      },
    });

    await this.prisma.farmLifecycleEvent.create({
      data: {
        organizationId,
        farmUnitId: id,
        fromStatus: existing.status,
        toStatus: 'inactive',
        actorId: userId,
        reasonNotes: 'Archivada',
      },
    });

    await this.core.emitFarmDeleted(
      organizationId,
      id,
      { farmCode: existing.farmCode },
      { ctx: { ...ctx, userId, organizationId }, oldValues: existing as unknown as Record<string, unknown> },
    );

    return archived;
  }

  async getTimeline(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    const [lifecycle, audit, events, revisions] = await Promise.all([
      this.prisma.farmLifecycleEvent.findMany({ where: { farmUnitId: id }, orderBy: { occurredAt: 'desc' } }),
      this.prisma.auditLog.findMany({
        where: { entityType: 'FarmUnit', entityId: id, organizationId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.event.findMany({
        where: { aggregateType: 'FarmUnit', aggregateId: id, organizationId },
        orderBy: { occurredAt: 'desc' },
        take: 50,
      }),
      this.prisma.geometryRevision.findMany({
        where: { farmUnitId: id },
        orderBy: { occurredAt: 'desc' },
        take: 20,
      }),
    ]);

    const timeline = [
      ...lifecycle.map((e) => ({
        type: 'lifecycle' as const,
        id: e.id,
        occurredAt: e.occurredAt,
        title: `Estado: ${e.fromStatus ?? '—'} → ${e.toStatus}`,
        detail: e.reasonNotes,
      })),
      ...revisions.map((r) => ({
        type: 'geometry' as const,
        id: r.id,
        occurredAt: r.occurredAt,
        title: 'Revisión geométrica',
        detail: r.reasonNotes,
      })),
      ...audit.map((a) => ({
        type: 'audit' as const,
        id: a.id,
        occurredAt: a.createdAt,
        title: a.action,
        detail: null,
      })),
      ...events.map((e) => ({
        type: 'event' as const,
        id: e.id,
        occurredAt: e.occurredAt,
        title: e.eventType,
        detail: null,
      })),
    ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    return { items: timeline };
  }

  async getDashboard(organizationId: string) {
    const [total, byStatus, geoValid, byMunicipality, avgArea] = await Promise.all([
      this.prisma.farmUnit.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.farmUnit.groupBy({
        by: ['status'],
        where: { organizationId, deletedAt: null },
        _count: true,
      }),
      this.prisma.farmUnit.count({
        where: { organizationId, deletedAt: null, boundaryGeo: { not: Prisma.DbNull } },
      }),
      this.prisma.farmUnit.groupBy({
        by: ['municipalityCode'],
        where: { organizationId, deletedAt: null, municipalityCode: { not: null } },
        _count: true,
        orderBy: { _count: { municipalityCode: 'desc' } },
        take: 10,
      }),
      this.prisma.farmUnit.aggregate({
        where: { organizationId, deletedAt: null, status: 'active' },
        _avg: { totalAreaHa: true, agriculturalAreaHa: true },
        _sum: { agriculturalAreaHa: true },
      }),
    ]);

    const active = byStatus.find((s) => s.status === 'active')?._count ?? 0;

    return {
      kpis: {
        total,
        active,
        georeferenced: geoValid,
        georefRatePct: total > 0 ? Math.round((geoValid / total) * 100) : 0,
        avgTotalAreaHa: Number(avgArea._avg.totalAreaHa ?? 0),
        totalAgriculturalAreaHa: Number(avgArea._sum.agriculturalAreaHa ?? 0),
        pendingValidation: byStatus.find((s) => s.status === 'under_validation')?._count ?? 0,
      },
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
      byMunicipality: byMunicipality.map((m) => ({
        municipalityCode: m.municipalityCode,
        count: m._count,
      })),
    };
  }

  async getMapData(organizationId: string, filters: FarmListFilters = {}) {
    const result = await this.findAll(organizationId, { ...filters, limit: 500 });
    return {
      items: result.items
        .filter((f) => f.centroidLatitude != null && f.centroidLongitude != null)
        .map((f) => ({
          id: f.id,
          farmCode: f.farmCode,
          farmName: f.farmName,
          status: f.status,
          municipalityCode: f.municipalityCode,
          latitude: Number(f.centroidLatitude),
          longitude: Number(f.centroidLongitude),
          totalAreaHa: f.totalAreaHa != null ? Number(f.totalAreaHa) : null,
        })),
    };
  }

  async exportCsv(organizationId: string, filters: FarmListFilters = {}) {
    const result = await this.findAll(organizationId, { ...filters, limit: 10000 });
    const header = 'farmCode,farmName,municipalityCode,status,totalAreaHa,agriculturalAreaHa';
    const rows = result.items.map((f) =>
      [
        f.farmCode,
        `"${f.farmName.replace(/"/g, '""')}"`,
        f.municipalityCode ?? '',
        f.status,
        f.totalAreaHa ?? '',
        f.agriculturalAreaHa ?? '',
      ].join(','),
    );
    return { csv: [header, ...rows].join('\n'), count: result.items.length };
  }

  async importBatch(
    organizationId: string,
    userId: string,
    items: CreateFarmDto[],
    ctx?: RequestContext,
  ) {
    const results: Array<{ index: number; farmId?: string; error?: string }> = [];
    for (let i = 0; i < items.length; i++) {
      try {
        const farm = await this.create(organizationId, userId, items[i], ctx);
        results.push({ index: i, farmId: farm.id });
      } catch (err) {
        results.push({ index: i, error: err instanceof Error ? err.message : 'Error' });
      }
    }
    return { results, imported: results.filter((r) => r.farmId).length };
  }

  private async generateFarmCode(organizationId: string): Promise<string> {
    const count = await this.prisma.farmUnit.count({ where: { organizationId } });
    return `FTIP-${(count + 1).toString().padStart(6, '0')}`;
  }
}
