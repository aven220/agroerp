import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { LayerProjectionService } from './layer-projection.service';
import { GeoEventsService, TrackPoint } from './geo-events.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';

export interface MobileSyncPayload {
  tracks?: Array<{ deviceId?: string; points: TrackPoint[]; expectedLotId?: string }>;
  captures?: Array<{
    captureType: 'point' | 'line' | 'polygon';
    geometry: Record<string, unknown>;
    mediaRefs?: string[];
    capturedAt: string;
    metadata?: Record<string, unknown>;
  }>;
  layerRefresh?: boolean;
}

@Injectable()
export class GisMobileSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projection: LayerProjectionService,
    private readonly geoEvents: GeoEventsService,
  ) {}

  async sync(
    organizationId: string,
    userId: string,
    payload: MobileSyncPayload,
    ctx?: Partial<RequestContext>,
  ) {
    const results: Record<string, unknown> = {};

    if (payload.tracks?.length) {
      const trackResults = [];
      for (const track of payload.tracks) {
        const r = await this.geoEvents.processTrack(
          organizationId,
          userId,
          track.deviceId,
          track.points,
          { expectedLotId: track.expectedLotId, maxSpeedMps: 50, maxDisplacementM: 50000 },
          ctx,
        );
        trackResults.push(r);
      }
      results.tracks = trackResults;
    }

    if (payload.captures?.length) {
      const captureResults = [];
      for (const cap of payload.captures) {
        const imported = await this.prisma.gisImportedGeoLayer.create({
          data: {
            organizationId,
            layerCode: `mobile-capture-${Date.now()}`,
            sourceFormat: cap.captureType,
            featureCount: 1,
            features: [
              {
                type: 'Feature',
                geometry: cap.geometry,
                properties: {
                  ...cap.metadata,
                  captureType: cap.captureType,
                  mediaRefs: cap.mediaRefs,
                  capturedAt: cap.capturedAt,
                  userId,
                },
              },
            ] as Prisma.InputJsonValue,
            importedBy: userId,
          },
        });
        captureResults.push({ importId: imported.id, captureType: cap.captureType });
      }
      results.captures = captureResults;
    }

    if (payload.layerRefresh !== false) {
      results.projections = await this.projection.refreshAll(organizationId, userId, ctx);
    }

    const layers = await this.prisma.gisLayerDefinition.findMany({
      where: { organizationId, status: 'active', deletedAt: null },
      select: {
        id: true,
        layerCode: true,
        layerName: true,
        layerType: true,
        geometryType: true,
        styleRules: true,
      },
    });

    const basemaps = await this.prisma.gisBasemapConfig.findMany({ where: { organizationId } });

    return {
      syncedAt: new Date().toISOString(),
      layers,
      basemaps,
      ...results,
    };
  }
}
