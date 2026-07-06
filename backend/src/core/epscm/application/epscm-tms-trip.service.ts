import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EpscmTmsTripStatus } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEpscmTmsKey } from '../domain/epscm-tms-routing.engine';
import { EpscmAuditService } from './epscm-audit.service';
import { EpscmTmsDeliveryService } from './epscm-tms-delivery.service';
import { EpscmTmsIntegrationService } from './epscm-tms-integration.service';

@Injectable()
export class EpscmTmsTripService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EpscmAuditService,
    private readonly delivery: EpscmTmsDeliveryService,
    private readonly integration: EpscmTmsIntegrationService,
  ) {}

  list(organizationId: string, status?: EpscmTmsTripStatus) {
    return this.prisma.epscmTmsTrip.findMany({
      where: { organizationId, ...(status ? { status } : {}) },
      include: { vehicle: true, driver: true, route: true, orders: true, incidents: true },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async get(organizationId: string, tripKey: string) {
    const t = await this.prisma.epscmTmsTrip.findFirst({
      where: { organizationId, tripKey },
      include: {
        vehicle: true,
        driver: true,
        route: { include: { stops: { orderBy: { sequence: 'asc' } } } },
        orders: true,
        deliveries: true,
        incidents: true,
        costs: true,
      },
    });
    if (!t) throw new NotFoundException('Trip not found');
    return t;
  }

  async schedule(organizationId: string, userId: string, routeKey?: string, scheduledAt?: Date) {
    const seq = await this.prisma.epscmTmsTrip.count({ where: { organizationId } });
    const trip = await this.prisma.epscmTmsTrip.create({
      data: {
        organizationId,
        tripKey: generateEpscmTmsKey('TRP', seq + 1),
        routeKey,
        status: 'scheduled',
        scheduledAt: scheduledAt ?? new Date(),
      },
    });
    await this.integration.onTripScheduled(organizationId, trip.tripKey);
    await this.audit.log(organizationId, 'EpscmTmsTrip', trip.tripKey, 'created', userId);
    return trip;
  }

  async assignVehicle(organizationId: string, userId: string, tripKey: string, vehicleKey: string) {
    const trip = await this.get(organizationId, tripKey);
    await this.prisma.epscmTmsVehicle.updateMany({
      where: { organizationId, vehicleKey },
      data: { status: 'in_use' },
    });
    return this.prisma.epscmTmsTrip.update({
      where: { id: trip.id },
      data: { vehicleKey, status: trip.status === 'scheduled' ? 'assigned' : trip.status },
    });
  }

  async assignDriver(organizationId: string, userId: string, tripKey: string, driverKey: string) {
    const trip = await this.get(organizationId, tripKey);
    await this.prisma.epscmTmsDriver.updateMany({
      where: { organizationId, driverKey },
      data: { status: 'assigned' },
    });
    return this.prisma.epscmTmsTrip.update({
      where: { id: trip.id },
      data: { driverKey, status: trip.status === 'scheduled' ? 'assigned' : trip.status },
    });
  }

  async assignOrders(organizationId: string, userId: string, tripKey: string, orderKeys: string[]) {
    const trip = await this.get(organizationId, tripKey);
    for (const orderKey of orderKeys) {
      const dispatch = await this.prisma.epscmWmsDispatch.findFirst({
        where: { organizationId, orderKey },
        orderBy: { createdAt: 'desc' },
      });
      const aseq = await this.prisma.epscmTmsTripOrder.count({ where: { organizationId } });
      await this.prisma.epscmTmsTripOrder.create({
        data: {
          organizationId,
          assignmentKey: generateEpscmTmsKey('ASG', aseq + 1),
          tripKey,
          orderKey,
          dispatchKey: dispatch?.dispatchKey,
        },
      });
      const order = await this.prisma.escmSalesOrder.findFirst({ where: { organizationId, orderKey } });
      await this.delivery.createForOrder(organizationId, userId, tripKey, orderKey, order?.customerKey);
    }
    return this.get(organizationId, trip.tripKey);
  }

  async start(organizationId: string, userId: string, tripKey: string) {
    const trip = await this.get(organizationId, tripKey);
    if (!['assigned', 'scheduled'].includes(trip.status)) {
      throw new BadRequestException('Trip cannot be started');
    }
    const updated = await this.prisma.epscmTmsTrip.update({
      where: { id: trip.id },
      data: { status: 'in_progress', startedAt: new Date() },
    });
    if (trip.driverKey) {
      await this.prisma.epscmTmsDriver.updateMany({
        where: { organizationId, driverKey: trip.driverKey },
        data: { status: 'on_trip' },
      });
    }
    await this.integration.onTripStarted(organizationId, tripKey);
    await this.audit.log(organizationId, 'EpscmTmsTrip', tripKey, 'tms_trip_started', userId);
    return updated;
  }

  async recordIncident(organizationId: string, userId: string, tripKey: string, incidentType: string, description: string) {
    const trip = await this.get(organizationId, tripKey);
    const seq = await this.prisma.epscmTmsIncident.count({ where: { organizationId } });
    const incident = await this.prisma.epscmTmsIncident.create({
      data: {
        organizationId,
        incidentKey: generateEpscmTmsKey('INC', seq + 1),
        tripKey,
        incidentType,
        description,
        reportedBy: userId,
      },
    });
    await this.prisma.epscmTmsTrip.update({
      where: { id: trip.id },
      data: { status: 'incident' },
    });
    await this.integration.onIncidentRecorded(organizationId, incident.incidentKey, tripKey);
    await this.audit.log(organizationId, 'EpscmTmsIncident', incident.incidentKey, 'tms_incident_recorded', userId);
    return incident;
  }

  async close(organizationId: string, userId: string, tripKey: string, observations?: string) {
    const trip = await this.get(organizationId, tripKey);
    const updated = await this.prisma.epscmTmsTrip.update({
      where: { id: trip.id },
      data: { status: 'completed', closedAt: new Date(), observations },
    });
    if (trip.vehicleKey) {
      await this.prisma.epscmTmsVehicle.updateMany({
        where: { organizationId, vehicleKey: trip.vehicleKey },
        data: { status: 'available' },
      });
    }
    if (trip.driverKey) {
      await this.prisma.epscmTmsDriver.updateMany({
        where: { organizationId, driverKey: trip.driverKey },
        data: { status: 'available' },
      });
    }
    await this.integration.onTripClosed(organizationId, tripKey);
    await this.audit.log(organizationId, 'EpscmTmsTrip', tripKey, 'tms_trip_closed', userId);
    return updated;
  }

  async acceptRoute(organizationId: string, userId: string, tripKey: string) {
    const trip = await this.get(organizationId, tripKey);
    if (trip.status !== 'scheduled') throw new BadRequestException('Trip not available to accept');
    return this.prisma.epscmTmsTrip.update({
      where: { id: trip.id },
      data: { status: 'assigned', metadata: { ...(trip.metadata as object), acceptedBy: userId, acceptedAt: new Date().toISOString() } as object },
    });
  }
}
