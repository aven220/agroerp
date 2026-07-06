import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES, CpepTicketDefinition, CpepWeighingInput } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import {
  computeNetWeight,
  generateTicketCodes,
  generateWeighingNumber,
  hasBlockingErrors,
  validateNetWeight,
  validateWeightValue,
} from '../domain/weighing.engine';
import { CoffeeAuditService } from './coffee-audit.service';
import { CoffeeTurnService } from './coffee-turn.service';

@Injectable()
export class CoffeeReceptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: CoffeeAuditService,
    private readonly turns: CoffeeTurnService,
  ) {}


  findAll(organizationId: string, status?: string) {
    return this.prisma.cpepReceptionTicket.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as 'arrived' } : {}),
      },
      include: { queueTurn: true, quality: true, settlement: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async findOne(organizationId: string, ticketKey: string) {
    const ticket = await this.prisma.cpepReceptionTicket.findFirst({
      where: { organizationId, ticketKey },
      include: {
        queueTurn: true,
        weighings: true,
        quality: true,
        samples: true,
        photos: true,
        signatures: true,
        custodyEvents: { orderBy: { recordedAt: 'asc' } },
        settlement: true,
        documents: true,
        inventoryMovements: true,
        vehicles: true,
        turnEvents: { orderBy: { createdAt: 'asc' } },
        receptionIncidents: true,
      },
    });
    if (!ticket) throw new NotFoundException(`Ticket ${ticketKey} no encontrado`);
    return ticket;
  }

  async create(organizationId: string, userId: string, dto: CpepTicketDefinition) {
    const ticketKey = dto.ticketKey ?? `RCP-${Date.now()}`;
    const codes = generateTicketCodes(ticketKey);
    const ticket = await this.prisma.cpepReceptionTicket.create({
      data: {
        organizationId,
        ticketKey,
        producerId: dto.producerId,
        producerCode: dto.producerCode,
        producerName: dto.producerName,
        identityDoc: dto.identityDoc,
        farmId: dto.farmId,
        farmName: dto.farmName,
        lotId: dto.lotId,
        lotCode: dto.lotCode,
        vehiclePlate: dto.vehiclePlate,
        vehicleType: dto.vehicleType,
        driverName: dto.driverName,
        notes: dto.notes,
        latitude: dto.latitude,
        longitude: dto.longitude,
        qrCode: codes.qrCode,
        barcode: codes.barcode,
        createdBy: userId,
        metadata: (dto.metadata ?? {}) as object,
        receivedAt: new Date(),
        arrivalAt: new Date(),
        wizardStep: 1,
      },
    });
    await this.addCustody(ticket.id, 'arrival', 'Llegada del productor', dto.producerName);

    await this.audit.log(organizationId, 'Ticket', ticketKey, 'create', userId);
    await this.core.emitUserAction(organizationId, 'CoffeeTicket', ticket.id, EVENT_TYPES.COFFEE_TICKET_CREATED, { ticketKey });
    return ticket;
  }

  async validateIdentity(organizationId: string, userId: string, ticketKey: string) {
    const ticket = await this.findOne(organizationId, ticketKey);
    const updated = await this.prisma.cpepReceptionTicket.update({
      where: { id: ticket.id },
      data: { identityValidated: true, status: 'identity_validated' },
    });
    await this.addCustody(ticket.id, 'identity', 'Validación de identidad', ticket.producerName ?? undefined);
    await this.audit.log(organizationId, 'Ticket', ticketKey, 'identity_validated', userId);
    await this.core.emitUserAction(organizationId, 'CoffeeTicket', ticket.id, EVENT_TYPES.COFFEE_IDENTITY_VALIDATED, { ticketKey });
    return updated;
  }

  async assignTurn(organizationId: string, userId: string, ticketKey: string) {
    await this.turns.assign(organizationId, userId, ticketKey, { mode: 'auto' });
    return this.findOne(organizationId, ticketKey);
  }

  listQueue(organizationId: string) {
    return this.turns.listQueue(organizationId);
  }

  async weigh(organizationId: string, userId: string, ticketKey: string, input: CpepWeighingInput) {
    const ticket = await this.findOne(organizationId, ticketKey);
    const source = input.source ?? (input.iotDeviceKey ? 'iot' : 'manual');
    const contingency = source === 'manual_contingency' || !!(input as CpepWeighingInput & { contingency?: boolean }).contingency;
    const contingencyReason = (input as CpepWeighingInput & { contingencyReason?: string }).contingencyReason;

    const issues = [
      ...validateWeightValue(input.grossWeightKg),
      ...validateWeightValue(input.tareWeightKg),
      ...validateNetWeight(
        input.grossWeightKg ?? ticket.grossWeightKg,
        input.tareWeightKg ?? ticket.tareWeightKg,
      ),
    ];
    if (contingency && !contingencyReason?.trim()) {
      throw new BadRequestException('Justificación obligatoria en pesaje manual de contingencia');
    }
    if (hasBlockingErrors(issues) && !contingency) {
      throw new BadRequestException({ message: 'Pesaje inválido', issues });
    }

    const weighingNumber = generateWeighingNumber(ticketKey);
    const photoUrl = (input as CpepWeighingInput & { photoUrl?: string }).photoUrl;
    const latitude = (input as CpepWeighingInput & { latitude?: number }).latitude;
    const longitude = (input as CpepWeighingInput & { longitude?: number }).longitude;

    if (input.grossWeightKg != null) {
      await this.prisma.cpepWeighing.create({
        data: {
          ticketId: ticket.id,
          weighingNumber,
          weighingType: 'gross',
          weightKg: input.grossWeightKg,
          source,
          iotDeviceKey: input.iotDeviceKey,
          contingency,
          contingencyReason,
          photoUrl,
          latitude,
          longitude,
          operatorId: userId,
          validatedBy: userId,
          validatedAt: new Date(),
        },
      });
    }
    if (input.tareWeightKg != null) {
      await this.prisma.cpepWeighing.create({
        data: {
          ticketId: ticket.id,
          weighingNumber,
          weighingType: 'tare',
          weightKg: input.tareWeightKg,
          source,
          iotDeviceKey: input.iotDeviceKey,
          contingency,
          contingencyReason,
          photoUrl,
          latitude,
          longitude,
          operatorId: userId,
          validatedBy: userId,
          validatedAt: new Date(),
        },
      });
    }

    const gross = input.grossWeightKg ?? ticket.grossWeightKg;
    const tare = input.tareWeightKg ?? ticket.tareWeightKg;
    const net = computeNetWeight(gross, tare);
    const complete = net != null && net > 0;

    if (complete && net != null) {
      await this.prisma.cpepWeighing.create({
        data: {
          ticketId: ticket.id,
          weighingNumber,
          weighingType: 'net',
          weightKg: net,
          source,
          iotDeviceKey: input.iotDeviceKey,
          contingency,
          contingencyReason,
          operatorId: userId,
          validatedBy: userId,
          validatedAt: new Date(),
        },
      });
    }

    const updated = await this.prisma.cpepReceptionTicket.update({
      where: { id: ticket.id },
      data: {
        grossWeightKg: gross ?? undefined,
        tareWeightKg: tare ?? undefined,
        netWeightKg: net ?? undefined,
        weightSource: source,
        iotDeviceKey: input.iotDeviceKey,
        weightValidated: complete,
        status: complete ? 'weighed' : 'receiving',
      },
    });
    await this.addCustody(
      ticket.id,
      'weighing',
      complete ? `Pesaje neto ${net} kg` : `Pesaje parcial bruto=${gross ?? '—'} tara=${tare ?? '—'}`,
      undefined,
      { source, net, gross, tare, weighingNumber, contingency, issues },
    );
    await this.audit.log(organizationId, 'Ticket', ticketKey, complete ? 'weighed' : 'weighing_partial', userId, {
      net,
      gross,
      tare,
      weighingNumber,
      contingency,
      issues,
    });
    if (complete) {
      await this.core.emitUserAction(organizationId, 'CoffeeTicket', ticket.id, EVENT_TYPES.COFFEE_WEIGHED, {
        ticketKey,
        net,
        weighingNumber,
      });
    }
    return updated;
  }

  async addPhoto(organizationId: string, ticketKey: string, data: { photoKey: string; photoType?: string; storageUrl?: string; caption?: string }) {
    const ticket = await this.findOne(organizationId, ticketKey);
    return this.prisma.cpepPhoto.create({
      data: {
        ticketId: ticket.id,
        photoKey: data.photoKey,
        photoType: data.photoType ?? 'reception',
        storageUrl: data.storageUrl,
        caption: data.caption,
      },
    });
  }

  async addSignature(organizationId: string, ticketKey: string, data: { signerRole: string; signerName: string; signatureData: string }) {
    const ticket = await this.findOne(organizationId, ticketKey);
    return this.prisma.cpepSignature.create({
      data: {
        ticketId: ticket.id,
        signerRole: data.signerRole,
        signerName: data.signerName,
        signatureData: data.signatureData,
      },
    });
  }

  async addSample(organizationId: string, ticketKey: string, data: { sampleKey: string; sampleType?: string; weightGrams?: number; notes?: string }) {
    const ticket = await this.findOne(organizationId, ticketKey);
    const custodyCode = `CUS-${ticket.ticketKey}-${data.sampleKey}`;
    const sample = await this.prisma.cpepSample.create({
      data: {
        ticketId: ticket.id,
        sampleKey: data.sampleKey,
        sampleType: data.sampleType ?? 'reception',
        weightGrams: data.weightGrams,
        custodyCode,
        notes: data.notes,
      },
    });
    await this.addCustody(ticket.id, 'sample', `Muestra ${data.sampleKey}`, undefined, { custodyCode });
    return sample;
  }

  async producerHistory(organizationId: string, producerId: string) {
    return this.prisma.cpepReceptionTicket.findMany({
      where: { organizationId, producerId },
      include: { quality: true, settlement: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  private addCustody(ticketId: string, eventKey: string, action: string, actorName?: string, details?: Record<string, unknown>) {
    return this.prisma.cpepCustodyEvent.create({
      data: {
        ticketId,
        eventKey: `${eventKey}-${Date.now()}`,
        action,
        actorName,
        details: (details ?? {}) as object,
      },
    });
  }
}
