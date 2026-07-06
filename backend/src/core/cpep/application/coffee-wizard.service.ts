import { BadRequestException, Injectable } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { generateTicketCodes } from '../domain/weighing.engine';
import { CoffeeAuditService } from './coffee-audit.service';
import { CoffeeGateService } from './coffee-gate.service';
import { CoffeeLookupService } from './coffee-lookup.service';
import { CoffeeTurnService } from './coffee-turn.service';

@Injectable()
export class CoffeeWizardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: CoffeeAuditService,
    private readonly gate: CoffeeGateService,
    private readonly lookup: CoffeeLookupService,
    private readonly turns: CoffeeTurnService,
  ) {}

  async searchProducers(organizationId: string, query: string, method?: string) {
    const q = query.trim();
    if (!q) return [];

    if (method === 'qr' || q.startsWith('CPEP:') || q.startsWith('PRODUCER:')) {
      const code = q.replace(/^CPEP:|^PRODUCER:/i, '');
      return this.lookup.findProducer(organizationId, code);
    }
    if (method === 'nfc') {
      const byNfc = await this.prisma.producer.findMany({
        where: {
          organizationId,
          deletedAt: null,
          OR: [
            { externalId: q },
            { metadata: { path: ['nfcTag'], equals: q } },
          ],
        },
        take: 10,
      });
      if (byNfc.length) {
        return byNfc.map((p) => ({
          id: p.id,
          producerCode: p.producerNumber,
          producerName: p.legalName,
          identityDoc: p.documentNumber ?? p.taxId,
          status: p.lifecycleStatus,
        }));
      }
    }
    return this.lookup.findProducer(organizationId, q);
  }

  async startArrival(organizationId: string, userId: string, data: {
    producerId?: string;
    producerCode?: string;
    producerName?: string;
    identityDoc?: string;
    searchMethod?: string;
    purchaseCenterId?: string;
    nfcTag?: string;
    latitude?: number;
    longitude?: number;
  }) {
    const ticketKey = `RCP-${Date.now()}`;
    const codes = generateTicketCodes(ticketKey);
    let producerName = data.producerName;
    let producerCode = data.producerCode;
    let identityDoc = data.identityDoc;
    let producerId = data.producerId;

    if (producerId) {
      const producer = await this.lookup.getProducer(organizationId, producerId);
      producerName = producer.producerName;
      producerCode = producer.producerCode;
      identityDoc = producer.identityDoc ?? identityDoc;
    }

    const ticket = await this.prisma.cpepReceptionTicket.create({
      data: {
        organizationId,
        ticketKey,
        producerId,
        producerCode,
        producerName,
        identityDoc,
        purchaseCenterId: data.purchaseCenterId,
        nfcTag: data.nfcTag,
        searchMethod: data.searchMethod ?? 'manual',
        wizardStep: 1,
        arrivalAt: new Date(),
        receivedAt: new Date(),
        latitude: data.latitude,
        longitude: data.longitude,
        qrCode: codes.qrCode,
        barcode: codes.barcode,
        createdBy: userId,
        status: 'arrived',
      },
    });

    await this.prisma.cpepCustodyEvent.create({
      data: {
        ticketId: ticket.id,
        eventKey: `arrival-${Date.now()}`,
        action: 'Llegada del productor',
        actorName: producerName,
        details: { searchMethod: data.searchMethod },
      },
    });
    await this.audit.log(organizationId, 'Ticket', ticketKey, 'arrival', userId, { searchMethod: data.searchMethod });
    await this.core.emitUserAction(organizationId, 'CoffeeTicket', ticket.id, EVENT_TYPES.COFFEE_TICKET_CREATED, {
      ticketKey,
      wizardStep: 1,
    });
    return ticket;
  }

  async applyProducer(organizationId: string, userId: string, ticketKey: string, producerId: string) {
    const ticket = await this.requireTicket(organizationId, ticketKey);
    const producer = await this.lookup.getProducer(organizationId, producerId);
    const gate = await this.gate.validateProducerIntake(organizationId, {
      producerId,
      purchaseCenterId: ticket.purchaseCenterId ?? undefined,
    });
    if (!gate.allowed) {
      await this.prisma.cpepReceptionIncident.create({
        data: {
          organizationId,
          ticketId: ticket.id,
          incidentKey: `gate-${Date.now()}`,
          severity: 'blocking',
          message: gate.checks.filter((c) => !c.ok).map((c) => c.message).join('; '),
          userId,
        },
      });
    }
    const updated = await this.prisma.cpepReceptionTicket.update({
      where: { id: ticket.id },
      data: {
        producerId,
        producerCode: producer.producerCode,
        producerName: producer.producerName,
        identityDoc: producer.identityDoc,
        identityValidated: gate.allowed,
        status: gate.allowed ? 'identity_validated' : 'arrived',
        wizardStep: 4,
      },
    });
    await this.audit.log(organizationId, 'Ticket', ticketKey, 'producer_selected', userId, { producerId, gate });
    return { ticket: updated, gate, producer };
  }

  async selectOrigin(
    organizationId: string,
    userId: string,
    ticketKey: string,
    data: { farmId?: string; farmName?: string; lotId?: string; lotCode?: string },
  ) {
    const ticket = await this.requireTicket(organizationId, ticketKey);
    let farmName = data.farmName;
    let lotCode = data.lotCode;
    if (data.farmId) {
      const farm = await this.lookup.getFarm(organizationId, data.farmId);
      farmName = farm.farmName;
    }
    if (data.lotId) {
      const lots = await this.lookup.listLots(organizationId, data.farmId);
      const lot = lots.find((l) => l.id === data.lotId);
      lotCode = lot?.lotCode ?? lotCode;
    }
    const gate = await this.gate.validateProducerIntake(organizationId, {
      producerId: ticket.producerId ?? undefined,
      farmId: data.farmId,
      lotId: data.lotId,
      purchaseCenterId: ticket.purchaseCenterId ?? undefined,
    });
    const updated = await this.prisma.cpepReceptionTicket.update({
      where: { id: ticket.id },
      data: {
        farmId: data.farmId,
        farmName,
        lotId: data.lotId,
        lotCode,
        wizardStep: 5,
      },
    });
    await this.audit.log(organizationId, 'Ticket', ticketKey, 'origin_selected', userId, { ...data, gate });
    return { ticket: updated, gate };
  }

  async registerVehicle(
    organizationId: string,
    userId: string,
    ticketKey: string,
    data: {
      plate: string;
      vehicleType?: string;
      driverName?: string;
      carrierName?: string;
      observations?: string;
      photoUrls?: string[];
    },
  ) {
    const ticket = await this.requireTicket(organizationId, ticketKey);
    const vehicle = await this.prisma.cpepVehicle.create({
      data: {
        organizationId,
        ticketId: ticket.id,
        plate: data.plate,
        vehicleType: data.vehicleType,
        driverName: data.driverName,
        carrierName: data.carrierName,
        observations: data.observations,
        photoUrls: data.photoUrls ?? [],
      },
    });
    const updated = await this.prisma.cpepReceptionTicket.update({
      where: { id: ticket.id },
      data: {
        vehiclePlate: data.plate,
        vehicleType: data.vehicleType,
        driverName: data.driverName,
        carrierName: data.carrierName,
        wizardStep: 6,
      },
    });
    await this.audit.log(organizationId, 'Ticket', ticketKey, 'vehicle_registered', userId, { plate: data.plate });
    return { ticket: updated, vehicle };
  }

  async addOptionalPhoto(organizationId: string, userId: string, ticketKey: string, data: {
    photoKey: string;
    storageUrl?: string;
    caption?: string;
  }) {
    const ticket = await this.requireTicket(organizationId, ticketKey);
    const photo = await this.prisma.cpepPhoto.create({
      data: {
        ticketId: ticket.id,
        photoKey: data.photoKey,
        photoType: 'intake',
        storageUrl: data.storageUrl,
        caption: data.caption,
      },
    });
    await this.prisma.cpepReceptionTicket.update({
      where: { id: ticket.id },
      data: { wizardStep: Math.max(ticket.wizardStep, 7) },
    });
    await this.audit.log(organizationId, 'Ticket', ticketKey, 'photo_added', userId, { photoKey: data.photoKey });
    return photo;
  }

  async assignTurnStep(
    organizationId: string,
    userId: string,
    ticketKey: string,
    options?: { manualTurn?: number; priority?: number; preferential?: boolean },
  ) {
    const turn = await this.turns.assign(organizationId, userId, ticketKey, {
      ...options,
      mode: options?.manualTurn != null ? 'manual' : 'auto',
    });
    return turn;
  }

  async confirmEntry(organizationId: string, userId: string, ticketKey: string, signerName?: string, signatureData?: string) {
    const ticket = await this.requireTicket(organizationId, ticketKey);
    if (!ticket.turnNumber) throw new BadRequestException('Debe asignar turno antes de confirmar ingreso');
    if (signatureData) {
      await this.prisma.cpepSignature.create({
        data: {
          ticketId: ticket.id,
          signerRole: 'producer',
          signerName: signerName ?? ticket.producerName ?? 'Productor',
          signatureData,
        },
      });
    }
    const updated = await this.prisma.cpepReceptionTicket.update({
      where: { id: ticket.id },
      data: { wizardStep: 9, status: 'queued' },
    });
    await this.prisma.cpepCustodyEvent.create({
      data: {
        ticketId: ticket.id,
        eventKey: `entry-${Date.now()}`,
        action: 'Confirmación de ingreso',
        actorName: signerName ?? ticket.producerName ?? undefined,
      },
    });
    await this.audit.log(organizationId, 'Ticket', ticketKey, 'entry_confirmed', userId);
    return updated;
  }

  async sendToWeighing(organizationId: string, userId: string, ticketKey: string) {
    await this.turns.callTurn(organizationId, userId, ticketKey);
    const ticket = await this.requireTicket(organizationId, ticketKey);
    const updated = await this.prisma.cpepReceptionTicket.update({
      where: { id: ticket.id },
      data: { wizardStep: 10, status: 'receiving' },
    });
    await this.audit.log(organizationId, 'Ticket', ticketKey, 'sent_to_weighing', userId);
    return {
      ...updated,
      weighingReady: true,
      nextPath: `/compras/pesaje?ticket=${ticketKey}`,
    };
  }

  async getWizardState(organizationId: string, ticketKey: string) {
    const ticket = await this.prisma.cpepReceptionTicket.findFirst({
      where: { organizationId, ticketKey },
      include: {
        queueTurn: true,
        vehicles: true,
        photos: true,
        signatures: true,
        receptionIncidents: { where: { resolved: false } },
        custodyEvents: { orderBy: { recordedAt: 'asc' } },
      },
    });
    if (!ticket) throw new BadRequestException('Ticket no encontrado');
    const gate = await this.gate.validateProducerIntake(organizationId, {
      producerId: ticket.producerId ?? undefined,
      farmId: ticket.farmId ?? undefined,
      lotId: ticket.lotId ?? undefined,
      purchaseCenterId: ticket.purchaseCenterId ?? undefined,
    });
    return {
      ticket,
      gate,
      steps: [
        { step: 1, key: 'arrival', done: !!ticket.arrivalAt || !!ticket.receivedAt },
        { step: 2, key: 'search', done: !!ticket.producerId || !!ticket.identityDoc },
        { step: 3, key: 'producer_status', done: ticket.identityValidated },
        { step: 4, key: 'permissions', done: gate.allowed },
        { step: 5, key: 'origin', done: !!ticket.farmId || !!ticket.lotCode },
        { step: 6, key: 'vehicle', done: !!ticket.vehiclePlate || ticket.vehicles.length > 0 },
        { step: 7, key: 'photos', done: ticket.photos.length > 0 || ticket.wizardStep >= 7 },
        { step: 8, key: 'turn', done: !!ticket.turnNumber },
        { step: 9, key: 'confirm', done: ticket.wizardStep >= 9 },
        { step: 10, key: 'weighing', done: ticket.status === 'receiving' || ticket.wizardStep >= 10 },
      ],
    };
  }

  private async requireTicket(organizationId: string, ticketKey: string) {
    const ticket = await this.prisma.cpepReceptionTicket.findFirst({
      where: { organizationId, ticketKey },
    });
    if (!ticket) throw new BadRequestException(`Ticket ${ticketKey} no encontrado`);
    return ticket;
  }
}
