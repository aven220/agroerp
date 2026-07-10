import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_TYPES } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { CoffeeAuditService } from './coffee-audit.service';
import { validateScaleState } from '../domain/weighing.engine';

export interface ScaleDefinition {
  scaleKey: string;
  name: string;
  connectionType:
    | 'usb'
    | 'serial_rs232'
    | 'ethernet'
    | 'tcp_ip'
    | 'bluetooth'
    | 'wifi'
    | 'iot_gateway';
  iotDeviceKey?: string;
  purchaseCenterId?: string;
  driverKey?: string;
  firmwareVersion?: string;
  certified?: boolean;
  certificationExpiresAt?: string;
  minWeightKg?: number;
  maxWeightKg?: number;
  precisionKg?: number;
  host?: string;
  port?: number;
  serialPort?: string;
  baudRate?: number;
  macAddress?: string;
  locationLabel?: string;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class CoffeeScaleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly audit: CoffeeAuditService,
  ) {}

  list(organizationId: string, purchaseCenterId?: string) {
    return this.prisma.cpepScale.findMany({
      where: {
        organizationId,
        ...(purchaseCenterId ? { purchaseCenterId } : {}),
      },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(organizationId: string, scaleKey: string) {
    const scale = await this.prisma.cpepScale.findFirst({
      where: { organizationId, scaleKey },
    });
    if (!scale) throw new NotFoundException(`Balanza ${scaleKey} no encontrada`);
    return scale;
  }

  async upsert(organizationId: string, userId: string, input: ScaleDefinition) {
    const data = {
      name: input.name,
      connectionType: input.connectionType,
      iotDeviceKey: input.iotDeviceKey,
      purchaseCenterId: input.purchaseCenterId,
      driverKey: input.driverKey,
      firmwareVersion: input.firmwareVersion,
      certified: input.certified ?? false,
      certificationExpiresAt: input.certificationExpiresAt
        ? new Date(input.certificationExpiresAt)
        : undefined,
      minWeightKg: input.minWeightKg ?? 0,
      maxWeightKg: input.maxWeightKg ?? 50_000,
      precisionKg: input.precisionKg ?? 0.1,
      host: input.host,
      port: input.port,
      serialPort: input.serialPort,
      baudRate: input.baudRate,
      macAddress: input.macAddress,
      locationLabel: input.locationLabel,
      latitude: input.latitude,
      longitude: input.longitude,
      metadata: (input.metadata ?? {}) as object,
    };

    const scale = await this.prisma.cpepScale.upsert({
      where: {
        organizationId_scaleKey: { organizationId, scaleKey: input.scaleKey },
      },
      create: {
        organizationId,
        scaleKey: input.scaleKey,
        ...data,
        status: input.certified === false ? 'uncertified' : 'available',
      },
      update: {
        ...data,
        ...(input.certified === false
          ? { status: 'uncertified' }
          : input.certified === true
            ? { status: 'available' }
            : {}),
      },
    });

    await this.audit.log(organizationId, 'Scale', input.scaleKey, 'upsert', userId, {
      connectionType: input.connectionType,
      certified: input.certified,
    });
    return scale;
  }

  async diagnose(organizationId: string, scaleKey: string) {
    const scale = await this.findOne(organizationId, scaleKey);
    let iotDevice: {
      status: string;
      lastSeenAt: Date | null;
      firmwareVersion: string | null;
      protocol: string;
      metadata: unknown;
    } | null = null;

    if (scale.iotDeviceKey) {
      iotDevice = await this.prisma.eiesdpDevice.findFirst({
        where: {
          organizationId,
          deviceKey: scale.iotDeviceKey,
          deletedAt: null,
        },
        select: {
          status: true,
          lastSeenAt: true,
          firmwareVersion: true,
          protocol: true,
          metadata: true,
        },
      });
    }

    const issues = validateScaleState({
      status: scale.status,
      certified: scale.certified,
      certificationExpiresAt: scale.certificationExpiresAt,
      lastSeenAt: scale.lastSeenAt ?? iotDevice?.lastSeenAt,
      minWeightKg: scale.minWeightKg,
      maxWeightKg: scale.maxWeightKg,
    });

    const connected =
      !!scale.lastSeenAt && Date.now() - scale.lastSeenAt.getTime() < 120_000;

    return {
      scale,
      iotDevice,
      connected,
      healthy: issues.filter((i) => i.severity === 'error').length === 0,
      issues,
      protocols: {
        connectionType: scale.connectionType,
        driverKey: scale.driverKey,
        iotProtocol: iotDevice?.protocol ?? null,
        host: scale.host,
        port: scale.port,
        serialPort: scale.serialPort,
        baudRate: scale.baudRate,
        macAddress: scale.macAddress,
      },
    };
  }

  async selectAvailable(organizationId: string, purchaseCenterId?: string) {
    const scales = await this.prisma.cpepScale.findMany({
      where: {
        organizationId,
        status: 'available',
        certified: true,
        ...(purchaseCenterId ? { purchaseCenterId } : {}),
      },
      orderBy: [{ lastSeenAt: 'desc' }, { name: 'asc' }],
    });

    for (const scale of scales) {
      const issues = validateScaleState({
        status: scale.status,
        certified: scale.certified,
        certificationExpiresAt: scale.certificationExpiresAt,
        lastSeenAt: scale.lastSeenAt,
      });
      if (issues.every((i) => i.severity !== 'error')) {
        return scale;
      }
    }

    if (scales[0]) return scales[0];

    const iotScale = await this.prisma.eiesdpDevice.findFirst({
      where: {
        organizationId,
        deletedAt: null,
        deviceType: 'electronic_scale',
        status: { in: ['active', 'registered'] },
      },
      orderBy: { lastSeenAt: 'desc' },
    });
    if (!iotScale) throw new BadRequestException('No hay balanzas disponibles');

    return this.upsert(organizationId, 'system', {
      scaleKey: iotScale.deviceKey,
      name: iotScale.name,
      connectionType: this.mapProtocol(iotScale.protocol),
      iotDeviceKey: iotScale.deviceKey,
      firmwareVersion: iotScale.firmwareVersion ?? undefined,
      certified: true,
      purchaseCenterId,
      locationLabel: iotScale.collectionCenterId ?? undefined,
      latitude: iotScale.latitude ?? undefined,
      longitude: iotScale.longitude ?? undefined,
    });
  }

  async markStatus(
    organizationId: string,
    scaleKey: string,
    status: 'available' | 'busy' | 'offline' | 'maintenance' | 'uncertified' | 'error',
    userId?: string,
  ) {
    const scale = await this.findOne(organizationId, scaleKey);
    const updated = await this.prisma.cpepScale.update({
      where: { id: scale.id },
      data: {
        status,
        lastSeenAt: status === 'available' || status === 'busy' ? new Date() : scale.lastSeenAt,
      },
    });
    await this.audit.log(organizationId, 'Scale', scaleKey, `status_${status}`, userId, { status });
    if (status === 'offline' || status === 'error') {
      await this.core.emitUserAction(
        organizationId,
        'CoffeeScale',
        scale.id,
        EVENT_TYPES.COFFEE_SCALE_OFFLINE,
        { scaleKey, status },
      );
    }
    return updated;
  }

  async heartbeat(
    organizationId: string,
    scaleKey: string,
    payload?: { weightKg?: number; stable?: boolean; firmwareVersion?: string },
  ) {
    const scale = await this.findOne(organizationId, scaleKey);
    return this.prisma.cpepScale.update({
      where: { id: scale.id },
      data: {
        lastSeenAt: new Date(),
        lastWeightKg: payload?.weightKg ?? scale.lastWeightKg,
        lastStableAt: payload?.stable ? new Date() : scale.lastStableAt,
        firmwareVersion: payload?.firmwareVersion ?? scale.firmwareVersion,
        status: scale.status === 'offline' || scale.status === 'error' ? 'available' : scale.status,
      },
    });
  }

  async syncFromIot(organizationId: string, userId: string) {
    const devices = await this.prisma.eiesdpDevice.findMany({
      where: {
        organizationId,
        deletedAt: null,
        deviceType: 'electronic_scale',
      },
    });
    const results = [];
    for (const device of devices) {
      results.push(
        await this.upsert(organizationId, userId, {
          scaleKey: device.deviceKey,
          name: device.name,
          connectionType: this.mapProtocol(device.protocol),
          iotDeviceKey: device.deviceKey,
          firmwareVersion: device.firmwareVersion ?? undefined,
          certified: device.status === 'active' || device.status === 'registered',
          driverKey: device.driverKey ?? undefined,
          macAddress: device.macAddress ?? undefined,
          locationLabel: device.collectionCenterId ?? undefined,
          latitude: device.latitude ?? undefined,
          longitude: device.longitude ?? undefined,
          metadata: {
            iotStatus: device.status,
            tags: device.tags,
          },
        }),
      );
      await this.prisma.cpepScale.updateMany({
        where: { organizationId, scaleKey: device.deviceKey },
        data: {
          lastSeenAt: device.lastSeenAt,
          status:
            device.status === 'offline'
              ? 'offline'
              : device.status === 'maintenance'
                ? 'maintenance'
                : 'available',
        },
      });
    }
    return results;
  }

  private mapProtocol(
    protocol: string,
  ): ScaleDefinition['connectionType'] {
    switch (protocol) {
      case 'usb':
        return 'usb';
      case 'serial':
        return 'serial_rs232';
      case 'tcp':
        return 'tcp_ip';
      case 'bluetooth':
        return 'bluetooth';
      case 'http':
      case 'https':
      case 'websocket':
      case 'mqtt':
        return 'wifi';
      case 'modbus':
      case 'opcua':
        return 'ethernet';
      default:
        return 'iot_gateway';
    }
  }
}
