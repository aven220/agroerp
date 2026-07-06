import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';

@Injectable()
export class GisDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(organizationId: string) {
    const [
      layerCount,
      activeLayers,
      geofenceCount,
      routeCount,
      geoEventCount,
      recentEvents,
      producersWithGps,
      farmsWithGeometry,
      lotsWithGeometry,
    ] = await Promise.all([
      this.prisma.gisLayerDefinition.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.gisLayerDefinition.count({ where: { organizationId, status: 'active', deletedAt: null } }),
      this.prisma.gisGeofenceDefinition.count({ where: { organizationId, status: 'active' } }),
      this.prisma.gisRoutePlan.count({ where: { organizationId } }),
      this.prisma.gisGeoEvent.count({ where: { organizationId } }),
      this.prisma.gisGeoEvent.findMany({
        where: { organizationId },
        orderBy: { occurredAt: 'desc' },
        take: 10,
        include: { geofence: { select: { geofenceName: true } } },
      }),
      this.prisma.producer.count({
        where: { organizationId, deletedAt: null, latitude: { not: null }, longitude: { not: null } },
      }),
      this.prisma.farmUnit.count({
        where: { organizationId, deletedAt: null, boundaryGeo: { not: Prisma.DbNull } },
      }),
      this.prisma.fieldLotProfile.count({
        where: { organizationId, deletedAt: null, boundaryGeoRef: { not: Prisma.DbNull } },
      }),
    ]);

    const projections = await this.prisma.gisLayerFeatureProjection.groupBy({
      by: ['layerId'],
      where: { organizationId },
      _count: { _all: true },
    });

    const layers = await this.prisma.gisLayerDefinition.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true, layerCode: true, layerName: true, status: true },
    });

    const layerStats = layers.map((l) => ({
      ...l,
      featureCount: projections.find((p) => p.layerId === l.id)?._count._all ?? 0,
    }));

    return {
      kpis: {
        layerCount,
        activeLayers,
        geofenceCount,
        routeCount,
        geoEventCount,
        producersWithGps,
        farmsWithGeometry,
        lotsWithGeometry,
        totalProjectedFeatures: projections.reduce((s, p) => s + p._count._all, 0),
      },
      layerStats,
      recentGeoEvents: recentEvents,
      aiReadiness: {
        satelliteImagery: true,
        cropDetection: true,
        ndviAnalysis: true,
        climatePrediction: true,
        yieldModels: true,
        anomalyDetection: true,
        territorialChangeDetection: true,
        routeOptimization: true,
      },
    };
  }

  async getTimeline(organizationId: string, from?: string, to?: string) {
    return this.prisma.gisGeoEvent.findMany({
      where: {
        organizationId,
        ...(from || to
          ? {
              occurredAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { occurredAt: 'asc' },
      take: 500,
      include: { geofence: { select: { geofenceCode: true, geofenceName: true } } },
    });
  }
}
