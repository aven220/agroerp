import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  bboxFromGeometry,
  centroidFromGeometry,
  GeoJsonPoint,
  GeoJsonPolygon,
  toFeatureCollection,
} from '@/shared/spatial/geometry.util';
import { GisEventEmitter } from './gis-event-emitter.service';
import { LayerDefinitionService } from './layer-definition.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';

@Injectable()
export class LayerProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly layers: LayerDefinitionService,
    private readonly gisEvents: GisEventEmitter,
  ) {}

  async getFeaturesInBbox(
    organizationId: string,
    layerId: string,
    minLat: number,
    minLng: number,
    maxLat: number,
    maxLng: number,
    limit = 5000,
  ) {
    const projections = await this.prisma.gisLayerFeatureProjection.findMany({
      where: {
        layerId,
        organizationId,
        bboxMaxLat: { gte: minLat },
        bboxMinLat: { lte: maxLat },
        bboxMaxLng: { gte: minLng },
        bboxMinLng: { lte: maxLng },
      },
      take: limit,
      orderBy: { refreshedAt: 'desc' },
    });

    return toFeatureCollection(
      projections.map((p) => ({
        geometry: p.geometry as never,
        properties: {
          ...(p.properties as Record<string, unknown>),
          entityType: p.entityType,
          entityId: p.entityId,
        },
      })),
    );
  }

  async refreshLayer(organizationId: string, layerId: string, ctx?: Partial<RequestContext>) {
    const layer = await this.layers.findById(organizationId, layerId);
    await this.prisma.gisLayerFeatureProjection.deleteMany({ where: { layerId } });

    const features = await this.projectFromSource(organizationId, layer.sourceModule, layer.sourceQuery as Record<string, unknown>);
    let count = 0;
    for (const f of features) {
      const bbox = bboxFromGeometry(f.geometry);
      const centroid = centroidFromGeometry(f.geometry);
      await this.prisma.gisLayerFeatureProjection.create({
        data: {
          organizationId,
          layerId,
          entityType: f.entityType,
          entityId: f.entityId,
          geometry: f.geometry as Prisma.InputJsonValue,
          properties: (f.properties ?? {}) as Prisma.InputJsonValue,
          centroidLat: centroid?.lat ?? null,
          centroidLng: centroid?.lng ?? null,
          bboxMinLat: bbox?.minLat ?? null,
          bboxMaxLat: bbox?.maxLat ?? null,
          bboxMinLng: bbox?.minLng ?? null,
          bboxMaxLng: bbox?.maxLng ?? null,
        },
      });
      count += 1;
    }

    await this.gisEvents.projectionRefreshed(organizationId, layerId, { featureCount: count, layerCode: layer.layerCode }, ctx);
    return { layerId, featureCount: count };
  }

  async refreshAll(organizationId: string, userId?: string, ctx?: Partial<RequestContext>) {
    await this.layers.ensureDefaultLayers(organizationId, userId);
    const activeLayers = await this.prisma.gisLayerDefinition.findMany({
      where: { organizationId, status: 'active', deletedAt: null },
    });
    const results = [];
    for (const layer of activeLayers) {
      results.push(await this.refreshLayer(organizationId, layer.id, ctx));
    }
    return results;
  }

  private async projectFromSource(
    organizationId: string,
    sourceModule: string,
    sourceQuery: Record<string, unknown>,
  ): Promise<Array<{ entityType: string; entityId: string; geometry: object; properties?: Record<string, unknown> }>> {
    switch (sourceModule.toUpperCase()) {
      case 'PRM':
        return this.projectProducers(organizationId, sourceQuery);
      case 'FTIP':
        return this.projectFarms(organizationId, sourceQuery);
      case 'FMDT':
        return this.projectLots(organizationId, sourceQuery);
      case 'UDFE':
        return this.projectFormSubmissions(organizationId, sourceQuery);
      case 'EGSIP':
        return this.projectGeofences(organizationId, sourceQuery);
      default:
        return this.projectImported(organizationId, sourceQuery);
    }
  }

  private async projectProducers(organizationId: string, query: Record<string, unknown>) {
    const producers = await this.prisma.producer.findMany({
      where: {
        organizationId,
        deletedAt: null,
        latitude: { not: null },
        longitude: { not: null },
        ...(query.status ? { lifecycleStatus: String(query.status) as never } : {}),
      },
      select: {
        id: true,
        legalName: true,
        producerNumber: true,
        lifecycleStatus: true,
        latitude: true,
        longitude: true,
        municipalityCode: true,
      },
    });
    return producers
      .filter((p) => p.latitude != null && p.longitude != null)
      .map((p) => ({
        entityType: 'producer',
        entityId: p.id,
        geometry: {
          type: 'Point',
          coordinates: [Number(p.longitude), Number(p.latitude)],
        } as GeoJsonPoint,
        properties: {
          name: p.legalName,
          code: p.producerNumber,
          status: p.lifecycleStatus,
          municipalityCode: p.municipalityCode,
        },
      }));
  }

  private async projectFarms(organizationId: string, query: Record<string, unknown>) {
    const farms = await this.prisma.farmUnit.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(query.status ? { status: String(query.status) as never } : {}),
      },
      select: {
        id: true,
        farmCode: true,
        farmName: true,
        status: true,
        boundaryGeo: true,
        totalAreaHa: true,
        centroidLatitude: true,
        centroidLongitude: true,
      },
    });
    return farms
      .map((f) => {
        if (f.boundaryGeo) {
          return {
            entityType: 'farm',
            entityId: f.id,
            geometry: f.boundaryGeo as unknown as GeoJsonPolygon,
            properties: {
              name: f.farmName,
              code: f.farmCode,
              status: f.status,
              areaHa: f.totalAreaHa ? Number(f.totalAreaHa) : null,
            },
          };
        }
        if (f.centroidLatitude != null && f.centroidLongitude != null) {
          return {
            entityType: 'farm',
            entityId: f.id,
            geometry: {
              type: 'Point',
              coordinates: [Number(f.centroidLongitude), Number(f.centroidLatitude)],
            } as GeoJsonPoint,
            properties: {
              name: f.farmName,
              code: f.farmCode,
              status: f.status,
            },
          };
        }
        return null;
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
  }

  private async projectLots(organizationId: string, query: Record<string, unknown>) {
    const lots = await this.prisma.fieldLotProfile.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(query.status ? { status: String(query.status) as never } : {}),
        ...(query.farmUnitId ? { farmUnitId: String(query.farmUnitId) } : {}),
      },
      select: {
        id: true,
        lotCode: true,
        lotName: true,
        status: true,
        boundaryGeoRef: true,
        totalAreaHa: true,
        centroidLatitude: true,
        centroidLongitude: true,
        farmUnitId: true,
      },
    });
    return lots
      .map((l) => {
        if (l.boundaryGeoRef) {
          return {
            entityType: 'field_lot',
            entityId: l.id,
            geometry: l.boundaryGeoRef as unknown as GeoJsonPolygon,
            properties: {
              name: l.lotName,
              code: l.lotCode,
              status: l.status,
              areaHa: l.totalAreaHa ? Number(l.totalAreaHa) : null,
              farmUnitId: l.farmUnitId,
            },
          };
        }
        if (l.centroidLatitude != null && l.centroidLongitude != null) {
          return {
            entityType: 'field_lot',
            entityId: l.id,
            geometry: {
              type: 'Point',
              coordinates: [Number(l.centroidLongitude), Number(l.centroidLatitude)],
            } as GeoJsonPoint,
            properties: { name: l.lotName, code: l.lotCode, status: l.status },
          };
        }
        return null;
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
  }

  private async projectFormSubmissions(organizationId: string, _query: Record<string, unknown>) {
    const submissions = await this.prisma.formSubmission.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true, formId: true, context: true, gpsLocation: true, createdAt: true, status: true },
      take: 10000,
      orderBy: { createdAt: 'desc' },
    });
    const features: Array<{ entityType: string; entityId: string; geometry: GeoJsonPoint; properties: Record<string, unknown> }> = [];
    for (const s of submissions) {
      const ctx = s.context as Record<string, unknown> | null;
      const gpsRaw = s.gpsLocation as { lat?: number; lng?: number; latitude?: number; longitude?: number } | null;
      const gps = gpsRaw ?? (ctx?.gps as typeof gpsRaw);
      const lat = gps?.lat ?? gps?.latitude;
      const lng = gps?.lng ?? gps?.longitude;
      if (lat == null || lng == null) continue;
      features.push({
        entityType: 'form_submission',
        entityId: s.id,
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: { formId: s.formId, status: s.status, submittedAt: s.createdAt },
      });
    }
    return features;
  }

  private async projectGeofences(organizationId: string, _query: Record<string, unknown>) {
    const geofences = await this.prisma.gisGeofenceDefinition.findMany({
      where: { organizationId, status: 'active' },
    });
    return geofences.map((g) => ({
      entityType: 'geofence',
      entityId: g.id,
      geometry: g.geometry as object,
      properties: {
        name: g.geofenceName,
        code: g.geofenceCode,
        entityType: g.entityType,
        entityId: g.entityId,
      },
    }));
  }

  private async projectImported(organizationId: string, query: Record<string, unknown>) {
    const layerCode = query.layerCode ? String(query.layerCode) : null;
    if (!layerCode) return [];
    const imported = await this.prisma.gisImportedGeoLayer.findFirst({
      where: { organizationId, layerCode },
      orderBy: { importedAt: 'desc' },
    });
    if (!imported) return [];
    const features = imported.features as Array<{ geometry: object; properties?: Record<string, unknown> }>;
    return features.map((f, idx) => ({
      entityType: 'imported',
      entityId: `${imported.id}-${idx}`,
      geometry: f.geometry,
      properties: f.properties,
    }));
  }
}
