import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  nearestNeighborRoute,
  routeTotalDistanceKm,
  toFeatureCollection,
} from '@/shared/spatial/geometry.util';
import { GisEventEmitter } from './gis-event-emitter.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';

export interface RouteStopInput {
  stopName: string;
  lat: number;
  lng: number;
  entityType?: string;
  entityId?: string;
  eta?: string;
}

export interface CreateRouteDto {
  routeCode: string;
  routeName: string;
  stops: RouteStopInput[];
}

@Injectable()
export class RoutePlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gisEvents: GisEventEmitter,
  ) {}

  findAll(organizationId: string) {
    return this.prisma.gisRoutePlan.findMany({
      where: { organizationId },
      include: { stops: { orderBy: { sequence: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(organizationId: string, id: string) {
    const route = await this.prisma.gisRoutePlan.findFirst({
      where: { id, organizationId },
      include: { stops: { orderBy: { sequence: 'asc' } } },
    });
    if (!route) throw new NotFoundException('Ruta no encontrada');
    return route;
  }

  async create(organizationId: string, userId: string, dto: CreateRouteDto, ctx?: Partial<RequestContext>) {
    const exists = await this.prisma.gisRoutePlan.findFirst({
      where: { organizationId, routeCode: dto.routeCode },
    });
    if (exists) throw new ConflictException('routeCode ya existe');

    const optimized = nearestNeighborRoute(
      dto.stops.map((s, i) => ({
        id: s.entityId ?? `stop-${i}`,
        name: s.stopName,
        lat: s.lat,
        lng: s.lng,
      })),
    );

    const totalDistanceKm = routeTotalDistanceKm(optimized);
    const estimatedMinutes = Math.ceil((totalDistanceKm / 40) * 60);

    const routeGeometry = toFeatureCollection(
      optimized.map((s, idx) => ({
        geometry: { type: 'Point', coordinates: [s.lng, s.lat] } as const,
        properties: { sequence: idx + 1, name: s.name },
      })),
    );

    const route = await this.prisma.gisRoutePlan.create({
      data: {
        organizationId,
        routeCode: dto.routeCode,
        routeName: dto.routeName,
        totalDistanceKm,
        estimatedMinutes,
        routeGeometry: routeGeometry as unknown as Prisma.InputJsonValue,
        createdBy: userId,
        stops: {
          create: optimized.map((s, idx) => {
            const original = dto.stops.find((st) => st.stopName === s.name) ?? dto.stops[idx];
            return {
              sequence: idx + 1,
              stopName: s.name,
              entityType: original?.entityType ?? null,
              entityId: original?.entityId ?? null,
              location: { type: 'Point', coordinates: [s.lng, s.lat] },
              eta: original?.eta ? new Date(original.eta) : null,
            };
          }),
        },
      },
      include: { stops: { orderBy: { sequence: 'asc' } } },
    });

    await this.gisEvents.routeCreated(organizationId, route.id, { routeCode: route.routeCode, totalDistanceKm }, ctx);
    return route;
  }

  async optimize(organizationId: string, stops: RouteStopInput[]) {
    const optimized = nearestNeighborRoute(
      stops.map((s, i) => ({
        id: s.entityId ?? `stop-${i}`,
        name: s.stopName,
        lat: s.lat,
        lng: s.lng,
      })),
    );
    const totalDistanceKm = routeTotalDistanceKm(optimized);
    return {
      stops: optimized.map((s, idx) => ({
        sequence: idx + 1,
        stopName: s.name,
        lat: s.lat,
        lng: s.lng,
      })),
      totalDistanceKm,
      estimatedMinutes: Math.ceil((totalDistanceKm / 40) * 60),
    };
  }

  async approve(organizationId: string, id: string, userId: string, ctx?: Partial<RequestContext>) {
    const route = await this.prisma.gisRoutePlan.update({
      where: { id },
      data: { status: 'approved', approvedBy: userId, approvedAt: new Date() },
      include: { stops: { orderBy: { sequence: 'asc' } } },
    });
    await this.gisEvents.routeApproved(organizationId, id, { routeCode: route.routeCode }, ctx);
    return route;
  }

  exportGpx(organizationId: string, id: string) {
    return this.findById(organizationId, id).then((route) => {
      const points = route.stops
        .map(
          (s) => {
            const loc = s.location as { coordinates: [number, number] };
            return `    <wpt lat="${loc.coordinates[1]}" lon="${loc.coordinates[0]}"><name>${s.stopName}</name></wpt>`;
          },
        )
        .join('\n');
      return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1">\n${points}\n</gpx>`;
    });
  }
}
