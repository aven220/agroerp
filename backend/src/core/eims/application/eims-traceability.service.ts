import { Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import {
  buildGenealogyTree,
  collectAncestryKeys,
  generateTraceEventKey,
  type EimsTraceStage,
} from '../domain/eims-traceability.engine';

@Injectable()
export class EimsTraceabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
  ) {}

  async record(
    organizationId: string,
    input: {
      lotKey: string;
      stockLotId?: string;
      stage: EimsTraceStage | string;
      eventType: string;
      title: string;
      description?: string;
      actorId?: string;
      warehouseKey?: string;
      documentKey?: string;
      payload?: Record<string, unknown>;
      occurredAt?: Date;
    },
  ) {
    const count = await this.prisma.eimsLotTraceEvent.count({
      where: { organizationId, lotKey: input.lotKey },
    });
    const eventKey = generateTraceEventKey(input.lotKey, input.stage, count + 1);
    const row = await this.prisma.eimsLotTraceEvent.create({
      data: {
        organizationId,
        stockLotId: input.stockLotId,
        lotKey: input.lotKey,
        eventKey,
        stage: input.stage,
        eventType: input.eventType,
        title: input.title,
        description: input.description,
        actorId: input.actorId,
        warehouseKey: input.warehouseKey,
        documentKey: input.documentKey,
        payload: (input.payload ?? {}) as object,
        occurredAt: input.occurredAt ?? new Date(),
      },
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsLotTraceEvent',
      row.id,
      EVENT_TYPES.EIMS_TRACE_RECORDED,
      { lotKey: input.lotKey, stage: input.stage, eventType: input.eventType },
    );
    return row;
  }

  timeline(organizationId: string, lotKey: string) {
    return this.prisma.eimsLotTraceEvent.findMany({
      where: { organizationId, lotKey },
      orderBy: { occurredAt: 'asc' },
    });
  }

  async genealogy(organizationId: string, lotKey: string) {
    const links = await this.prisma.eimsLotTransformation.findMany({
      where: { organizationId },
      select: {
        parentLotKey: true,
        childLotKey: true,
        transformType: true,
        quantity: true,
      },
      take: 5000,
    });
    return buildGenealogyTree(lotKey, links);
  }

  async movementMap(organizationId: string, lotKey: string) {
    const tree = await this.genealogy(organizationId, lotKey);
    const keys = collectAncestryKeys(tree);
    const movements = await this.prisma.eimsMovement.findMany({
      where: { organizationId, lotKey: { in: keys } },
      include: {
        item: { select: { itemKey: true, name: true } },
        fromWarehouse: { select: { warehouseKey: true, name: true } },
        toWarehouse: { select: { warehouseKey: true, name: true } },
        fromLocation: { select: { locationKey: true, name: true } },
        toLocation: { select: { locationKey: true, name: true } },
      },
      orderBy: { postedAt: 'asc' },
      take: 1000,
    });
    return {
      lotKey,
      relatedLots: keys,
      nodes: movements.map((m) => ({
        movementKey: m.movementKey,
        movementType: m.movementType,
        lotKey: m.lotKey,
        quantity: m.quantity,
        from: m.fromWarehouse?.warehouseKey ?? null,
        to: m.toWarehouse?.warehouseKey ?? null,
        fromLocation: m.fromLocation?.locationKey ?? null,
        toLocation: m.toLocation?.locationKey ?? null,
        postedAt: m.postedAt,
        documentKey: m.documentKey,
        status: m.status,
      })),
    };
  }

  async view360(organizationId: string, lotKey: string) {
    const lot = await this.prisma.eimsStockLot.findFirst({
      where: { organizationId, lotKey },
      include: {
        item: true,
        warehouse: true,
        location: true,
        serials: true,
        incidents: { orderBy: { createdAt: 'desc' }, take: 50 },
        expiryAlerts: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!lot) return null;

    const [timeline, genealogy, movementMap, transformations, coffeeTrace] = await Promise.all([
      this.timeline(organizationId, lotKey),
      this.genealogy(organizationId, lotKey),
      this.movementMap(organizationId, lotKey),
      this.prisma.eimsLotTransformation.findMany({
        where: {
          organizationId,
          OR: [{ parentLotKey: lotKey }, { childLotKey: lotKey }],
        },
        orderBy: { performedAt: 'asc' },
      }),
      this.loadCoffeeChain(organizationId, lot),
    ]);

    const documents = [
      ...timeline.filter((t) => t.documentKey).map((t) => t.documentKey),
      ...movementMap.nodes.filter((n) => n.documentKey).map((n) => n.documentKey),
    ].filter(Boolean);

    return {
      lot,
      timeline,
      genealogy,
      movementMap,
      transformations,
      serials: lot.serials,
      incidents: lot.incidents,
      expiryAlerts: lot.expiryAlerts,
      coffeeChain: coffeeTrace,
      documents: [...new Set(documents)],
      chain: this.buildChainSummary(lot, timeline, coffeeTrace),
    };
  }

  private async loadCoffeeChain(
    organizationId: string,
    lot: {
      sourceType: string | null;
      sourceRef: string | null;
      producerName: string | null;
      farmName: string | null;
      agriculturalLotCode: string | null;
    },
  ) {
    if (!lot.sourceRef) {
      return {
        producerName: lot.producerName,
        farmName: lot.farmName,
        agriculturalLotCode: lot.agriculturalLotCode,
        ticketKey: null,
        events: [] as unknown[],
      };
    }
    try {
      const ticket = await this.prisma.cpepReceptionTicket.findFirst({
        where: { organizationId, ticketKey: lot.sourceRef },
        include: {
          quality: true,
          settlement: true,
          weighings: { orderBy: { createdAt: 'asc' }, take: 10 },
        },
      });
      const events = ticket
        ? await this.prisma.cpepTraceEvent.findMany({
            where: { organizationId, ticketId: ticket.id },
            orderBy: { occurredAt: 'asc' },
            take: 200,
          })
        : [];
      return {
        producerName: ticket?.producerName ?? lot.producerName,
        farmName: ticket?.farmName ?? lot.farmName,
        agriculturalLotCode: ticket?.lotCode ?? lot.agriculturalLotCode,
        ticketKey: ticket?.ticketKey ?? lot.sourceRef,
        qualityGrade: ticket?.quality?.grade ?? null,
        settlementKey: ticket?.settlement?.settlementKey ?? null,
        weighings: ticket?.weighings ?? [],
        events,
      };
    } catch {
      return {
        producerName: lot.producerName,
        farmName: lot.farmName,
        agriculturalLotCode: lot.agriculturalLotCode,
        ticketKey: lot.sourceRef,
        events: [],
      };
    }
  }

  private buildChainSummary(
    lot: {
      producerName: string | null;
      farmName: string | null;
      agriculturalLotCode: string | null;
      sourceRef: string | null;
      customerName: string | null;
      lotKey: string;
    },
    timeline: Array<{ stage: string; title: string; occurredAt: Date }>,
    coffee: { producerName?: string | null; farmName?: string | null; ticketKey?: string | null },
  ) {
    return [
      { stage: 'producer', value: coffee.producerName ?? lot.producerName },
      { stage: 'farm', value: coffee.farmName ?? lot.farmName },
      { stage: 'agricultural_lot', value: lot.agriculturalLotCode },
      { stage: 'purchase', value: coffee.ticketKey ?? lot.sourceRef },
      { stage: 'inventory', value: lot.lotKey },
      { stage: 'customer', value: lot.customerName },
      {
        stage: 'events',
        value: timeline.length,
        last: timeline[timeline.length - 1]?.title ?? null,
      },
    ];
  }

  async seedCoffeeOriginTrace(
    organizationId: string,
    userId: string,
    lot: {
      id: string;
      lotKey: string;
      producerName?: string | null;
      farmName?: string | null;
      agriculturalLotCode?: string | null;
      sourceRef?: string | null;
      purchaseCenterKey?: string | null;
    },
  ) {
    const stages: Array<{ stage: EimsTraceStage; title: string; value?: string | null }> = [
      { stage: 'producer', title: 'Productor', value: lot.producerName },
      { stage: 'farm', title: 'Finca', value: lot.farmName },
      { stage: 'agricultural_lot', title: 'Lote agrícola', value: lot.agriculturalLotCode },
      { stage: 'purchase', title: 'Compra', value: lot.sourceRef },
      { stage: 'weighing', title: 'Pesaje', value: lot.sourceRef },
      { stage: 'quality', title: 'Calidad', value: lot.sourceRef },
      { stage: 'settlement', title: 'Liquidación', value: lot.sourceRef },
      { stage: 'inventory_entry', title: 'Ingreso a inventario', value: lot.lotKey },
    ];
    for (const s of stages) {
      if (!s.value) continue;
      await this.record(organizationId, {
        lotKey: lot.lotKey,
        stockLotId: lot.id,
        stage: s.stage,
        eventType: `origin_${s.stage}`,
        title: s.title,
        description: String(s.value),
        actorId: userId,
        warehouseKey: lot.purchaseCenterKey ?? undefined,
        documentKey: lot.sourceRef ?? undefined,
        payload: { value: s.value },
      });
    }
  }
}
