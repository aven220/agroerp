import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { EimsAuditService } from './eims-audit.service';
import { EimsTraceabilityService } from './eims-traceability.service';
import { generateSerialKey } from '../domain/eims-traceability.engine';

@Injectable()
export class EimsSerialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: EimsAuditService,
    private readonly trace: EimsTraceabilityService,
  ) {}

  async list(organizationId: string, filters?: { itemKey?: string; lotKey?: string; serialType?: string }) {
    let itemId: string | undefined;
    if (filters?.itemKey) {
      const item = await this.prisma.eimsItem.findFirst({
        where: { organizationId, itemKey: filters.itemKey },
      });
      itemId = item?.id;
    }
    return this.prisma.eimsSerial.findMany({
      where: {
        organizationId,
        ...(filters?.serialType ? { serialType: filters.serialType } : {}),
        ...(filters?.lotKey ? { stockLot: { lotKey: filters.lotKey } } : {}),
        ...(itemId ? { itemId } : {}),
      },
      include: { stockLot: { include: { item: true } } },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  async create(
    organizationId: string,
    userId: string,
    input: {
      itemKey: string;
      lotKey?: string;
      serialKey?: string;
      serialType?: 'unique' | 'manufacturer' | 'internal';
      manufacturerSerial?: string;
      warrantyUntil?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const item = await this.prisma.eimsItem.findFirst({
      where: { organizationId, itemKey: input.itemKey },
    });
    if (!item) throw new NotFoundException(`Artículo ${input.itemKey} no encontrado`);
    let stockLotId: string | undefined;
    let lotKey: string | undefined;
    if (input.lotKey) {
      const lot = await this.prisma.eimsStockLot.findFirst({
        where: { organizationId, lotKey: input.lotKey },
      });
      if (!lot) throw new NotFoundException(`Lote ${input.lotKey} no encontrado`);
      stockLotId = lot.id;
      lotKey = lot.lotKey;
    }
    const serialType = input.serialType ?? 'internal';
    const serialKey =
      input.serialKey ??
      input.manufacturerSerial ??
      generateSerialKey(serialType === 'manufacturer' ? 'MFG' : serialType === 'unique' ? 'UNQ' : 'INT');

    const existing = await this.prisma.eimsSerial.findFirst({
      where: { organizationId, serialKey },
    });
    if (existing) throw new BadRequestException(`Serie ${serialKey} ya existe`);

    const serial = await this.prisma.eimsSerial.create({
      data: {
        organizationId,
        itemId: item.id,
        stockLotId,
        serialKey,
        serialType,
        manufacturerSerial: input.manufacturerSerial,
        warrantyUntil: input.warrantyUntil ? new Date(input.warrantyUntil) : undefined,
        metadata: (input.metadata ?? {}) as object,
      },
    });

    if (lotKey) {
      await this.prisma.eimsStockLot.updateMany({
        where: { organizationId, lotKey },
        data: {
          serialNumber: serialKey,
          manufacturerSerial: input.manufacturerSerial,
          internalSerial: serialType === 'internal' ? serialKey : undefined,
          warrantyUntil: input.warrantyUntil ? new Date(input.warrantyUntil) : undefined,
        },
      });
      await this.trace.record(organizationId, {
        lotKey,
        stockLotId,
        stage: 'serial',
        eventType: 'serial_created',
        title: 'Número de serie registrado',
        description: serialKey,
        actorId: userId,
        payload: { serialType, serialKey },
      });
    }

    await this.audit.log(organizationId, 'Serial', serialKey, 'created', userId, {
      itemKey: input.itemKey,
      lotKey,
      serialType,
    });
    await this.core.emitUserAction(
      organizationId,
      'EimsSerial',
      serial.id,
      EVENT_TYPES.EIMS_SERIAL_CREATED,
      { serialKey, serialType, lotKey },
    );
    return serial;
  }

  async addMaintenance(
    organizationId: string,
    userId: string,
    serialKey: string,
    input: { title: string; description?: string; performedAt?: string; metadata?: Record<string, unknown> },
  ) {
    const serial = await this.prisma.eimsSerial.findFirst({
      where: { organizationId, serialKey },
      include: { stockLot: true },
    });
    if (!serial) throw new NotFoundException(`Serie ${serialKey} no encontrada`);
    const log = Array.isArray(serial.maintenanceLog) ? [...(serial.maintenanceLog as object[])] : [];
    const entry = {
      title: input.title,
      description: input.description,
      performedAt: input.performedAt ?? new Date().toISOString(),
      performedBy: userId,
      metadata: input.metadata ?? {},
    };
    log.push(entry);
    const updated = await this.prisma.eimsSerial.update({
      where: { id: serial.id },
      data: { maintenanceLog: log as object[] },
    });
    if (serial.stockLot) {
      await this.trace.record(organizationId, {
        lotKey: serial.stockLot.lotKey,
        stockLotId: serial.stockLotId ?? undefined,
        stage: 'maintenance',
        eventType: 'serial_maintenance',
        title: input.title,
        description: input.description,
        actorId: userId,
        payload: { serialKey },
      });
    }
    await this.audit.log(organizationId, 'Serial', serialKey, 'maintenance', userId, entry);
    await this.core.emitUserAction(
      organizationId,
      'EimsSerial',
      serial.id,
      EVENT_TYPES.EIMS_SERIAL_MAINTENANCE,
      { serialKey, title: input.title },
    );
    return updated;
  }
}
