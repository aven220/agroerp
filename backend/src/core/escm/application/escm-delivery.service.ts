import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EscmAuditService } from './escm-audit.service';
import { EscmOrderService } from './escm-order.service';
import { EscmLogisticsDocumentService } from './escm-logistics-document.service';
import {
  generateDeliveryKey,
  resolveDeliveryOutcome,
} from '../domain/escm-logistics.engine';

@Injectable()
export class EscmDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EscmAuditService,
    private readonly orders: EscmOrderService,
    private readonly documents: EscmLogisticsDocumentService,
  ) {}

  list(organizationId: string, filters?: { orderKey?: string; outcome?: string }) {
    return this.prisma.escmDelivery.findMany({
      where: {
        organizationId,
        ...(filters?.orderKey ? { orderKey: filters.orderKey } : {}),
        ...(filters?.outcome ? { outcome: filters.outcome as never } : {}),
      },
      include: { proofs: true, dispatch: true, _count: { select: { lines: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async getOne(organizationId: string, deliveryKey: string) {
    const row = await this.prisma.escmDelivery.findFirst({
      where: { organizationId, deliveryKey },
      include: {
        lines: true,
        proofs: true,
        dispatch: { include: { lines: true, order: true } },
      },
    });
    if (!row) throw new NotFoundException(`Entrega ${deliveryKey} no encontrada`);
    return row;
  }

  async register(
    organizationId: string,
    userId: string,
    dispatchKey: string,
    input: {
      outcome?: string;
      lines: Array<{
        itemKey: string;
        quantity: number;
        rejectedQty?: number;
        returnedQty?: number;
        lotKey?: string;
        serialKey?: string;
      }>;
      signatureUrl?: string;
      photoUrls?: string[];
      latitude?: number;
      longitude?: number;
      notes?: string;
    },
  ) {
    const dispatch = await this.prisma.escmDispatch.findFirst({
      where: { organizationId, dispatchKey },
      include: { lines: true },
    });
    if (!dispatch) throw new NotFoundException(`Despacho ${dispatchKey} no encontrado`);
    if (!['in_transit', 'partial'].includes(dispatch.status)) {
      throw new BadRequestException('El despacho debe estar en tránsito para registrar entrega');
    }

    const outcome = input.outcome ?? resolveDeliveryOutcome(input.lines);
    const count = await this.prisma.escmDelivery.count({ where: { organizationId } });
    const deliveryKey = generateDeliveryKey(count + 1);

    const delivery = await this.prisma.escmDelivery.create({
      data: {
        organizationId,
        deliveryKey,
        dispatchId: dispatch.id,
        orderKey: dispatch.orderKey,
        outcome: outcome as never,
        deliveredAt: new Date(),
        deliveredBy: userId,
        notes: input.notes,
        lines: {
          create: input.lines.map((l) => ({
            itemKey: l.itemKey,
            quantity: l.quantity,
            rejectedQty: l.rejectedQty ?? 0,
            returnedQty: l.returnedQty ?? 0,
            lotKey: l.lotKey,
            serialKey: l.serialKey,
          })),
        },
        proofs: {
          create: {
            signatureUrl: input.signatureUrl,
            photoUrls: input.photoUrls ?? [],
            latitude: input.latitude,
            longitude: input.longitude,
            capturedBy: userId,
            notes: input.notes,
          },
        },
      },
      include: { lines: true, proofs: true },
    });

    const allDelivered = outcome === 'complete';
    const dispatchStatus = allDelivered ? 'delivered' : outcome === 'partial' ? 'partial' : 'in_transit';

    await this.prisma.escmDispatch.update({
      where: { id: dispatch.id },
      data: {
        status: dispatchStatus,
        deliveredAt: allDelivered ? new Date() : dispatch.deliveredAt,
      },
    });

    if (allDelivered || outcome === 'partial') {
      await this.orders.transitionStatus(
        organizationId,
        userId,
        dispatch.orderKey,
        allDelivered ? 'delivered' : 'dispatched',
        `Entrega ${deliveryKey}`,
      );
    }

    await this.documents.generateDeliveryNote(organizationId, userId, deliveryKey);
    await this.audit.log(organizationId, 'Delivery', deliveryKey, 'registered', userId, {
      dispatchKey,
      outcome,
    });
    await this.core.emitUserAction(organizationId, 'EscmDelivery', delivery.id, EVENT_TYPES.ESCM_DELIVERY_CONFIRMED, {
      deliveryKey,
      dispatchKey,
      outcome,
    });
    return delivery;
  }

  async syncOfflineDeliveries(
    organizationId: string,
    userId: string,
    items: Array<{
      clientRef: string;
      dispatchKey: string;
      lines: Array<{ itemKey: string; quantity: number; rejectedQty?: number; returnedQty?: number }>;
      signatureUrl?: string;
      photoUrls?: string[];
      latitude?: number;
      longitude?: number;
      notes?: string;
    }>,
  ) {
    const results = [];
    for (const item of items) {
      try {
        const delivery = await this.register(organizationId, userId, item.dispatchKey, item);
        results.push({ clientRef: item.clientRef, deliveryKey: delivery.deliveryKey, status: 'synced' });
      } catch (err) {
        results.push({
          clientRef: item.clientRef,
          status: 'error',
          message: err instanceof Error ? err.message : 'Error',
        });
      }
    }
    return results;
  }
}

@Injectable()
export class EscmLogisticsIncidentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EscmAuditService,
  ) {}

  list(organizationId: string, status?: string) {
    return this.prisma.escmLogisticsIncident.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as never } : {}),
      },
      include: { dispatch: true, route: true },
      orderBy: { reportedAt: 'desc' },
      take: 200,
    });
  }

  async report(
    organizationId: string,
    userId: string,
    input: {
      dispatchKey?: string;
      routeKey?: string;
      incidentType: string;
      description: string;
      latitude?: number;
      longitude?: number;
    },
  ) {
    let dispatchId: string | undefined;
    let routeId: string | undefined;
    if (input.dispatchKey) {
      const d = await this.prisma.escmDispatch.findFirst({
        where: { organizationId, dispatchKey: input.dispatchKey },
      });
      dispatchId = d?.id;
    }
    if (input.routeKey) {
      const r = await this.prisma.escmLogisticsRoute.findFirst({
        where: { organizationId, routeKey: input.routeKey },
      });
      routeId = r?.id;
    }

    const count = await this.prisma.escmLogisticsIncident.count({ where: { organizationId } });
    const incidentKey = `INC-${String(count + 1).padStart(6, '0')}`;

    const incident = await this.prisma.escmLogisticsIncident.create({
      data: {
        organizationId,
        incidentKey,
        dispatchId,
        routeId,
        incidentType: input.incidentType,
        description: input.description,
        latitude: input.latitude,
        longitude: input.longitude,
        reportedBy: userId,
      },
    });

    await this.audit.log(organizationId, 'LogisticsIncident', incidentKey, 'reported', userId, input);
    await this.core.emitUserAction(organizationId, 'EscmLogisticsIncident', incident.id, EVENT_TYPES.ESCM_LOGISTICS_INCIDENT, {
      incidentKey,
      incidentType: input.incidentType,
    });
    return incident;
  }

  async resolve(
    organizationId: string,
    userId: string,
    incidentKey: string,
    resolution: string,
  ) {
    const incident = await this.prisma.escmLogisticsIncident.findFirst({
      where: { organizationId, incidentKey },
    });
    if (!incident) throw new NotFoundException(`Incidencia ${incidentKey} no encontrada`);

    const updated = await this.prisma.escmLogisticsIncident.update({
      where: { id: incident.id },
      data: {
        status: 'resolved',
        resolution,
        resolvedAt: new Date(),
        resolvedBy: userId,
      },
    });
    await this.audit.log(organizationId, 'LogisticsIncident', incidentKey, 'resolved', userId, { resolution });
    return updated;
  }
}

