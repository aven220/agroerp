import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';
import { calculatePolygonAreaHa, centroidFromPolygon } from './geometry.util';
import { FarmsService } from './farms.service';
import { FarmTwinService } from './farm-twin.service';
import { SetGeometryDto } from '../presentation/farms.dto';

@Injectable()
export class FarmGeometryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly farms: FarmsService,
    private readonly twin: FarmTwinService,
  ) {}

  async setBoundary(
    organizationId: string,
    farmUnitId: string,
    userId: string,
    dto: SetGeometryDto,
    ctx?: RequestContext,
  ) {
    const farm = await this.farms.findOne(organizationId, farmUnitId);
    const calculatedAreaHa = calculatePolygonAreaHa(dto.geometryGeo);
    const centroid = centroidFromPolygon(dto.geometryGeo);

    const geometry = await this.prisma.territoryGeometry.create({
      data: {
        organizationId,
        farmUnitId,
        entityType: 'farm_unit',
        entityId: farmUnitId,
        geometryGeo: dto.geometryGeo as Prisma.InputJsonValue,
        captureMethod: dto.captureMethod,
        captureAccuracyM: dto.captureAccuracyM,
        calculatedAreaHa,
        capturedBy: userId,
        validationStatus: 'pending',
      },
    });

    await this.prisma.geometryRevision.create({
      data: {
        organizationId,
        farmUnitId,
        entityType: 'farm_unit',
        entityId: farmUnitId,
        fromGeometry: farm.boundaryGeo as Prisma.InputJsonValue,
        toGeometry: dto.geometryGeo as Prisma.InputJsonValue,
        fromAreaHa: farm.totalAreaHa,
        toAreaHa: calculatedAreaHa,
        reasonNotes: dto.reasonNotes,
        actorId: userId,
      },
    });

    const updated = await this.prisma.farmUnit.update({
      where: { id: farmUnitId },
      data: {
        boundaryGeo: dto.geometryGeo as Prisma.InputJsonValue,
        activeGeometryId: geometry.id,
        totalAreaHa: calculatedAreaHa ?? farm.totalAreaHa,
        centroidLatitude: centroid?.lat ?? farm.centroidLatitude,
        centroidLongitude: centroid?.lng ?? farm.centroidLongitude,
        lastGeometryChangeAt: new Date(),
        geometryConfidence: dto.captureAccuracyM && dto.captureAccuracyM <= 15 ? 'high' : 'medium',
        updatedBy: userId,
        version: { increment: 1 },
      },
    });

    await this.twin.refresh(organizationId, farmUnitId, ctx);
    await this.core.emitFarmGeometryRevised(
      organizationId,
      farmUnitId,
      { geometryId: geometry.id, calculatedAreaHa },
      { ctx: { ...ctx, userId, organizationId } },
    );

    return { farm: updated, geometry };
  }

  async getHistory(organizationId: string, farmUnitId: string) {
    await this.farms.findOne(organizationId, farmUnitId);
    return this.prisma.geometryRevision.findMany({
      where: { farmUnitId, organizationId },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async checkOverlap(
    organizationId: string,
    geometryGeo: Record<string, unknown>,
    excludeFarmId?: string,
  ) {
    const farms = await this.prisma.farmUnit.findMany({
      where: {
        organizationId,
        deletedAt: null,
        boundaryGeo: { not: Prisma.DbNull },
        ...(excludeFarmId ? { NOT: { id: excludeFarmId } } : {}),
      },
      select: { id: true, farmCode: true, farmName: true, boundaryGeo: true },
      take: 500,
    });

    const overlaps: Array<{ farmId: string; farmCode: string; farmName: string }> = [];
    const targetBbox = boundingBox(geometryGeo);
    if (!targetBbox) return { overlaps: [], checked: farms.length };

    for (const f of farms) {
      const bbox = boundingBox(f.boundaryGeo);
      if (bbox && boxesOverlap(targetBbox, bbox)) {
        overlaps.push({ farmId: f.id, farmCode: f.farmCode, farmName: f.farmName });
      }
    }

    return { overlaps, checked: farms.length };
  }
}

function boundingBox(geo: unknown): [number, number, number, number] | null {
  if (!geo || typeof geo !== 'object') return null;
  const g = geo as { type?: string; coordinates?: number[][][] };
  if (g.type !== 'Polygon' || !g.coordinates?.[0]) return null;
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of g.coordinates[0]) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  return [minLng, minLat, maxLng, maxLat];
}

function boxesOverlap(a: [number, number, number, number], b: [number, number, number, number]) {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}
