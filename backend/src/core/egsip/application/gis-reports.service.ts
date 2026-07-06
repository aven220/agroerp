import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { buildHeatmapGrid, clusterPoints } from '@/shared/spatial/geometry.util';
import { LayerProjectionService } from './layer-projection.service';

@Injectable()
export class GisReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projection: LayerProjectionService,
  ) {}

  async generate(organizationId: string, reportCode: string, params: Record<string, unknown> = {}) {
    switch (reportCode) {
      case 'GTIP-RPT-COVERAGE':
        return this.coverageReport(organizationId);
      case 'GTIP-RPT-PRODUCTIVITY':
        return this.productivityReport(organizationId);
      case 'GTIP-RPT-HEATMAP':
        return this.heatmapReport(organizationId, params);
      case 'GTIP-RPT-TECH-COVERAGE':
        return this.techCoverageReport(organizationId);
      case 'GTIP-RPT-LAND-USE':
        return this.landUseReport(organizationId);
      case 'GTIP-RPT-PURCHASES':
        return this.purchaseDistributionReport(organizationId);
      default:
        return this.territorialSummary(organizationId);
    }
  }

  private async coverageReport(organizationId: string) {
    const [producers, farms, lots] = await Promise.all([
      this.prisma.producer.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.farmUnit.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.fieldLotProfile.count({ where: { organizationId, deletedAt: null } }),
    ]);
    const [producersGps, farmsGeo, lotsGeo] = await Promise.all([
      this.prisma.producer.count({
        where: { organizationId, deletedAt: null, latitude: { not: null }, longitude: { not: null } },
      }),
      this.prisma.farmUnit.count({
        where: { organizationId, deletedAt: null, OR: [{ boundaryGeo: { not: Prisma.DbNull } }, { centroidLatitude: { not: null } }] },
      }),
      this.prisma.fieldLotProfile.count({
        where: { organizationId, deletedAt: null, OR: [{ boundaryGeoRef: { not: Prisma.DbNull } }, { centroidLatitude: { not: null } }] },
      }),
    ]);
    return {
      reportCode: 'GTIP-RPT-COVERAGE',
      coverage: {
        producers: { total: producers, georeferenced: producersGps, pct: producers ? Math.round((producersGps / producers) * 100) : 0 },
        farms: { total: farms, georeferenced: farmsGeo, pct: farms ? Math.round((farmsGeo / farms) * 100) : 0 },
        lots: { total: lots, georeferenced: lotsGeo, pct: lots ? Math.round((lotsGeo / lots) * 100) : 0 },
      },
    };
  }

  private async productivityReport(organizationId: string) {
    const lots = await this.prisma.fieldLotProfile.findMany({
      where: { organizationId, deletedAt: null, totalAreaHa: { not: null } },
      select: {
        id: true,
        lotCode: true,
        lotName: true,
        totalAreaHa: true,
        plantedAreaHa: true,
        farmUnitId: true,
      },
    });
    const totalHa = lots.reduce((s, l) => s + Number(l.totalAreaHa ?? 0), 0);
    const plantedHa = lots.reduce((s, l) => s + Number(l.plantedAreaHa ?? 0), 0);
    return {
      reportCode: 'GTIP-RPT-PRODUCTIVITY',
      totalAreaHa: Math.round(totalHa * 100) / 100,
      plantedAreaHa: Math.round(plantedHa * 100) / 100,
      utilizationPct: totalHa ? Math.round((plantedHa / totalHa) * 100) : 0,
      byLot: lots.map((l) => ({
        lotCode: l.lotCode,
        lotName: l.lotName,
        totalAreaHa: Number(l.totalAreaHa),
        plantedAreaHa: l.plantedAreaHa ? Number(l.plantedAreaHa) : null,
      })),
    };
  }

  private async heatmapReport(organizationId: string, params: Record<string, unknown>) {
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
        weight: 1,
      }));
    const minLat = params.minLat != null ? Number(params.minLat) : 4.0;
    const maxLat = params.maxLat != null ? Number(params.maxLat) : 5.0;
    const minLng = params.minLng != null ? Number(params.minLng) : -75.0;
    const maxLng = params.maxLng != null ? Number(params.maxLng) : -74.0;
    const grid = buildHeatmapGrid(points, { minLat, maxLat, minLng, maxLng });
    const clusters = clusterPoints(points);
    return { reportCode: 'GTIP-RPT-HEATMAP', grid, clusters, pointCount: points.length };
  }

  private async techCoverageReport(organizationId: string) {
    const lots = await this.prisma.fieldLotProfile.findMany({
      where: { organizationId, deletedAt: null },
      select: { assignedTechnicianId: true, farmUnitId: true },
    });
    const withTech = lots.filter((l) => l.assignedTechnicianId).length;
    return {
      reportCode: 'GTIP-RPT-TECH-COVERAGE',
      totalLots: lots.length,
      assignedLots: withTech,
      coveragePct: lots.length ? Math.round((withTech / lots.length) * 100) : 0,
    };
  }

  private async landUseReport(organizationId: string) {
    const farms = await this.prisma.farmUnit.groupBy({
      by: ['landUseCode'],
      where: { organizationId, deletedAt: null },
      _count: { _all: true },
      _sum: { totalAreaHa: true },
    });
    return {
      reportCode: 'GTIP-RPT-LAND-USE',
      distribution: farms.map((f) => ({
        landUseCode: f.landUseCode ?? 'unknown',
        count: f._count._all,
        totalAreaHa: f._sum.totalAreaHa ? Number(f._sum.totalAreaHa) : 0,
      })),
    };
  }

  private async purchaseDistributionReport(organizationId: string) {
    return {
      reportCode: 'GTIP-RPT-PURCHASES',
      message: 'Integración CPE pendiente de datos de compras georreferenciadas',
      distribution: [],
    };
  }

  private async territorialSummary(organizationId: string) {
    const dashboard = await this.prisma.gisLayerFeatureProjection.count({ where: { organizationId } });
    return { reportCode: 'GTIP-RPT-SUMMARY', projectedFeatures: dashboard };
  }
}
