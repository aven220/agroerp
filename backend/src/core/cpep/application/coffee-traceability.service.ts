import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoffeeInventoryService } from './coffee-inventory.service';
import { CoffeeAuditService } from './coffee-audit.service';

@Injectable()
export class CoffeeTraceabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: CoffeeInventoryService,
    private readonly audit: CoffeeAuditService,
  ) {}

  async byTicket(organizationId: string, ticketKey: string) {
    const ticket = await this.prisma.cpepReceptionTicket.findFirst({
      where: { organizationId, ticketKey },
      include: {
        queueTurn: true,
        weighings: { orderBy: { recordedAt: 'asc' } },
        weighingSessions: { orderBy: { createdAt: 'asc' } },
        quality: true,
        qualitySessions: { orderBy: { createdAt: 'asc' } },
        samples: { include: { custodyEvents: true } },
        settlement: { include: { payments: true, documents: true } },
        settlementSessions: true,
        inventoryMovements: { orderBy: { postedAt: 'asc' } },
        inventoryLots: {
          include: {
            movements: { orderBy: { postedAt: 'asc' } },
            kardexEntries: { orderBy: { postedAt: 'asc' } },
            costHistories: { orderBy: { recordedAt: 'asc' } },
            traceEvents: { orderBy: { occurredAt: 'asc' } },
          },
        },
        documents: true,
        photos: true,
        signatures: true,
        custodyEvents: { orderBy: { recordedAt: 'asc' } },
        turnEvents: { orderBy: { createdAt: 'asc' } },
        traceEvents: { orderBy: { occurredAt: 'asc' } },
      },
    });
    if (!ticket) throw new NotFoundException(`Ticket ${ticketKey} no encontrado`);

    const timeline = this.buildTimeline(ticket);
    return {
      ticket,
      lot: ticket.inventoryLots[0] ?? null,
      timeline,
      map: this.buildMovementMap(ticket.inventoryLots[0]?.movements ?? ticket.inventoryMovements),
    };
  }

  async byLot(organizationId: string, lotKey: string) {
    const lot = await this.inventory.getLot(organizationId, lotKey);
    const ticketKey = lot.ticket?.ticketKey;
    if (ticketKey) {
      return this.byTicket(organizationId, ticketKey);
    }
    return {
      ticket: lot.ticket,
      lot,
      timeline: lot.traceEvents.map((e) => ({
        stage: e.stage,
        eventType: e.eventType,
        title: e.title,
        description: e.description,
        occurredAt: e.occurredAt,
        payload: e.payload,
      })),
      map: this.buildMovementMap(lot.movements),
    };
  }

  async byQr(organizationId: string, code: string) {
    const lot = await this.inventory.findByQr(organizationId, code);
    return this.byLot(organizationId, lot.lotKey);
  }

  async auditCenter(organizationId: string) {
    const [lots, movements, kardex, costs, traces, audits] = await Promise.all([
      this.prisma.cpepInventoryLot.count({ where: { organizationId } }),
      this.prisma.cpepInventoryMovement.count({ where: { organizationId } }),
      this.prisma.cpepKardexEntry.count({ where: { organizationId } }),
      this.prisma.cpepCostHistory.count({ where: { organizationId } }),
      this.prisma.cpepTraceEvent.count({ where: { organizationId } }),
      this.audit.findAll(organizationId, 50),
    ]);
    const recentLots = await this.prisma.cpepInventoryLot.findMany({
      where: { organizationId },
      orderBy: { receivedAt: 'desc' },
      take: 20,
    });
    const recentMovements = await this.prisma.cpepInventoryMovement.findMany({
      where: { organizationId },
      include: { lot: { select: { lotKey: true } } },
      orderBy: { postedAt: 'desc' },
      take: 30,
    });
    return {
      summary: { lots, movements, kardex, costs, traces },
      recentLots,
      recentMovements,
      audits: audits.filter((a) =>
        ['Inventory', 'InventoryLot', 'Settlement', 'Ticket', 'WeighingSession', 'QualitySession'].includes(
          a.entityType,
        ),
      ),
    };
  }

  private buildTimeline(ticket: {
    producerName: string | null;
    farmName: string | null;
    lotCode: string | null;
    ticketKey: string;
    createdAt: Date;
    weighings: Array<{ weighingType: string; weightKg: number; recordedAt: Date }>;
    quality: { grade: string; decision: string | null; assessedAt: Date | null } | null;
    settlement: { settlementKey: string; totalAmount: number; settledAt: Date | null } | null;
    inventoryLots: Array<{
      lotKey: string;
      receivedAt: Date;
      movements: Array<{ movementType: string; quantityKg: number; postedAt: Date; warehouse: string }>;
      traceEvents: Array<{
        stage: string;
        eventType: string;
        title: string;
        description: string | null;
        occurredAt: Date;
        payload: unknown;
      }>;
    }>;
    inventoryMovements: Array<{ movementType: string; quantityKg: number; postedAt: Date; warehouse: string }>;
    traceEvents: Array<{
      stage: string;
      eventType: string;
      title: string;
      description: string | null;
      occurredAt: Date;
      payload: unknown;
    }>;
  }) {
    if (ticket.traceEvents.length || ticket.inventoryLots[0]?.traceEvents.length) {
      return [...ticket.traceEvents, ...(ticket.inventoryLots[0]?.traceEvents ?? [])]
        .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
        .map((e) => ({
          stage: e.stage,
          eventType: e.eventType,
          title: e.title,
          description: e.description,
          occurredAt: e.occurredAt,
          payload: e.payload,
        }));
    }

    const timeline = [
      {
        stage: 'producer',
        eventType: 'producer',
        title: 'Productor',
        description: ticket.producerName,
        occurredAt: ticket.createdAt,
        payload: {},
      },
      {
        stage: 'farm',
        eventType: 'farm',
        title: 'Finca',
        description: ticket.farmName,
        occurredAt: ticket.createdAt,
        payload: {},
      },
      {
        stage: 'agricultural_lot',
        eventType: 'lot',
        title: 'Lote agrícola',
        description: ticket.lotCode,
        occurredAt: ticket.createdAt,
        payload: {},
      },
      {
        stage: 'purchase',
        eventType: 'purchase',
        title: 'Compra',
        description: ticket.ticketKey,
        occurredAt: ticket.createdAt,
        payload: {},
      },
    ];
    for (const w of ticket.weighings) {
      timeline.push({
        stage: 'weighing',
        eventType: w.weighingType,
        title: `Pesaje ${w.weighingType}`,
        description: `${w.weightKg} kg`,
        occurredAt: w.recordedAt,
        payload: w,
      });
    }
    if (ticket.quality) {
      timeline.push({
        stage: 'quality',
        eventType: 'quality',
        title: 'Calidad',
        description: `${ticket.quality.grade} / ${ticket.quality.decision ?? ''}`,
        occurredAt: ticket.quality.assessedAt ?? ticket.createdAt,
        payload: ticket.quality,
      });
    }
    if (ticket.settlement) {
      timeline.push({
        stage: 'settlement',
        eventType: 'settlement',
        title: 'Liquidación',
        description: ticket.settlement.settlementKey,
        occurredAt: ticket.settlement.settledAt ?? ticket.createdAt,
        payload: ticket.settlement,
      });
    }
    for (const lot of ticket.inventoryLots) {
      timeline.push({
        stage: 'inventory',
        eventType: 'lot_created',
        title: 'Lote inventario',
        description: lot.lotKey,
        occurredAt: lot.receivedAt,
        payload: { lotKey: lot.lotKey },
      });
      for (const m of lot.movements) {
        timeline.push({
          stage: 'movement',
          eventType: m.movementType,
          title: `Movimiento ${m.movementType}`,
          description: `${m.quantityKg} kg @ ${m.warehouse}`,
          occurredAt: m.postedAt,
          payload: m,
        });
      }
    }
    return timeline;
  }

  private buildMovementMap(
    movements: Array<{
      movementType: string;
      quantityKg: number;
      postedAt: Date;
      warehouse: string;
      fromWarehouse?: string | null;
      toWarehouse?: string | null;
      movementKey?: string;
    }>,
  ) {
    return movements.map((m, index) => ({
      sequence: index + 1,
      movementType: m.movementType,
      quantityKg: m.quantityKg,
      warehouse: m.warehouse,
      fromWarehouse: m.fromWarehouse ?? null,
      toWarehouse: m.toWarehouse ?? null,
      postedAt: m.postedAt,
      movementKey: m.movementKey,
    }));
  }
}
