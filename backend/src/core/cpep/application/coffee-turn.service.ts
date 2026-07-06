import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import {
  averageMs,
  computeAttentionMs,
  computeWaitMs,
  displayLabel,
  sortQueue,
} from '../domain/turn.engine';
import { CoffeeAuditService } from './coffee-audit.service';

@Injectable()
export class CoffeeTurnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: CoffeeAuditService,
  ) {}

  async listQueue(organizationId: string, purchaseCenterId?: string) {
    const tickets = await this.prisma.cpepReceptionTicket.findMany({
      where: {
        organizationId,
        status: { in: ['queued', 'receiving', 'identity_validated', 'arrived'] },
        ...(purchaseCenterId ? { purchaseCenterId } : {}),
      },
      include: { queueTurn: true, vehicles: true },
    });
    const withTurns = tickets
      .filter((t) => t.queueTurn)
      .map((t) => ({
        ...t,
        turnNumber: t.queueTurn!.turnNumber,
        priority: t.queueTurn!.priority,
        isPreferential: t.queueTurn!.isPreferential,
        createdAt: t.queueTurn!.createdAt,
        displayLabel: t.queueTurn!.displayLabel ?? displayLabel(t.queueTurn!.turnNumber, t.queueTurn!.isPreferential),
      }));
    return sortQueue(withTurns);
  }

  async assign(
    organizationId: string,
    userId: string,
    ticketKey: string,
    options?: { manualTurn?: number; priority?: number; preferential?: boolean; mode?: 'auto' | 'manual' },
  ) {
    const ticket = await this.prisma.cpepReceptionTicket.findFirst({
      where: { organizationId, ticketKey },
      include: { queueTurn: true },
    });
    if (!ticket) throw new NotFoundException(`Ticket ${ticketKey} no encontrado`);

    const mode = options?.mode ?? (options?.manualTurn != null ? 'manual' : 'auto');
    let turnNumber = options?.manualTurn;
    if (turnNumber == null) {
      const last = await this.prisma.cpepQueueTurn.findFirst({
        where: { organizationId },
        orderBy: { turnNumber: 'desc' },
      });
      turnNumber = (last?.turnNumber ?? 0) + 1;
    }

    const priority = options?.priority ?? (options?.preferential ? 1 : 100);
    const isPreferential = options?.preferential ?? false;
    const label = displayLabel(turnNumber, isPreferential);

    const turn = await this.prisma.cpepQueueTurn.upsert({
      where: { ticketId: ticket.id },
      update: {
        turnNumber,
        priority,
        isPreferential,
        assignmentMode: mode,
        assignedBy: userId,
        displayLabel: label,
      },
      create: {
        organizationId,
        ticketId: ticket.id,
        turnNumber,
        priority,
        isPreferential,
        assignmentMode: mode,
        assignedBy: userId,
        displayLabel: label,
      },
    });

    await this.prisma.cpepReceptionTicket.update({
      where: { id: ticket.id },
      data: {
        turnNumber,
        status: 'queued',
        arrivalAt: ticket.arrivalAt ?? ticket.receivedAt ?? new Date(),
        wizardStep: Math.max(ticket.wizardStep, 8),
      },
    });

    await this.prisma.cpepTurnEvent.create({
      data: {
        organizationId,
        ticketId: ticket.id,
        eventType: 'assigned',
        toTurn: turnNumber,
        userId,
        details: { mode, priority, isPreferential },
      },
    });
    await this.audit.log(organizationId, 'Ticket', ticketKey, 'turn_assigned', userId, { turnNumber, mode });
    await this.core.emitUserAction(organizationId, 'CoffeeTicket', ticket.id, EVENT_TYPES.COFFEE_TURN_ASSIGNED, {
      ticketKey,
      turnNumber,
      displayLabel: label,
    });
    return turn;
  }

  async reorder(organizationId: string, userId: string, orderedTicketKeys: string[]) {
    const updates = [];
    for (let i = 0; i < orderedTicketKeys.length; i++) {
      const ticketKey = orderedTicketKeys[i];
      const ticket = await this.prisma.cpepReceptionTicket.findFirst({
        where: { organizationId, ticketKey },
        include: { queueTurn: true },
      });
      if (!ticket?.queueTurn) continue;
      const fromTurn = ticket.queueTurn.turnNumber;
      const toTurn = i + 1;
      await this.prisma.cpepQueueTurn.update({
        where: { id: ticket.queueTurn.id },
        data: { turnNumber: toTurn, displayLabel: displayLabel(toTurn, ticket.queueTurn.isPreferential) },
      });
      await this.prisma.cpepReceptionTicket.update({
        where: { id: ticket.id },
        data: { turnNumber: toTurn },
      });
      await this.prisma.cpepTurnEvent.create({
        data: {
          organizationId,
          ticketId: ticket.id,
          eventType: 'reordered',
          fromTurn,
          toTurn,
          userId,
        },
      });
      updates.push({ ticketKey, fromTurn, toTurn });
    }
    await this.audit.log(organizationId, 'Queue', 'reorder', 'reordered', userId, { updates });
    return updates;
  }

  async setPriority(organizationId: string, userId: string, ticketKey: string, priority: number, preferential = false) {
    const ticket = await this.prisma.cpepReceptionTicket.findFirst({
      where: { organizationId, ticketKey },
      include: { queueTurn: true },
    });
    if (!ticket?.queueTurn) throw new BadRequestException('Ticket sin turno');
    const turn = await this.prisma.cpepQueueTurn.update({
      where: { id: ticket.queueTurn.id },
      data: {
        priority,
        isPreferential: preferential,
        displayLabel: displayLabel(ticket.queueTurn.turnNumber, preferential),
      },
    });
    await this.prisma.cpepTurnEvent.create({
      data: {
        organizationId,
        ticketId: ticket.id,
        eventType: 'priority_changed',
        userId,
        details: { priority, preferential },
      },
    });
    return turn;
  }

  async callNext(organizationId: string, userId: string, purchaseCenterId?: string) {
    const queue = await this.listQueue(organizationId, purchaseCenterId);
    const next = queue.find((t) => !t.queueTurn?.calledAt);
    if (!next) throw new BadRequestException('No hay turnos pendientes');
    return this.callTurn(organizationId, userId, next.ticketKey);
  }

  async callTurn(organizationId: string, userId: string, ticketKey: string) {
    const ticket = await this.prisma.cpepReceptionTicket.findFirst({
      where: { organizationId, ticketKey },
      include: { queueTurn: true },
    });
    if (!ticket?.queueTurn) throw new NotFoundException('Turno no encontrado');
    const calledAt = new Date();
    const waitMs = computeWaitMs(ticket.arrivalAt ?? ticket.receivedAt, calledAt);
    const turn = await this.prisma.cpepQueueTurn.update({
      where: { id: ticket.queueTurn.id },
      data: { calledAt, waitMs },
    });
    await this.prisma.cpepReceptionTicket.update({
      where: { id: ticket.id },
      data: { status: 'receiving', attentionStartedAt: calledAt, wizardStep: 10 },
    });
    await this.prisma.cpepTurnEvent.create({
      data: {
        organizationId,
        ticketId: ticket.id,
        eventType: 'called',
        toTurn: turn.turnNumber,
        userId,
        details: { waitMs },
      },
    });
    await this.core.emitUserAction(organizationId, 'CoffeeTicket', ticket.id, EVENT_TYPES.COFFEE_TURN_ASSIGNED, {
      ticketKey,
      event: 'called',
      displayLabel: turn.displayLabel,
    });
    return turn;
  }

  async startAttention(organizationId: string, userId: string, ticketKey: string) {
    const ticket = await this.prisma.cpepReceptionTicket.findFirst({
      where: { organizationId, ticketKey },
      include: { queueTurn: true },
    });
    if (!ticket?.queueTurn) throw new NotFoundException('Turno no encontrado');
    const startedAt = new Date();
    await this.prisma.cpepQueueTurn.update({
      where: { id: ticket.queueTurn.id },
      data: { attentionStartedAt: startedAt },
    });
    await this.prisma.cpepReceptionTicket.update({
      where: { id: ticket.id },
      data: { attentionStartedAt: startedAt, status: 'receiving' },
    });
    await this.prisma.cpepTurnEvent.create({
      data: { organizationId, ticketId: ticket.id, eventType: 'attention_started', userId },
    });
    return { startedAt };
  }

  async completeAttention(organizationId: string, userId: string, ticketKey: string) {
    const ticket = await this.prisma.cpepReceptionTicket.findFirst({
      where: { organizationId, ticketKey },
      include: { queueTurn: true },
    });
    if (!ticket?.queueTurn) throw new NotFoundException('Turno no encontrado');
    const completedAt = new Date();
    const attentionMs = computeAttentionMs(
      ticket.queueTurn.attentionStartedAt ?? ticket.attentionStartedAt,
      completedAt,
    );
    await this.prisma.cpepQueueTurn.update({
      where: { id: ticket.queueTurn.id },
      data: { completedAt, attentionMs },
    });
    await this.prisma.cpepReceptionTicket.update({
      where: { id: ticket.id },
      data: { attentionCompletedAt: completedAt },
    });
    await this.prisma.cpepTurnEvent.create({
      data: {
        organizationId,
        ticketId: ticket.id,
        eventType: 'attention_completed',
        userId,
        details: { attentionMs },
      },
    });
    return { completedAt, attentionMs };
  }

  async publicBoard(organizationId: string) {
    const queue = await this.listQueue(organizationId);
    const current = queue.find((t) => t.queueTurn?.calledAt && !t.queueTurn?.completedAt);
    const waiting = queue.filter((t) => !t.queueTurn?.calledAt).slice(0, 10);
    return {
      current: current
        ? {
            displayLabel: current.displayLabel,
            producerName: current.producerName,
            turnNumber: current.turnNumber,
          }
        : null,
      waiting: waiting.map((t) => ({
        displayLabel: t.displayLabel,
        producerName: t.producerName,
        turnNumber: t.turnNumber,
        isPreferential: t.isPreferential,
      })),
      updatedAt: new Date().toISOString(),
    };
  }

  async history(organizationId: string, limit = 100) {
    return this.prisma.cpepTurnEvent.findMany({
      where: { organizationId },
      include: { ticket: { select: { ticketKey: true, producerName: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async metrics(organizationId: string) {
    const turns = await this.prisma.cpepQueueTurn.findMany({
      where: { organizationId, completedAt: { not: null } },
      orderBy: { completedAt: 'desc' },
      take: 200,
    });
    return {
      avgWaitMs: averageMs(turns.map((t) => t.waitMs)),
      avgAttentionMs: averageMs(turns.map((t) => t.attentionMs)),
      completed: turns.length,
      preferential: turns.filter((t) => t.isPreferential).length,
    };
  }
}
