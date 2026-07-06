import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EVENT_TYPES, EiesdpDeviceDefinition } from '@agroerp/shared';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { DeviceSecurityService } from './device-security.service';
import { DeviceDigitalTwinService } from './device-digital-twin.service';
import { DeviceAuditService } from './device-audit.service';

@Injectable()
export class DeviceRegistryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly security: DeviceSecurityService,
    private readonly twin: DeviceDigitalTwinService,
    private readonly audit: DeviceAuditService,
  ) {}

  findAll(organizationId: string, filters?: { status?: string; deviceType?: string; groupKey?: string }) {
    return this.prisma.eiesdpDevice.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(filters?.status ? { status: filters.status as 'active' } : {}),
        ...(filters?.deviceType ? { deviceType: filters.deviceType as 'temperature_sensor' } : {}),
        ...(filters?.groupKey ? { group: { groupKey: filters.groupKey } } : {}),
      },
      include: { group: true, twin: true },
      orderBy: { name: 'asc' },
      take: 500,
    });
  }

  async findOne(organizationId: string, deviceKey: string) {
    const device = await this.prisma.eiesdpDevice.findFirst({
      where: { organizationId, deviceKey, deletedAt: null },
      include: { group: true, twin: true, credentials: { where: { isActive: true }, take: 1 } },
    });
    if (!device) throw new NotFoundException('Dispositivo no encontrado');
    return device;
  }

  async register(organizationId: string, userId: string, dto: EiesdpDeviceDefinition) {
    const existing = await this.prisma.eiesdpDevice.findFirst({
      where: { organizationId, deviceKey: dto.deviceKey, deletedAt: null },
    });
    if (existing) throw new BadRequestException(`Dispositivo ${dto.deviceKey} ya existe`);

    let groupId: string | undefined;
    if (dto.groupKey) {
      const group = await this.prisma.eiesdpDeviceGroup.findFirst({
        where: { organizationId, groupKey: dto.groupKey },
      });
      groupId = group?.id;
    }

    const device = await this.prisma.eiesdpDevice.create({
      data: {
        organizationId,
        groupId,
        deviceKey: dto.deviceKey,
        name: dto.name,
        deviceType: dto.deviceType as 'temperature_sensor',
        protocol: (dto.protocol ?? 'mqtt') as 'mqtt',
        serialNumber: dto.serialNumber,
        macAddress: dto.macAddress,
        tags: dto.tags ?? [],
        farmId: dto.farmId,
        lotId: dto.lotId,
        vehicleId: dto.vehicleId,
        collectionCenterId: dto.collectionCenterId,
        assignedUserId: dto.assignedUserId,
        driverKey: dto.driverKey,
        mqttTopic: dto.mqttTopic ?? `agroerp/${organizationId}/${dto.deviceKey}/telemetry`,
        metadata: (dto.metadata ?? {}) as object,
        createdBy: userId,
      },
    });

    await this.twin.updateReported(device.id, {});
    const credentials = await this.security.issueCredentials(device.id);
    await this.audit.log(organizationId, dto.deviceKey, 'register', userId);
    await this.core.emitUserAction(
      organizationId,
      'Device',
      device.id,
      EVENT_TYPES.DEVICE_REGISTERED,
      { deviceKey: dto.deviceKey, deviceType: dto.deviceType },
    );
    return { device, credentials: { token: credentials.token, expiresAt: credentials.expiresAt } };
  }

  async activate(organizationId: string, userId: string, deviceKey: string) {
    const device = await this.findOne(organizationId, deviceKey);
    const updated = await this.prisma.eiesdpDevice.update({
      where: { id: device.id },
      data: { status: 'active', activatedAt: new Date(), lastSeenAt: new Date() },
    });
    await this.audit.log(organizationId, deviceKey, 'activate', userId);
    await this.core.emitUserAction(organizationId, 'Device', device.id, EVENT_TYPES.DEVICE_ACTIVATED, { deviceKey });
    return updated;
  }

  async deactivate(organizationId: string, userId: string, deviceKey: string) {
    const device = await this.findOne(organizationId, deviceKey);
    const updated = await this.prisma.eiesdpDevice.update({
      where: { id: device.id },
      data: { status: 'inactive' },
    });
    await this.audit.log(organizationId, deviceKey, 'deactivate', userId);
    await this.core.emitUserAction(organizationId, 'Device', device.id, EVENT_TYPES.DEVICE_DEACTIVATED, { deviceKey });
    return updated;
  }

  async assign(organizationId: string, userId: string, deviceKey: string, assignment: {
    farmId?: string; lotId?: string; vehicleId?: string;
    collectionCenterId?: string; assignedUserId?: string; groupKey?: string;
  }) {
    const device = await this.findOne(organizationId, deviceKey);
    let groupId = device.groupId;
    if (assignment.groupKey) {
      const group = await this.prisma.eiesdpDeviceGroup.findFirst({
        where: { organizationId, groupKey: assignment.groupKey },
      });
      groupId = group?.id ?? null;
    }
    const updated = await this.prisma.eiesdpDevice.update({
      where: { id: device.id },
      data: {
        farmId: assignment.farmId,
        lotId: assignment.lotId,
        vehicleId: assignment.vehicleId,
        collectionCenterId: assignment.collectionCenterId,
        assignedUserId: assignment.assignedUserId,
        groupId,
      },
    });
    await this.audit.log(organizationId, deviceKey, 'assign', userId, assignment);
    return updated;
  }

  async tag(organizationId: string, deviceKey: string, tags: string[]) {
    const device = await this.findOne(organizationId, deviceKey);
    return this.prisma.eiesdpDevice.update({
      where: { id: device.id },
      data: { tags },
    });
  }

  createGroup(organizationId: string, data: { groupKey: string; name: string; description?: string; tags?: string[] }) {
    return this.prisma.eiesdpDeviceGroup.upsert({
      where: { organizationId_groupKey: { organizationId, groupKey: data.groupKey } },
      update: { name: data.name, description: data.description, tags: data.tags ?? [] },
      create: {
        organizationId,
        groupKey: data.groupKey,
        name: data.name,
        description: data.description,
        tags: data.tags ?? [],
      },
    });
  }

  listGroups(organizationId: string) {
    return this.prisma.eiesdpDeviceGroup.findMany({
      where: { organizationId },
      include: { _count: { select: { devices: true } } },
      orderBy: { name: 'asc' },
    });
  }

  mapDevices(organizationId: string) {
    return this.prisma.eiesdpDevice.findMany({
      where: { organizationId, deletedAt: null, latitude: { not: null }, longitude: { not: null } },
      select: {
        id: true, deviceKey: true, name: true, deviceType: true, status: true,
        latitude: true, longitude: true, batteryLevel: true, signalQuality: true, lastSeenAt: true,
      },
    });
  }
}
