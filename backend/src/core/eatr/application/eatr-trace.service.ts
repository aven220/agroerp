import { Injectable, NotFoundException } from '@nestjs/common';
import { EatrPrismaService } from '@/shared/infrastructure/database/eatr-prisma.service';
import { EATR_TRACE_EVENT_TYPES, buildTraceChain, generateEatrKey } from '../domain/eatr.engine';
import { EatrAuditService } from './eatr-audit.service';

@Injectable()
export class EatrTraceService {
  constructor(
    private readonly prisma: EatrPrismaService,
    private readonly audit: EatrAuditService,
  ) {}

  eventTypes() { return EATR_TRACE_EVENT_TYPES; }

  listEvents(organizationId: string, fieldLotId?: string, productionLotId?: string) {
    return this.prisma.eatrTraceEvent.findMany({
      where: {
        organizationId,
        ...(fieldLotId ? { fieldLotId } : {}),
        ...(productionLotId ? { productionLotId } : {}),
      },
      orderBy: { occurredAt: 'asc' },
      take: 500,
    });
  }

  async recordEvent(
    organizationId: string,
    userId: string,
    data: {
      eventType: string; fieldLotId?: string; productionLotId?: string;
      sourceModule?: string; sourceRef?: string; occurredAt?: Date; payload?: Record<string, unknown>;
    },
  ) {
    const count = await this.prisma.eatrTraceEvent.count({ where: { organizationId } });
    const eventKey = generateEatrKey('TRC', count + 1);
    const row = await this.prisma.eatrTraceEvent.create({
      data: {
        organizationId, eventKey, eventType: data.eventType,
        fieldLotId: data.fieldLotId, productionLotId: data.productionLotId,
        sourceModule: data.sourceModule, sourceRef: data.sourceRef,
        occurredAt: data.occurredAt ?? new Date(), recordedBy: userId,
        payload: (data.payload ?? {}) as object,
      },
    });
    await this.audit.log(organizationId, 'EatrTraceEvent', eventKey, 'trace_event_recorded', userId, { eventType: data.eventType });
    return row;
  }

  async queryTrace(organizationId: string, params: { fieldLotId?: string; productionLotId?: string; commercialKey?: string }) {
    let productionLotId = params.productionLotId;
    if (params.commercialKey) {
      const commercial = await this.prisma.eatrCommercialLot.findFirst({
        where: { organizationId, commercialKey: params.commercialKey },
      });
      productionLotId = commercial?.productionLotId ?? undefined;
    }
    const [events, lots, custody, applications] = await Promise.all([
      this.listEvents(organizationId, params.fieldLotId, productionLotId),
      this.prisma.eatrProductionLot.findMany({
        where: { organizationId, ...(productionLotId ? { id: productionLotId } : params.fieldLotId ? { fieldLotId: params.fieldLotId } : {}) },
        include: { harvestLots: true, commercialLots: true, custodyMoves: true },
      }),
      this.prisma.eatrCustodyTransfer.findMany({
        where: { organizationId, ...(productionLotId ? { productionLotId } : {}) },
        orderBy: { transferredAt: 'asc' },
      }),
      productionLotId
        ? this.prisma.eatrTraceEvent.findMany({
            where: { organizationId, productionLotId, eventType: { in: ['phytosanitary', 'fertilization', 'irrigation', 'labor'] } },
          })
        : Promise.resolve([]),
    ]);
    const chain = buildTraceChain(events.map((e) => ({ eventType: e.eventType, occurredAt: e.occurredAt, payload: e.payload as Record<string, unknown> })));
    return { chain, lots, custody, inputs: applications, queriedAt: new Date().toISOString() };
  }
}

@Injectable()
export class EatrLotService {
  constructor(
    private readonly prisma: EatrPrismaService,
    private readonly audit: EatrAuditService,
  ) {}

