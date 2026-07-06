import { Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EscmAuditService } from './escm-audit.service';
import { EscmTransportService } from './escm-transport.service';
import {
  estimateEtaMinutes,
  generateLogisticsDocumentKey,
  generateRouteKey,
} from '../domain/escm-logistics.engine';

@Injectable()
export class EscmLogisticsDocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: EscmAuditService,
  ) {}

  list(organizationId: string, dispatchKey?: string) {
    return this.prisma.escmLogisticsDocument.findMany({
      where: {
        organizationId,
        ...(dispatchKey ? { dispatch: { dispatchKey } } : {}),
      },
      orderBy: { generatedAt: 'desc' },
      take: 200,
    });
  }

  async generateDispatchNote(organizationId: string, userId: string, dispatchKey: string) {
    const dispatch = await this.prisma.escmDispatch.findFirst({
      where: { organizationId, dispatchKey },
      include: { lines: true, order: { include: { customer: true } } },
    });
    if (!dispatch) throw new NotFoundException(`Despacho ${dispatchKey} no encontrado`);

    const count = await this.prisma.escmLogisticsDocument.count({ where: { organizationId } });
    const documentKey = generateLogisticsDocumentKey('DSP', count + 1);
    const content = {
      dispatchKey,
      orderKey: dispatch.orderKey,
      customerKey: dispatch.customerKey,
      customerName: dispatch.order.customer.legalName,
      warehouseKey: dispatch.warehouseKey,
      lines: dispatch.lines,
      dispatchedAt: new Date().toISOString(),
    };

    const doc = await this.prisma.escmLogisticsDocument.create({
      data: {
        organizationId,
        documentKey,
        documentType: 'dispatch_note',
        dispatchId: dispatch.id,
        orderKey: dispatch.orderKey,
        content,
        generatedBy: userId,
      },
    });

    await this.prisma.escmDispatch.update({
      where: { id: dispatch.id },
      data: { documentKey },
    });

    await this.audit.log(organizationId, 'LogisticsDocument', documentKey, 'generated', userId, {
      dispatchKey,
      documentType: 'dispatch_note',
    });
    return doc;
  }

  async generatePackingList(organizationId: string, userId: string, dispatchKey: string) {
    const dispatch = await this.prisma.escmDispatch.findFirst({
      where: { organizationId, dispatchKey },
      include: { packings: { include: { lines: true } }, lines: true },
    });
    if (!dispatch) throw new NotFoundException(`Despacho ${dispatchKey} no encontrado`);

    const count = await this.prisma.escmLogisticsDocument.count({ where: { organizationId } });
    const documentKey = generateLogisticsDocumentKey('PKG', count + 1);
    return this.prisma.escmLogisticsDocument.create({
      data: {
        organizationId,
        documentKey,
        documentType: 'packing_list',
        dispatchId: dispatch.id,
        orderKey: dispatch.orderKey,
        content: {
          dispatchKey,
          packings: dispatch.packings,
          lines: dispatch.lines,
        },
        generatedBy: userId,
      },
    });
  }

  async generateDeliveryNote(organizationId: string, userId: string, deliveryKey: string) {
    const delivery = await this.prisma.escmDelivery.findFirst({
      where: { organizationId, deliveryKey },
      include: { lines: true, proofs: true, dispatch: true },
    });
    if (!delivery) throw new NotFoundException(`Entrega ${deliveryKey} no encontrada`);

    const count = await this.prisma.escmLogisticsDocument.count({ where: { organizationId } });
    const documentKey = generateLogisticsDocumentKey('DLV', count + 1);
    return this.prisma.escmLogisticsDocument.create({
      data: {
        organizationId,
        documentKey,
        documentType: 'delivery_note',
        dispatchId: delivery.dispatchId,
        orderKey: delivery.orderKey,
        content: { deliveryKey, outcome: delivery.outcome, lines: delivery.lines, proofs: delivery.proofs },
        generatedBy: userId,
      },
    });
  }
}

