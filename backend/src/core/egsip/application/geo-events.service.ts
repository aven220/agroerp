import { Injectable } from '@nestjs/common';
import { GisGeoEventType, Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { haversineDistanceM } from '@/shared/spatial/geometry.util';
import { GisEventEmitter } from './gis-event-emitter.service';
import { GeofenceService } from './geofence.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';

export interface TrackPoint {
  lat: number;
  lng: number;
  capturedAt: string;
  accuracyM?: number;
  speedMps?: number;
}

@Injectable()
export class GeoEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geofences: GeofenceService,
    private readonly gisEvents: GisEventEmitter,
  ) {}

  listEvents(
    organizationId: string,
    filters?: { eventType?: GisGeoEventType; from?: string; to?: string; limit?: number },
  ) {
    return this.prisma.gisGeoEvent.findMany({
      where: {
        organizationId,
        ...(filters?.eventType ? { eventType: filters.eventType } : {}),
        ...(filters?.from || filters?.to
          ? {
              occurredAt: {
                ...(filters.from ? { gte: new Date(filters.from) } : {}),
                ...(filters.to ? { lte: new Date(filters.to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { occurredAt: 'desc' },
      take: filters?.limit ?? 200,
      include: { geofence: { select: { geofenceCode: true, geofenceName: true } } },
    });
  }

  async recordEvent(
    organizationId: string,
    eventType: GisGeoEventType,
    location: { lat: number; lng: number },
    meta: {
      userId?: string;
      deviceId?: string;
      entityType?: string;
      entityId?: string;
      geofenceId?: string;
      metadata?: Record<string, unknown>;
    },
    ctx?: Partial<RequestContext>,
  ) {
    const event = await this.prisma.gisGeoEvent.create({
      data: {
        organizationId,
        eventType,
        geofenceId: meta.geofenceId ?? null,
        entityType: meta.entityType ?? null,
        entityId: meta.entityId ?? null,
        userId: meta.userId ?? null,
        deviceId: meta.deviceId ?? null,
        location: { type: 'Point', coordinates: [location.lng, location.lat] },
        metadata: (meta.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
    await this.gisEvents.geoEventRecorded(organizationId, event.id, { eventType, ...location }, ctx);
    return event;
  }

  async processTrack(
    organizationId: string,
    userId: string,
    deviceId: string | undefined,
    track: TrackPoint[],
    options: {
      expectedLotId?: string;
      maxSpeedMps?: number;
      maxDisplacementM?: number;
      visitAreaGeofenceId?: string;
    },
    ctx?: Partial<RequestContext>,
  ) {
    if (track.length === 0) return { events: [] };
    const events: string[] = [];
    let previousInside: string[] = [];
    let totalDisplacement = 0;

    for (let i = 0; i < track.length; i++) {
      const pt = track[i];
      const transition = await this.geofences.evaluateTransition(
        organizationId,
        userId,
        deviceId,
        pt.lat,
        pt.lng,
        previousInside,
        ctx,
      );
      previousInside = transition.currentInside;
      events.push(...transition.entered.map(() => 'geofence_enter'));
      events.push(...transition.exited.map(() => 'geofence_exit'));

      if (i > 0) {
        const prev = track[i - 1];
        const dist = haversineDistanceM(prev.lat, prev.lng, pt.lat, pt.lng);
        totalDisplacement += dist;
        const dt =
          (new Date(pt.capturedAt).getTime() - new Date(prev.capturedAt).getTime()) / 1000 || 1;
        const speed = dist / dt;
        if (options.maxSpeedMps && speed > options.maxSpeedMps) {
          await this.recordEvent(organizationId, 'abnormal_movement', pt, { userId, deviceId, metadata: { speedMps: speed } }, ctx);
          events.push('abnormal_movement');
        }
        if (dist > 500 && dt < 30) {
          await this.recordEvent(organizationId, 'excessive_displacement', pt, { userId, deviceId, metadata: { distanceM: dist, seconds: dt } }, ctx);
          events.push('excessive_displacement');
        }
      }

      if (options.visitAreaGeofenceId) {
        const check = await this.geofences.checkPoint(organizationId, pt.lat, pt.lng);
        const inVisitArea = check.geofences.some((g) => g.geofenceId === options.visitAreaGeofenceId && g.inside);
        if (!inVisitArea) {
          await this.recordEvent(organizationId, 'visit_out_of_area', pt, { userId, deviceId }, ctx);
          events.push('visit_out_of_area');
        }
      }

      if (options.expectedLotId) {
        const lot = await this.prisma.fieldLotProfile.findFirst({
          where: { id: options.expectedLotId, organizationId },
          select: { boundaryGeoRef: true, id: true },
        });
        if (lot?.boundaryGeoRef) {
          const check = await this.geofences.checkPoint(organizationId, pt.lat, pt.lng, 'field_lot', lot.id);
          if (!check.allInside) {
            await this.recordEvent(organizationId, 'wrong_lot_entry', pt, { userId, deviceId, entityType: 'field_lot', entityId: lot.id }, ctx);
            events.push('wrong_lot_entry');
          }
        }
      }
    }

    if (options.maxDisplacementM && totalDisplacement > options.maxDisplacementM) {
      const last = track[track.length - 1];
      await this.recordEvent(
        organizationId,
        'excessive_displacement',
        last,
        { userId, deviceId, metadata: { totalDisplacementM: totalDisplacement } },
        ctx,
      );
    }

    await this.gisEvents.gpsTrackRecorded(organizationId, deviceId ?? userId, { pointCount: track.length }, ctx);
    return { events, totalDisplacementM: Math.round(totalDisplacement) };
  }
}