  listProduction(organizationId: string, fieldLotId?: string) {
    return this.prisma.eatrProductionLot.findMany({
      where: { organizationId, status: 'active', ...(fieldLotId ? { fieldLotId } : {}) },
      include: { harvestLots: true, commercialLots: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createProductionLot(
    organizationId: string,
    userId: string,
    data: { lotType?: string; fieldLotId?: string; cropCode?: string; quantityKg?: number; parentLotId?: string },
  ) {
    const count = await this.prisma.eatrProductionLot.count({ where: { organizationId } });
    const lotKey = generateEatrKey('PLT', count + 1);
    const row = await this.prisma.eatrProductionLot.create({
      data: {
        organizationId, lotKey, lotType: data.lotType ?? 'agricultural',
        fieldLotId: data.fieldLotId, cropCode: data.cropCode, quantityKg: data.quantityKg, parentLotId: data.parentLotId,
      },
    });
    await this.audit.log(organizationId, 'EatrProductionLot', lotKey, 'lot_created', userId);
    return row;
  }

  async mergeLots(organizationId: string, userId: string, sourceLotKeys: string[], targetLotKey?: string) {
    const sources = await this.prisma.eatrProductionLot.findMany({
      where: { organizationId, lotKey: { in: sourceLotKeys } },
    });
    if (!sources.length) throw new NotFoundException('Lotes no encontrados');
    const totalKg = sources.reduce((s, l) => s + (l.quantityKg ?? 0), 0);
    const count = await this.prisma.eatrProductionLot.count({ where: { organizationId } });
    const lotKey = targetLotKey ?? generateEatrKey('PLT', count + 1);
    const target = await this.prisma.eatrProductionLot.create({
      data: { organizationId, lotKey, lotType: 'commercial', quantityKg: totalKg, cropCode: sources[0].cropCode },
    });
    await this.prisma.eatrProductionLot.updateMany({
      where: { organizationId, lotKey: { in: sourceLotKeys } },
      data: { status: 'merged' },
    });
    const opKey = generateEatrKey('OP', count + 1);
    await this.prisma.eatrLotOperation.create({
      data: { organizationId, operationKey: opKey, operationType: 'merge', sourceLotKey: sourceLotKeys[0], targetLotKeys: [lotKey], performedBy: userId },
    });
    await this.audit.log(organizationId, 'EatrProductionLot', lotKey, 'lot_merged', userId, { sourceLotKeys });
    return target;
  }

  async splitLot(organizationId: string, userId: string, sourceLotKey: string, parts: Array<{ quantityKg: number }>) {
    const source = await this.prisma.eatrProductionLot.findFirst({ where: { organizationId, lotKey: sourceLotKey } });
    if (!source) throw new NotFoundException('Lote no encontrado');
    const targets: string[] = [];
    for (const part of parts) {
      const count = await this.prisma.eatrProductionLot.count({ where: { organizationId } });
      const lotKey = generateEatrKey('PLT', count + 1);
      await this.prisma.eatrProductionLot.create({
        data: {
          organizationId, lotKey, lotType: 'sub_lot', parentLotId: source.id,
          fieldLotId: source.fieldLotId, cropCode: source.cropCode, quantityKg: part.quantityKg,
        },
      });
      targets.push(lotKey);
    }
    await this.prisma.eatrProductionLot.update({ where: { id: source.id }, data: { status: 'split' } });
    const opKey = generateEatrKey('OP', Date.now() % 1000000);
    await this.prisma.eatrLotOperation.create({
      data: { organizationId, operationKey: opKey, operationType: 'split', sourceLotKey, targetLotKeys: targets, performedBy: userId },
    });
    await this.audit.log(organizationId, 'EatrProductionLot', sourceLotKey, 'lot_split', userId, { targets });
    return { sourceLotKey, targetLotKeys: targets };
  }

  listCommercial(organizationId: string) {
    return this.prisma.eatrCommercialLot.findMany({
      where: { organizationId, status: 'active' },
      include: { productionLot: true, packages: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCommercialLot(
    organizationId: string,
    userId: string,
    data: { productionLotId?: string; presentation?: string; packageType?: string; quantityUnits?: number; quantityKg?: number },
  ) {
    const count = await this.prisma.eatrCommercialLot.count({ where: { organizationId } });
    const commercialKey = generateEatrKey('COM', count + 1);
    const qrCode = `QR-${commercialKey}`;
    const row = await this.prisma.eatrCommercialLot.create({
      data: {
        organizationId, commercialKey, productionLotId: data.productionLotId,
        presentation: data.presentation, packageType: data.packageType,
        quantityUnits: data.quantityUnits, quantityKg: data.quantityKg, qrCode,
      },
    });
    await this.audit.log(organizationId, 'EatrCommercialLot', commercialKey, 'lot_created', userId);
    return row;
  }
}
