import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { GisDashboardService } from '@/core/egsip/application/gis-dashboard.service';
import { LayerProjectionService } from '@/core/egsip/application/layer-projection.service';
import { SpatialOpsService } from '@/core/egsip/application/spatial-ops.service';
import { EappAuditService } from './eapp-audit.service';

@Injectable()
export class EappGisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spatial: SpatialOpsService,
    private readonly projection: LayerProjectionService,
    private readonly dashboard: GisDashboardService,
    private readonly audit: EappAuditService,
  ) {}

  async mapContext(organizationId: string) {
    const [gisDash, layers, lots, farms] = await Promise.all([
      this.dashboard.getDashboard(organizationId),
      this.prisma.gisLayerDefinition.findMany({
        where: { organizationId, deletedAt: null, status: { in: ['active', 'draft'] } },
        orderBy: { layerName: 'asc' },
      }),
      this.prisma.fieldLotProfile.findMany({
        where: { organizationId, deletedAt: null, boundaryGeoRef: { not: Prisma.DbNull } },
        select: {
          id: true,
          lotCode: true,
          lotName: true,
          totalAreaHa: true,
          boundaryGeoRef: true,
          farmUnitId: true,
        },
        take: 500,
      }),
      this.prisma.farmUnit.findMany({
        where: { organizationId, deletedAt: null, boundaryGeo: { not: Prisma.DbNull } },
        select: { id: true, farmCode: true, farmName: true, boundaryGeo: true },
        take: 200,
      }),
    ]);
    return { gisDash, layers, lotPolygons: lots, farmPolygons: farms };
  }

  listLayers(organizationId: string) {
    return this.prisma.gisLayerDefinition.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { layerName: 'asc' },
    });
  }

  getFeaturesInBbox(
    organizationId: string,
    layerId: string,
    minLat: number,
    minLng: number,
    maxLat: number,
    maxLng: number,
  ) {
    return this.projection.getFeaturesInBbox(organizationId, layerId, minLat, minLng, maxLat, maxLng);
  }

  refreshLayer(organizationId: string, layerId: string, userId?: string) {
    return this.projection.refreshLayer(organizationId, layerId, { userId });
  }

  measureArea(geometry: unknown) {
    return this.spatial.measureArea(geometry);
  }

  measureDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
    return this.spatial.measureDistance(lat1, lng1, lat2, lng2);
  }

  measurePerimeter(geometry: unknown) {
    return this.spatial.measurePerimeter(geometry);
  }

  measureLineLength(coordinates: number[][]) {
    return this.spatial.measureLineLength(coordinates);
  }

  async logPolygonEdit(
    organizationId: string,
    userId: string,
    entityType: string,
    entityKey: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ) {
    await this.audit.logMapEdit(organizationId, entityType, entityKey, 'polygon_edited', userId, before, after);
    await this.audit.log(organizationId, entityType, entityKey, 'polygon_edited', userId, { entityType });
    return { logged: true };
  }
}
