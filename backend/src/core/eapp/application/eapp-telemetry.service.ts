import { Injectable, NotFoundException } from '@nestjs/common';
import { EappPrismaService } from '@/shared/infrastructure/database/eapp-prisma.service';
import { EAPP_TELEMETRY_TYPES, generateEappKey } from '../domain/eapp.engine';
import { EappAuditService } from './eapp-audit.service';

@Injectable()
export class EappTelemetryService {
  constructor(
    private readonly prisma: EappPrismaService,
    private readonly audit: EappAuditService,
  ) {}

  deviceTypes() {
    return EAPP_TELEMETRY_TYPES;
  }

  listDevices(organizationId: string, deviceType?: string) {
    return this.prisma.eappTelemetryDevice.findMany({
      where: {
        organizationId,
        status: 'active',
        ...(deviceType ? { deviceType } : {}),
      },
      include: { readings: { take: 10, orderBy: { recordedAt: 'desc' } } },
      orderBy: { name: 'asc' },
    });
  }

  async registerDevice(
    organizationId: string,
    data: {
      name: string;
      deviceType: string;
      fieldLotId?: string;
      farmUnitId?: string;
      vendor?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const count = await this.prisma.eappTelemetryDevice.count({ where: { organizationId } });
    const deviceKey = generateEappKey('TLM', count + 1);
    return this.prisma.eappTelemetryDevice.create({
      data: {
        organizationId,
        deviceKey,
        name: data.name,
        deviceType: data.deviceType,
        fieldLotId: data.fieldLotId,
        farmUnitId: data.farmUnitId,
        vendor: data.vendor ?? 'generic',
        metadata: (data.metadata ?? {}) as object,
      },
    });
  }

  listReadings(organizationId: string, deviceKey?: string, since?: Date) {
    return this.prisma.eappTelemetryReading.findMany({
      where: {
        organizationId,
        ...(deviceKey ? { device: { deviceKey } } : {}),
        ...(since ? { recordedAt: { gte: since } } : {}),
      },
      include: { device: true },
      orderBy: { recordedAt: 'desc' },
      take: 1000,
    });
  }

  async ingestReading(
    organizationId: string,
    userId: string | undefined,
    data: {
      deviceKey: string;
      metric: string;
      value: number;
      unit?: string;
      recordedAt?: Date;
      metadata?: Record<string, unknown>;
    },
  ) {
    const device = await this.prisma.eappTelemetryDevice.findFirst({
      where: { organizationId, deviceKey: data.deviceKey },
    });
    if (!device) throw new NotFoundException('Dispositivo no encontrado');
    const count = await this.prisma.eappTelemetryReading.count({ where: { organizationId } });
    const readingKey = generateEappKey('RDG', count + 1);
    const reading = await this.prisma.eappTelemetryReading.create({
      data: {
        organizationId,
        deviceId: device.id,
        readingKey,
        metric: data.metric,
        value: data.value,
        unit: data.unit,
        recordedAt: data.recordedAt ?? new Date(),
        metadata: (data.metadata ?? {}) as object,
      },
    });
    await this.prisma.eappTelemetryDevice.update({
      where: { id: device.id },
      data: { lastReadingAt: reading.recordedAt },
    });
    await this.audit.log(organizationId, 'EappTelemetryReading', readingKey, 'telemetry_ingested', userId, {
      deviceKey: data.deviceKey,
      metric: data.metric,
    });
    return reading;
  }
}