@Injectable()
export class EscmLogisticsCenterService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(organizationId: string) {
    const statuses = ['draft', 'picking', 'packing', 'ready', 'in_transit', 'delivered', 'partial'] as const;
    const [dispatchCounts, routeCounts, openIncidents, recentDeliveries, pendingOrders] = await Promise.all([
      Promise.all(
        statuses.map((s) =>
          this.prisma.escmDispatch.count({ where: { organizationId, status: s } }),
        ),
      ),
      this.prisma.escmLogisticsRoute.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { _all: true },
      }),
      this.prisma.escmLogisticsIncident.count({
        where: { organizationId, status: { in: ['open', 'in_progress'] } },
      }),
      this.prisma.escmDelivery.findMany({
        where: { organizationId },
        orderBy: { deliveredAt: 'desc' },
        take: 10,
        include: { dispatch: true },
      }),
      this.prisma.escmSalesOrder.count({
        where: { organizationId, status: { in: ['ready_for_dispatch', 'in_preparation', 'reserved'] } },
      }),
    ]);

    return {
      dispatchesByStatus: Object.fromEntries(statuses.map((s, i) => [s, dispatchCounts[i]])),
      routesByStatus: Object.fromEntries(routeCounts.map((r) => [r.status, r._count._all])),
      openIncidents,
      pendingOrders,
      recentDeliveries,
      activeRoutes: routeCounts.find((r) => r.status === 'in_transit')?._count._all ?? 0,
    };
  }
}
