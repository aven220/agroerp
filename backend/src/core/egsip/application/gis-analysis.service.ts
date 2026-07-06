import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  buildHeatmapGrid,
  clusterPoints,
  polygonsIntersect,
  GeoJsonPolygon,
} from '@/shared/spatial/geometry.util';
import { GisEventEmitter } from './gis-event-emitter.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';

@Injectable()
export class GisAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gisEvents: GisEventEmitter,
  ) {}

  async startAnalysis(
    organizationId: string,
    userId: string,
    analysisType: string,
    parameters: Record<string, unknown>,
    ctx?: Partial<RequestContext>,
  ) {
    const job = await this.prisma.gisTerritoryAnalysisJob.create({
      data: {
        organizationId,
        analysisType,
        parameters: parameters as Prisma.InputJsonValue,
        status: 'pending',
        requestedBy: userId,
      },
    });

    setImmediate(() => {
      void this.runJob(organizationId, job.id, analysisType, parameters, ctx);
    });

    return job;
  }

  getJob(organizationId: string, jobId: string) {
    return this.prisma.gisTerritoryAnalysisJob.findFirst({
      where: { id: jobId, organizationId },
    });
  }

  private async runJob(
    organizationId: string,
    jobId: string,
    analysisType: string,
    parameters: Record<string, unknown>,
    ctx?: Partial<RequestContext>,
  ) {
    await this.prisma.gisTerritoryAnalysisJob.update({
      where: { id: jobId },
      data: { status: 'running', startedAt: new Date() },
    });

    try {
      let result: Record<string, unknown>;
      switch (analysisType) {
        case 'heatmap':
          result = await this.runHeatmap(organizationId, parameters);
          await this.gisEvents.heatmapCalculated(organizationId, jobId, result, ctx);
          break;
        case 'cluster':
          result = await this.runCluster(organizationId, parameters);
          break;
        case 'intersect':
          result = this.runIntersect(parameters);
          break;
        case 'proximity':
          result = await this.runProximity(organizationId, parameters);
          break;
        case 'territorial':
          result = await this.runTerritorial(organizationId);
          break;
        default:
          result = { message: `Análisis ${analysisType} registrado` };
      }

      await this.prisma.gisTerritoryAnalysisJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          resultRef: result as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });
      await this.gisEvents.analysisCompleted(organizationId, jobId, { analysisType, result }, ctx);
    } catch (err) {
      await this.prisma.gisTerritoryAnalysisJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : 'Error desconocido',
          completedAt: new Date(),
        },
      });
    }
  }

  private async runHeatmap(organizationId: string, parameters: Record<string, unknown>) {
    const projections = await this.prisma.gisLayerFeatureProjection.findMany({
      where: { organizationId },
      select: { centroidLat: true, centroidLng: true },
      take: 10000,
    });
    const points = projections
      .filter((p) => p.centroidLat != null && p.centroidLng != null)
      .map((p) => ({ lat: Number(p.centroidLat), lng: Number(p.centroidLng) }));
    const bbox = {
      minLat: Number(parameters.minLat ?? 4),
      maxLat: Number(parameters.maxLat ?? 5),
      minLng: Number(parameters.minLng ?? -75),
      maxLng: Number(parameters.maxLng ?? -74),
    };
    return { grid: buildHeatmapGrid(points, bbox), pointCount: points.length };
  }

  private async runCluster(organizationId: string, parameters: Record<string, unknown>) {
    const projections = await this.prisma.gisLayerFeatureProjection.findMany({
      where: { organizationId },
      select: { centroidLat: true, centroidLng: true, properties: true },
      take: 10000,
    });
    const points = projections
      .filter((p) => p.centroidLat != null && p.centroidLng != null)
      .map((p) => ({
        lat: Number(p.centroidLat),
        lng: Number(p.centroidLng),
        properties: p.properties as Record<string, unknown>,
      }));
    return { clusters: clusterPoints(points, Number(parameters.cellSizeDeg ?? 0.05)) };
  }

  private runIntersect(parameters: Record<string, unknown>) {
    const a = parameters.geometryA as GeoJsonPolygon;
    const b = parameters.geometryB as GeoJsonPolygon;
    return { intersects: polygonsIntersect(a, b) };
  }

  private async runProximity(organizationId: string, parameters: Record<string, unknown>) {
    const lat = Number(parameters.lat);
    const lng = Number(parameters.lng);
    const radiusM = Number(parameters.radiusM ?? 1000);
    const projections = await this.prisma.gisLayerFeatureProjection.findMany({
      where: { organizationId },
      take: 5000,
    });
    const { haversineDistanceM } = await import('@/shared/spatial/geometry.util');
    const nearby = projections
      .filter((p) => p.centroidLat != null && p.centroidLng != null)
      .map((p) => ({
        entityType: p.entityType,
        entityId: p.entityId,
        distanceM: haversineDistanceM(lat, lng, Number(p.centroidLat), Number(p.centroidLng)),
      }))
      .filter((n) => n.distanceM <= radiusM)
      .sort((a, b) => a.distanceM - b.distanceM);
    return { nearby, radiusM };
  }

  private async runTerritorial(organizationId: string) {
    const counts = await this.prisma.gisLayerFeatureProjection.groupBy({
      by: ['entityType'],
      where: { organizationId },
      _count: { _all: true },
    });
    return { entityDistribution: counts };
  }
}
