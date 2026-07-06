import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EpscmTmsOptimizationMode, EpscmTmsRouteStatus } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  computeRouteTotals,
  generateEpscmTmsKey,
  groupDeliveriesByProximity,
  optimizeByCapacity,
  optimizeByDistance,
  optimizeByTime,
  TmsStopInput,
  validateTimeWindows,
} from '../domain/epscm-tms-routing.engine';
import { EpscmAuditService } from './epscm-audit.service';
import { EpscmTmsIntegrationService } from './epscm-tms-integration.service';

@Injectable()
export class EpscmTmsRouteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EpscmAuditService,
    private readonly integration: EpscmTmsIntegrationService,
  ) {}

  list(organizationId: string, status?: EpscmTmsRouteStatus) {
    return this.prisma.epscmTmsRoute.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      include: { stops: { orderBy: { sequence: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(organizationId: string, routeKey: string) {
    const r = await this.prisma.epscmTmsRoute.findFirst({
      where: { organizationId, routeKey },
      include: { stops: { orderBy: { sequence: 'asc' } } },
    });
    if (!r) throw new NotFoundException('Route not found');
    return r;
  }

  async create(
    organizationId: string,
    userId: string,
    input: { code: string; name: string; scheduledDate?: Date; optimizationMode?: EpscmTmsOptimizationMode },
  ) {
    const seq = await this.prisma.epscmTmsRoute.count({ where: { organizationId } });
    const route = await this.prisma.epscmTmsRoute.create({
      data: {
        organizationId,
        routeKey: generateEpscmTmsKey('RTE', seq + 1),
        code: input.code,
        name: input.name,
        scheduledDate: input.scheduledDate,
        optimizationMode: input.optimizationMode ?? 'manual',
        status: 'draft',
      },
    });
    await this.audit.log(organizationId, 'EpscmTmsRoute', route.routeKey, 'created', userId);
    return route;
  }

  async addStop(
    organizationId: string,
    userId: string,
    routeKey: string,
    input: {
      orderKey?: string;
      customerKey?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      windowStart?: Date;
      windowEnd?: Date;
      weight?: number;
      volume?: number;
    },
  ) {
    const route = await this.get(organizationId, routeKey);
    const seq = await this.prisma.epscmTmsRouteStop.count({ where: { organizationId, routeKey } });
    const stop = await this.prisma.epscmTmsRouteStop.create({
      data: {
        organizationId,
        stopKey: generateEpscmTmsKey('STP', seq + 1),
        routeKey,
        sequence: seq + 1,
        orderKey: input.orderKey,
        customerKey: input.customerKey,
        address: input.address,
        latitude: input.latitude,
        longitude: input.longitude,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        weight: input.weight ?? 0,
        volume: input.volume ?? 0,
      },
    });
    await this.audit.log(organizationId, 'EpscmTmsRouteStop', stop.stopKey, 'created', userId);
    return this.get(organizationId, route.routeKey);
  }

  async optimize(
    organizationId: string,
    userId: string,
    routeKey: string,
    mode: EpscmTmsOptimizationMode,
    maxWeight = 0,
    maxVolume = 0,
  ) {
    const route = await this.get(organizationId, routeKey);
    const stops: TmsStopInput[] = route.stops.map((s) => ({
      stopKey: s.stopKey,
      latitude: s.latitude,
      longitude: s.longitude,
      weight: s.weight,
      volume: s.volume,
      windowStart: s.windowStart,
      windowEnd: s.windowEnd,
      sequence: s.sequence,
    }));

    let optimized: TmsStopInput[];
    if (mode === 'time') optimized = optimizeByTime(stops);
    else if (mode === 'capacity') {
      const cap = optimizeByCapacity(stops, maxWeight, maxVolume);
      if (!cap.feasible) throw new BadRequestException('Capacity exceeded for route');
      optimized = cap.stops;
    } else optimized = optimizeByDistance(stops);

    for (const s of optimized) {
      await this.prisma.epscmTmsRouteStop.updateMany({
        where: { organizationId, stopKey: s.stopKey },
        data: { sequence: s.sequence ?? 0 },
      });
    }

    const totals = computeRouteTotals(optimized);
    const updated = await this.prisma.epscmTmsRoute.update({
      where: { id: route.id },
      data: {
        optimizationMode: mode,
        status: 'optimized',
        totalDistance: totals.distanceKm,
        totalDuration: totals.durationMin,
      },
      include: { stops: { orderBy: { sequence: 'asc' } } },
    });
    await this.integration.onRouteOptimized(organizationId, routeKey, mode);
    await this.audit.log(organizationId, 'EpscmTmsRoute', routeKey, 'tms_route_changed', userId, { mode });
    return updated;
  }

  async autoGenerateFromOrders(organizationId: string, userId: string, orderKeys: string[]) {
    const route = await this.create(organizationId, userId, {
      code: `AUTO-${Date.now()}`,
      name: 'Ruta automática',
      optimizationMode: 'distance',
    });

    for (const orderKey of orderKeys) {
      const order = await this.prisma.escmSalesOrder.findFirst({
        where: { organizationId, orderKey },
      });
      await this.addStop(organizationId, userId, route.routeKey, {
        orderKey,
        customerKey: order?.customerKey,
        weight: 100,
        volume: 1,
      });
    }
    return this.optimize(organizationId, userId, route.routeKey, 'distance');
  }

  async reschedule(organizationId: string, userId: string, routeKey: string, scheduledDate: Date) {
    const route = await this.get(organizationId, routeKey);
    const updated = await this.prisma.epscmTmsRoute.update({
      where: { id: route.id },
      data: { scheduledDate, status: 'planned' },
    });
    await this.audit.log(organizationId, 'EpscmTmsRoute', routeKey, 'tms_route_changed', userId, { rescheduled: true });
    return updated;
  }

  groupingPreview(organizationId: string, routeKey: string) {
    return this.get(organizationId, routeKey).then((route) => {
      const stops: TmsStopInput[] = route.stops.map((s) => ({
        stopKey: s.stopKey,
        latitude: s.latitude,
        longitude: s.longitude,
      }));
      return groupDeliveriesByProximity(stops);
    });
  }

  validateWindows(organizationId: string, routeKey: string, startTime: Date) {
    return this.get(organizationId, routeKey).then((route) => {
      const stops: TmsStopInput[] = route.stops.map((s) => ({
        stopKey: s.stopKey,
        windowStart: s.windowStart,
        windowEnd: s.windowEnd,
      }));
      return { valid: validateTimeWindows(stops, startTime) };
    });
  }
}
