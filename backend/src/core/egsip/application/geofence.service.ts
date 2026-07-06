import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  GeoJsonGeometry,
  GeoJsonPolygon,
  pointInCircle,
  pointInGeometry,
} from '@/shared/spatial/geometry.util';
import { GisEventEmitter } from './gis-event-emitter.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';

export interface CreateGeofenceDto {
  geofenceCode: string;
  geofenceName: string;
  entityType: string;
  entityId?: string;
  geometryType: string;
  geometry: Record<string, unknown>;
  radiusM?: number;
  alertOnEnter?: boolean;
  alertOnExit?: boolean;
  linkedPolicies?: unknown[];
}

@Injectable()
export class GeofenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gisEvents: GisEventEmitter,
  ) {}

  findAll(organizationId: string) {
    return this.prisma.gisGeofenceDefinition.findMany({
      where: { organizationId, status: 'active' },
      orderBy: { geofenceName: 'asc' },
    });
  }

  async create(organizationId: string, userId: string, dto: CreateGeofenceDto) {
    const exists = await this.prisma.gisGeofenceDefinition.findFirst({
      where: { organizationId, geofenceCode: dto.geofenceCode },
    });
    if (exists) throw new ConflictException('geofenceCode ya existe');

    return this.prisma.gisGeofenceDefinition.create({
      data: {
        organizationId,
        geofenceCode: dto.geofenceCode,
        geofenceName: dto.geofenceName,
        entityType: dto.entityType,
        entityId: dto.entityId ?? null,
        geometryType: dto.geometryType,
        geometry: dto.geometry as Prisma.InputJsonValue,
        radiusM: dto.radiusM ?? null,
        alertOnEnter: dto.alertOnEnter ?? true,
        alertOnExit: dto.alertOnExit ?? true,
        linkedPolicies: (dto.linkedPolicies ?? []) as Prisma.InputJsonValue,
        createdBy: userId,
      },
    });
  }

  async checkPoint(
    organizationId: string,
    lat: number,
    lng: number,
    entityType?: string,
    entityId?: string,
    ctx?: Partial<RequestContext>,
  ) {
    const geofences = await this.prisma.gisGeofenceDefinition.findMany({
      where: {
        organizationId,
        status: 'active',
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
      },
    });

    const results = geofences.map((g) => {
      let inside = false;
      if (g.geometryType === 'Circle' && g.radiusM != null) {
        const center = g.geometry as { center?: { lat: number; lng: number }; coordinates?: number[] };
        const centerLat = center.center?.lat ?? center.coordinates?.[1];
        const centerLng = center.center?.lng ?? center.coordinates?.[0];
        if (centerLat != null && centerLng != null) {
          inside = pointInCircle(lat, lng, centerLat, centerLng, Number(g.radiusM));
        }
      } else {
        inside = pointInGeometry(lng, lat, g.geometry as GeoJsonGeometry);
      }
      return {
        geofenceId: g.id,
        geofenceCode: g.geofenceCode,
        geofenceName: g.geofenceName,
        inside,
        entityType: g.entityType,
        entityId: g.entityId,
      };
    });

    const violations = results.filter((r) => !r.inside);
    if (violations.length > 0 && entityId) {
      for (const v of violations) {
        await this.gisEvents.geofenceViolation(
          organizationId,
          v.geofenceId,
          { lat, lng, entityType, entityId },
          ctx,
        );
      }
    }

    return { lat, lng, geofences: results, allInside: violations.length === 0 };
  }

  async evaluateTransition(
    organizationId: string,
    userId: string | undefined,
    deviceId: string | undefined,
    lat: number,
    lng: number,
    previousInsideIds: string[],
    ctx?: Partial<RequestContext>,
  ) {
    const check = await this.checkPoint(organizationId, lat, lng, undefined, undefined, ctx);
    const currentInside = check.geofences.filter((g) => g.inside).map((g) => g.geofenceId);
    const entered = currentInside.filter((id) => !previousInsideIds.includes(id));
    const exited = previousInsideIds.filter((id) => !currentInside.includes(id));

    for (const geofenceId of entered) {
      const geoEvent = await this.prisma.gisGeoEvent.create({
        data: {
          organizationId,
          geofenceId,
          eventType: 'geofence_enter',
          userId: userId ?? null,
          deviceId: deviceId ?? null,
          location: { type: 'Point', coordinates: [lng, lat] },
        },
      });
      await this.gisEvents.geofenceEntered(organizationId, geofenceId, { lat, lng, eventId: geoEvent.id }, ctx);
    }

    for (const geofenceId of exited) {
      const geoEvent = await this.prisma.gisGeoEvent.create({
        data: {
          organizationId,
          geofenceId,
          eventType: 'geofence_exit',
          userId: userId ?? null,
          deviceId: deviceId ?? null,
          location: { type: 'Point', coordinates: [lng, lat] },
        },
      });
      await this.gisEvents.geofenceExited(organizationId, geofenceId, { lat, lng, eventId: geoEvent.id }, ctx);
    }

    return { entered, exited, currentInside };
  }

  async findById(organizationId: string, id: string) {
    const g = await this.prisma.gisGeofenceDefinition.findFirst({
      where: { id, organizationId },
    });
    if (!g) throw new NotFoundException('Geocerca no encontrada');
    return g;
  }
}
