import { Injectable } from '@nestjs/common';
import { EmfgTraceabilityEventType } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { generateEmfgKey } from '../domain/emfg-manufacturing.engine';

@Injectable()
export class EmfgMesTraceabilityService {
  constructor(private readonly prisma: PrismaService) {}

  history(organizationId: string, orderKey: string) {
    return this.prisma.emfgTraceabilityRecord.findMany({
      where: { organizationId, orderKey },
      orderBy: { recordedAt: 'asc' },
    });
  }

  byLot(organizationId: string, lotKey: string) {
    return this.prisma.emfgTraceabilityRecord.findMany({
      where: { organizationId, lotKey },
      orderBy: { recordedAt: 'asc' },
    });
  }

  lots(organizationId: string, orderKey: string) {
    return this.prisma.emfgProductionLot.findMany({
      where: { organizationId, orderKey },
      include: { serials: true },
      orderBy: { producedAt: 'desc' },
    });
  }

  serials(organizationId: string, orderKey: string) {
    return this.prisma.emfgProductionSerial.findMany({
      where: { organizationId, orderKey },
      orderBy: { serialCode: 'asc' },
    });
  }

  async createLot(
    organizationId: string,
    userId: string,
    orderKey: string,
    payload: { itemKey: string; quantity: number; originLotKeys?: string[]; destinationKey?: string },
  ) {
    const order = await this.prisma.emfgProductionOrder.findUnique({
      where: { organizationId_orderKey: { organizationId, orderKey } },
    });
    if (!order) return null;

    const seq = await this.prisma.emfgProductionLot.count({ where: { organizationId, orderKey } });
    const lotKey = generateEmfgKey('LT', seq + 1);
    const lotCode = `LOT-${order.orderNumber}-${String(seq + 1).padStart(4, '0')}`;

    const lot = await this.prisma.emfgProductionLot.create({
      data: {
        organizationId,
        lotKey,
        orderKey,
        itemKey: payload.itemKey,
        lotCode,
        quantity: payload.quantity,
        originLotKeys: payload.originLotKeys ?? [],
        destinationKey: payload.destinationKey,
      },
    });

    await this.record(organizationId, userId, orderKey, {
      eventType: 'lot_created',
      itemKey: payload.itemKey,
      lotKey,
      quantity: payload.quantity,
      details: { lotCode, originLotKeys: payload.originLotKeys ?? [] },
    });

    if (payload.originLotKeys?.length) {
      await this.record(organizationId, userId, orderKey, {
        eventType: 'material_origin',
        itemKey: payload.itemKey,
        lotKey,
        details: { origins: payload.originLotKeys },
      });
    }

    if (payload.destinationKey) {
      await this.record(organizationId, userId, orderKey, {
        eventType: 'finished_goods',
        itemKey: payload.itemKey,
        lotKey,
        toEntity: payload.destinationKey,
        quantity: payload.quantity,
      });
    }

    return lot;
  }

  async createSerial(
    organizationId: string,
    userId: string,
    orderKey: string,
    payload: { itemKey: string; lotKey?: string; serialCode?: string },
  ) {
    const lot = payload.lotKey
      ? await this.prisma.emfgProductionLot.findUnique({
          where: { organizationId_lotKey: { organizationId, lotKey: payload.lotKey } },
        })
      : null;

    const seq = await this.prisma.emfgProductionSerial.count({ where: { organizationId, orderKey } });
    const serialKey = generateEmfgKey('SN', seq + 1);
    const serialCode = payload.serialCode ?? `${lot?.lotCode ?? orderKey}-S${String(seq + 1).padStart(5, '0')}`;

    const serial = await this.prisma.emfgProductionSerial.create({
      data: {
        organizationId,
        serialKey,
        orderKey,
        lotKey: payload.lotKey,
        itemKey: payload.itemKey,
        serialCode,
      },
    });

    await this.record(organizationId, userId, orderKey, {
      eventType: 'serial_assigned',
      itemKey: payload.itemKey,
      lotKey: payload.lotKey,
      serialKey,
      details: { serialCode },
    });

    return serial;
  }

  async record(
    organizationId: string,
    userId: string | undefined,
    orderKey: string,
    payload: {
      eventType: EmfgTraceabilityEventType;
      itemKey?: string;
      lotKey?: string;
      serialKey?: string;
      fromEntity?: string;
      toEntity?: string;
      quantity?: number;
      details?: Record<string, unknown>;
    },
  ) {
    const seq = await this.prisma.emfgTraceabilityRecord.count({ where: { organizationId } });
    const recordKey = generateEmfgKey('TR', seq + 1);
    return this.prisma.emfgTraceabilityRecord.create({
      data: {
        organizationId,
        recordKey,
        orderKey,
        eventType: payload.eventType,
        itemKey: payload.itemKey,
        lotKey: payload.lotKey,
        serialKey: payload.serialKey,
        fromEntity: payload.fromEntity,
        toEntity: payload.toEntity,
        quantity: payload.quantity,
        details: (payload.details ?? {}) as object,
        recordedBy: userId,
      },
    });
  }
}