@Injectable()
export class EscmRouteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EscmAuditService,
    private readonly transport: EscmTransportService,
  ) {}

  list(organizationId: string, status?: string) {
    return this.prisma.escmLogisticsRoute.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as never } : {}),
      },
      include: {
        stops: { orderBy: { sequence: 'asc' } },
        vehicle: true,
        driver: true,
        carrier: true,
        _count: { select: { dispatches: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getOne(organizationId: string, routeKey: string) {
    const row = await this.prisma.escmLogisticsRoute.findFirst({
      where: { organizationId, routeKey },
      include: {
        stops: { orderBy: { sequence: 'asc' } },
        dispatches: true,
        incidents: true,
        vehicle: true,
        driver: true,
        carrier: true,
      },
    });
    if (!row) throw new NotFoundException(`Ruta ${routeKey} no encontrada`);
    return row;
  }

  async create(
    organizationId: string,
    userId: string,
    input: {
      dispatchKeys: string[];
      scheduledDate?: string;
      carrierKey?: string;
      vehicleKey?: string;
      driverKey?: string;
      autoAssign?: boolean;
    },
  ) {
    const dispatches = await this.prisma.escmDispatch.findMany({
      where: { organizationId, dispatchKey: { in: input.dispatchKeys } },
      include: { order: { include: { customer: { include: { addresses: { where: { isActive: true } } } } } } },
    });
    if (!dispatches.length) throw new NotFoundException('Despachos no encontrados');

    const loadKg = dispatches.reduce((s, d) => s + d.loadUsedKg, 0);
    let vehicleKey = input.vehicleKey;
    let driverKey = input.driverKey;
    let carrierKey = input.carrierKey;

    if (input.autoAssign) {
      const assigned = await this.transport.autoAssign(organizationId, loadKg);
      if (assigned) {
        vehicleKey = assigned.vehicle.vehicleKey;
        driverKey = assigned.driver?.driverKey;
        carrierKey = assigned.carrierKey ?? undefined;
      }
    }

    let vehicleId: string | undefined;
    let driverId: string | undefined;
    let carrierId: string | undefined;
    let capacityKg = 0;
    if (vehicleKey) {
      const v = await this.prisma.escmVehicle.findFirst({ where: { organizationId, vehicleKey } });
      vehicleId = v?.id;
      capacityKg = v?.capacityKg ?? 0;
      carrierId = v?.carrierId ?? undefined;
      carrierKey = v?.carrierKey ?? carrierKey;
    }
    if (driverKey) {
      const d = await this.prisma.escmDriver.findFirst({ where: { organizationId, driverKey } });
      driverId = d?.id;
    }
    if (carrierKey && !carrierId) {
      const c = await this.prisma.escmCarrier.findFirst({ where: { organizationId, carrierKey } });
      carrierId = c?.id;
    }

    const count = await this.prisma.escmLogisticsRoute.count({ where: { organizationId } });
    const routeKey = generateRouteKey(count + 1);

    const stops = [];
    let seq = 0;
    let totalDistance = 0;
    let prevLat: number | null = null;
    let prevLng: number | null = null;

    for (const dispatch of dispatches) {
      const addr =
        dispatch.order.customer.addresses.find((a) => a.addressType === 'delivery' || a.isPrimary) ??
        dispatch.order.customer.addresses[0];
      const lat = addr?.latitude ?? 4.6097;
      const lng = addr?.longitude ?? -74.0817;
      if (prevLat != null && prevLng != null) {
        const dlat = lat - prevLat;
        const dlng = lng - prevLng;
        totalDistance += Math.sqrt(dlat * dlat + dlng * dlng) * 111;
      }
      prevLat = lat;
      prevLng = lng;
      seq += 1;
      stops.push({
        stopKey: `ST${seq}`,
        sequence: seq,
        dispatchId: dispatch.id,
        orderKey: dispatch.orderKey,
        customerKey: dispatch.customerKey,
        addressKey: addr?.addressKey,
        latitude: lat,
        longitude: lng,
        eta: input.scheduledDate ? new Date(input.scheduledDate) : undefined,
      });
    }

    const estimatedMinutes = estimateEtaMinutes(totalDistance);
    const route = await this.prisma.escmLogisticsRoute.create({
      data: {
        organizationId,
        routeKey,
        status: vehicleId ? 'assigned' : 'planned',
        carrierId,
        carrierKey,
        vehicleId,
        vehicleKey,
        driverId,
        driverKey,
        totalDistanceKm: Number(totalDistance.toFixed(2)),
        estimatedMinutes,
        capacityKg,
        loadUsedKg: loadKg,
        scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : undefined,
        createdBy: userId,
        stops: { create: stops },
      },
      include: { stops: true },
    });

    await this.prisma.escmDispatch.updateMany({
      where: { id: { in: dispatches.map((d) => d.id) } },
      data: { routeId: route.id, status: 'scheduled' },
    });

    await this.audit.log(organizationId, 'LogisticsRoute', routeKey, 'created', userId, {
      dispatchKeys: input.dispatchKeys,
      stopCount: stops.length,
    });
    await this.core.emitUserAction(organizationId, 'EscmLogisticsRoute', route.id, EVENT_TYPES.ESCM_ROUTE_CREATED, {
      routeKey,
    });
    return this.getOne(organizationId, routeKey);
  }

  async startRoute(organizationId: string, userId: string, routeKey: string) {
    const route = await this.getOne(organizationId, routeKey);
    const updated = await this.prisma.escmLogisticsRoute.update({
      where: { id: route.id },
      data: { status: 'in_transit', startedAt: new Date() },
    });
    await this.prisma.escmDispatch.updateMany({
      where: { routeId: route.id },
      data: { status: 'in_transit' },
    });
    await this.audit.log(organizationId, 'LogisticsRoute', routeKey, 'started', userId, {});
    return updated;
  }

  async updateVehicleLocation(
    organizationId: string,
    routeKey: string,
    lat: number,
    lng: number,
  ) {
    const route = await this.getOne(organizationId, routeKey);
    return this.prisma.escmLogisticsRoute.update({
      where: { id: route.id },
      data: { currentLat: lat, currentLng: lng },
    });
  }
}
